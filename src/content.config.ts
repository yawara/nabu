import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * 公開資料の出典。人間による直接取材は reporting に記録する。
 * 書き方の詳細は CLAUDE.md の「出典のルール」を参照。
 */
const source = z.object({
  /** 資料・記事のタイトル（原題のまま） */
  title: z.string().min(1),
  /** 媒体名・発信者（例: 琉球新報、沖縄県選挙管理委員会、岸政彦（X）） */
  publisher: z.string().min(1),
  url: z.url(),
  /** 資料側の公開日。分からなければ省略する */
  date: z.coerce.date().optional(),
  /** 編集部が内容を確認した日 */
  accessed: z.coerce.date(),
  /** primary: 公的機関・当事者本人の発表などの一次資料 / news: 報道 / social: SNS 投稿 / other: その他 */
  kind: z.enum(['primary', 'news', 'social', 'other']).default('news'),
  /** Wayback Machine などの保存先（あれば） */
  archive: z.url().optional(),
});

/** 人間が公開の場で直接見聞きした取材。原メモは非公開で保管し、公開する由来と確認範囲を書く。 */
const reporting = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '英小文字・数字とハイフンで書く'),
  /** 記録者が了承した公開表示名 */
  reporter: z.string().trim().min(1),
  /** 取材者の公開プロフィール。取材内容の出典 URL とは区別する */
  reporterUrl: z.url().regex(/^https?:\/\//, '公開プロフィールは http / https の URL で書く').optional(),
  date: z.coerce.date(),
  location: z.string().trim().min(1),
  method: z.string().trim().min(1),
  /** この取材で直接確認した範囲。発言は、その内容の真偽とは区別する */
  scope: z.string().trim().min(1),
});

const sourceReference = z.union([
  z.url(),
  z.string().regex(/^#reporting-[a-z0-9]+(?:-[a-z0-9]+)*$/),
]);

/**
 * 記事・トピックの冒頭に出す注意書き。文面は src/components/Notices.astro にある。
 * litigation: 係争中の訴訟 / allegation: 告発・疑惑の紹介 / suicide: 自殺や心身の不調への言及 / developing: 進行中
 */
const notice = z.enum(['litigation', 'allegation', 'suicide', 'developing']);

/** 年表用の日付。YAML の日付型と文字列の両方を受け、"YYYY" / "YYYY-MM" / "YYYY-MM-DD" にそろえる */
const partialDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'YYYY / YYYY-MM / YYYY-MM-DD のいずれかで書く'),
);

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().min(1),
    /** リード。記事の要点を 1〜3 文で。一覧と OGP の説明文にも使う */
    lead: z.string().min(1),
    /** 公開日時（日本時間で +09:00 を付けて書く） */
    published: z.coerce.date(),
    /** 内容を更新した日時。訂正のときは corrections にも書く */
    updated: z.coerce.date().optional(),
    topics: z.array(reference('topics')).min(1),
    /** news: ニュース / explainer: 解説 / timeline: 経緯 / analysis: 分析 */
    kind: z.enum(['news', 'explainer', 'timeline', 'analysis']).default('news'),
    notices: z.array(notice).default([]),
    sources: z.array(source).default([]),
    reporting: z.array(reporting).default([]),
    corrections: z
      .array(z.object({ date: z.coerce.date(), text: z.string().min(1) }))
      .default([]),
    byline: z.string().default('Nabu 編集部（AI エージェント）'),
    draft: z.boolean().default(false),
  }).refine((data) => data.sources.length + data.reporting.length > 0, {
    message: 'sources または reporting を合計 1 件以上記載する',
    path: ['sources'],
  }),
});

const topics = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/topics' }),
  schema: z.object({
    title: z.string().min(1),
    /** 記事の見出し上などに出す短いラベル */
    label: z.string().min(1),
    summary: z.string().min(1),
    /** active: 進行中 / watching: 注視 / closed: 終了 */
    status: z.enum(['active', 'watching', 'closed']),
    started: z.coerce.date(),
    updated: z.coerce.date(),
    /** トップページでの並び順（小さいほど上） */
    order: z.number().default(100),
    notices: z.array(notice).default([]),
    people: z.array(z.object({ name: z.string(), role: z.string() })).default([]),
    /** 年表。公開 URL は sources に、#reporting-<id> は reporting に対応させる */
    timeline: z
      .array(z.object({ date: partialDate, text: z.string().min(1), sources: z.array(sourceReference).min(1) }))
      .default([]),
    /** 今後の注目点 */
    watch: z.array(z.object({ date: partialDate.optional(), text: z.string().min(1) })).default([]),
    sources: z.array(source).default([]),
    reporting: z.array(reporting).default([]),
  }),
});

export const collections = { articles, topics };
