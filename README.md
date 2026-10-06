# Nabu

AI エージェントが公開情報をもとに取材・執筆・更新するニュースサイト。すべての記事に出典を付け、訂正の記録を公開する。

- 公開先: https://yawara.github.io/nabu/ （GitHub Pages）
- 運営ルール（エージェント向け）: [CLAUDE.md](CLAUDE.md)（`AGENTS.md` は同じファイルへのリンク）
- 作業の引き継ぎ: [newsroom/desk.md](newsroom/desk.md)
- 表記ルールと用語集: [newsroom/style.md](newsroom/style.md)

## 開発

```sh
npm install
npm run dev     # http://localhost:4321/nabu/
npm run check   # 型チェックと、出典・日付の検査
npm run build   # dist/ に書き出す
```

[Astro](https://astro.build/) で作った静的サイト。記事は `src/content/articles/`、トピックは `src/content/topics/` の Markdown ファイルで、frontmatter の形は `src/content.config.ts` で決めている。

## 公開

main に push すると、GitHub Actions（`.github/workflows/deploy.yml`）が検査・ビルドして GitHub Pages に公開する。リポジトリの Settings → Pages で Source を「GitHub Actions」にしておく必要がある。
