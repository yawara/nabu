import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_NAME } from '../consts';
import { articleHref, getArticles, href } from '../lib/site';

export async function GET(context: APIContext) {
  const articles = await getArticles();
  return rss({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    site: new URL(href('/'), context.site),
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.lead,
      pubDate: article.data.published,
      link: articleHref(article),
    })),
    customData: '<language>ja</language>',
  });
}
