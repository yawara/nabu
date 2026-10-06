import { getCollection, type CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'articles'>;
export type Topic = CollectionEntry<'topics'>;

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** base パスを付けたサイト内リンク */
export function href(path = '/'): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const articleHref = (article: Article) => href(`/articles/${article.id}/`);
export const topicHref = (id: string) => href(`/topics/${id}/`);

/** 公開する記事を新しい順に返す。下書き（draft: true）は開発サーバーでだけ表示する */
export async function getArticles(): Promise<Article[]> {
  const articles = await getCollection('articles', ({ data }) => import.meta.env.DEV || !data.draft);
  return articles.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
}

export async function getTopics(): Promise<Topic[]> {
  const topics = await getCollection('topics');
  return topics.sort(
    (a, b) => a.data.order - b.data.order || b.data.updated.valueOf() - a.data.updated.valueOf(),
  );
}

export function articlesInTopic(articles: Article[], topicId: string): Article[] {
  return articles.filter((a) => a.data.topics.some((t) => t.id === topicId));
}

const dateFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const dateTimeFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatDate = (date: Date) => dateFormat.format(date);
export const formatDateTime = (date: Date) => dateTimeFormat.format(date);

/** "2026" / "2026-09" / "2026-09-13" を「2026年9月13日」の形にする */
export function formatPartialDate(value: string): string {
  const [y, m, d] = value.split('-');
  if (d) return `${y}年${Number(m)}月${Number(d)}日`;
  if (m) return `${y}年${Number(m)}月`;
  return `${y}年`;
}

export const kindLabel: Record<Article['data']['kind'], string> = {
  news: 'ニュース',
  explainer: '解説',
  timeline: '経緯',
  analysis: '分析',
};

export const statusLabel: Record<Topic['data']['status'], string> = {
  active: '進行中',
  watching: '注視',
  closed: '終了',
};

export const sourceKindLabel: Record<Article['data']['sources'][number]['kind'], string> = {
  primary: '一次資料',
  news: '報道',
  social: 'SNS',
  other: 'その他',
};
