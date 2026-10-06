#!/usr/bin/env node
// 記事とトピックの「出典の書き漏れ」や日付の誤りを見つける。スキーマ（src/content.config.ts）では
// 検査できない、ファイルをまたぐ決まりごとを確かめる。`npm run check` から呼ばれる。
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { load as loadYaml } from 'js-yaml';

const root = new URL('..', import.meta.url).pathname;
const contentDir = join(root, 'src/content');

/** 出典にしてはいけないサイト（CLAUDE.md「出典のルール」） */
const BANNED_SOURCE_HOSTS = ['wikipedia.org', 'posfie.com', 'togetter.com', 'matome.naver.jp'];

const errors = [];
const warnings = [];
const fail = (file, message) => errors.push(`${relative(root, file)}: ${message}`);
const warn = (file, message) => warnings.push(`${relative(root, file)}: ${message}`);

function listMarkdown(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdown(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

function parse(file) {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    fail(file, 'frontmatter（--- で囲んだ部分）がない');
    return null;
  }
  return { data: loadYaml(match[1]) ?? {}, body: match[2] };
}

const toDate = (value) => (value instanceof Date ? value : new Date(String(value)));
const dayOf = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value));

// 日本時間の「明日」より後の日付は未来とみなす（時差による誤検出を避けるため 1 日の余裕を持たせる）
const now = new Date();
const tomorrowJst = new Date(now.getTime() + 9 * 3600e3 + 24 * 3600e3).toISOString().slice(0, 10);
const isFuture = (value) => dayOf(value).slice(0, 10) > tomorrowJst;

/** 本文中の外部 URL（Markdown リンク・自動リンク・裸の URL） */
function urlsInBody(body) {
  return [...body.matchAll(/https?:\/\/[^\s)<>"'\]]+/g)].map((m) => m[0].replace(/[.,、。]+$/, ''));
}

function checkSources(file, sources) {
  for (const source of sources ?? []) {
    const host = (() => {
      try {
        return new URL(source.url).hostname;
      } catch {
        return '';
      }
    })();
    if (BANNED_SOURCE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      fail(file, `出典にできないサイトが使われている: ${source.url}`);
    }
    if (source.accessed && isFuture(source.accessed)) fail(file, `閲覧日が未来になっている: ${source.url}`);
    if (source.date && isFuture(source.date)) fail(file, `出典の公開日が未来になっている: ${source.url}`);
  }
}

const topicIds = new Set();

for (const file of listMarkdown(join(contentDir, 'topics'))) {
  const parsed = parse(file);
  if (!parsed) continue;
  const { data } = parsed;
  topicIds.add(basename(file, '.md'));
  checkSources(file, data.sources);
  const listed = new Set((data.sources ?? []).map((s) => s.url));
  for (const item of data.timeline ?? []) {
    if (isFuture(item.date)) fail(file, `年表に未来の日付がある（予定は watch に書く）: ${dayOf(item.date)}`);
    for (const url of item.sources ?? []) {
      if (!listed.has(url)) fail(file, `年表の出典が sources に載っていない: ${url}`);
    }
  }
  if (data.updated && isFuture(data.updated)) fail(file, 'updated が未来になっている');
}

for (const file of listMarkdown(join(contentDir, 'articles'))) {
  const parsed = parse(file);
  if (!parsed) continue;
  const { data, body } = parsed;
  const name = basename(file, '.md');
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    fail(file, 'ファイル名は YYYY-MM-DD-英小文字とハイフン.md にする');
  } else if (data.published) {
    const publishedJst = new Date(toDate(data.published).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
    if (!name.startsWith(publishedJst)) warn(file, `ファイル名の日付と published（${publishedJst}）が違う`);
  }
  if (data.published && isFuture(data.published)) fail(file, 'published が未来になっている');
  if (data.updated && data.published && toDate(data.updated) < toDate(data.published)) {
    fail(file, 'updated が published より前になっている');
  }
  for (const topic of data.topics ?? []) {
    if (!topicIds.has(topic)) fail(file, `存在しないトピック: ${topic}`);
  }
  checkSources(file, data.sources);
  const listed = new Set((data.sources ?? []).map((s) => s.url));
  for (const url of new Set(urlsInBody(body))) {
    if (!listed.has(url)) fail(file, `本文のリンクが sources に載っていない: ${url}`);
  }
  if ((data.corrections ?? []).length > 0 && !data.updated) {
    warn(file, '訂正があるのに updated がない');
  }
}

for (const message of warnings) console.warn(`warning  ${message}`);
for (const message of errors) console.error(`error    ${message}`);
if (errors.length > 0) {
  console.error(`\n${errors.length} 件の問題があります。`);
  process.exit(1);
}
console.log(`content check: OK（警告 ${warnings.length} 件）`);
