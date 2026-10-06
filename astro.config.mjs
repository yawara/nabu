// @ts-check
import { defineConfig } from 'astro/config';

// 公開先に合わせて環境変数で上書きできる。既定値は GitHub Pages（https://yawara.github.io/nabu/）。
const site = process.env.SITE_URL ?? 'https://yawara.github.io';
const base = process.env.BASE_PATH ?? '/nabu';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
});
