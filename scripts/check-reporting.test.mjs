import assert from 'node:assert/strict';
import test from 'node:test';
import { checkReporting } from './check-reporting.mjs';

const record = {
  id: 'public-hearing', reporter: '取材担当者', date: '2026-10-07',
  location: '会場', method: '公開の場の傍聴', scope: '会場で直接見聞きした進行と発言の要旨',
};
const page = { published: '2026-10-07T23:00:00+09:00', reporting: [record] };
const check = (data = page, body = '') => checkReporting(data, body, '2026-10-08');

test('既存の公開資料だけの記事と、直接取材だけの記事を受け付ける', () => {
  assert.deepEqual(check({ sources: [{ url: 'https://example.com/' }] }), []);
  assert.deepEqual(check(), []);
});

test('本文と年表の取材参照を照合する', () => {
  const data = { ...page, timeline: [{ sources: ['#reporting-public-hearing', 'https://example.com/'] }] };
  assert.deepEqual(check(data, '[傍聴](#reporting-public-hearing)'), []);
  assert.match(check(data, '[傍聴](#reporting-missing)')[0], /本文.*reporting/);
  assert.match(check({ ...page, timeline: [{ sources: ['#reporting-missing'] }] })[0], /年表.*reporting/);
});

test('参照形式・HTML 形式のリンクを点検し、他ページのアンカーは対象にしない', () => {
  assert.equal(check(page, '[傍聴][r]\n\n[r]: <#reporting-missing> "取材"').length, 1);
  assert.equal(check(page, '<a href="#reporting-missing">傍聴</a>').length, 1);
  assert.deepEqual(check(page, '[他の記事](https://example.com/#reporting-missing)'), []);
});

test('括弧で囲まれたタイトルがある Markdown リンクの参照切れを検出する', () => {
  assert.match(check(page, '[傍聴](#reporting-missing (取材))')[0], /本文.*#reporting-missing/);
  assert.deepEqual(check(page, '[傍聴](#reporting-public-hearing (取材))'), []);
});

test('HTML の href 属性の大小文字・等号前後の空白にかかわらず参照を照合する', () => {
  for (const attribute of ['href = ', 'HREF=', 'hReF\t=\n']) {
    assert.match(check(page, `<a ${attribute}"#reporting-missing">傍聴</a>`)[0], /本文.*#reporting-missing/);
    assert.deepEqual(check(page, `<a ${attribute}"#reporting-public-hearing">傍聴</a>`), []);
  }
});

test('重複した id とアンカーに使えない id を拒否する', () => {
  assert.match(check({ ...page, reporting: [record, record] })[0], /重複/);
  assert.match(check({ ...page, reporting: [{ ...record, id: 'Bad ID' }] })[0], /英小文字/);
});

test('公開プロフィールは省略可能で、http / https の URL だけを受け付ける', () => {
  assert.deepEqual(check(), []);
  for (const reporterUrl of ['https://github.com/yawara', 'http://example.com/profile']) {
    assert.deepEqual(check({ ...page, reporting: [{ ...record, reporterUrl }] }), []);
  }
  for (const reporterUrl of ['', '/profile', '//example.com/profile', 'mailto:a@example.com', 'javascript:alert(1)', 'https://', null, 42]) {
    assert.match(check({ ...page, reporting: [{ ...record, reporterUrl }] })[0], /公開プロフィール.*http \/ https/);
  }
});

test('実在しない日付・日付以外の値・未来の取材日を拒否する', () => {
  for (const date of ['2026-02-31', '2026-13-01', '2026-10', 'invalid', null]) {
    assert.match(check({ ...page, reporting: [{ ...record, date }] })[0], /実在する日付/);
  }
  assert.ok(check({ ...page, reporting: [{ ...record, date: '2026-10-09' }] }).some((m) => /未来/.test(m)));
});

test('公開後の追加取材は updated を基準にし、日本時間の暦日で比べる', () => {
  const reporting = [{ ...record, date: '2026-10-08' }];
  assert.match(check({ ...page, reporting })[0], /最終更新日/);
  assert.deepEqual(check({ ...page, reporting, updated: '2026-10-08T00:01:00+09:00' }), []);
  assert.deepEqual(check({ ...page, published: new Date('2026-10-06T15:01:00Z') }), []);
});
