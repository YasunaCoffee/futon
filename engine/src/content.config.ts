import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { series, formats } from "./lib/series";
import { futonPath } from "./lib/futon";

const common = {
  num: z.number(),
  title: z.string(),
  date: z.coerce.date(), // 公開日。未来の日付の回はその日のビルドまで出ない
  hidden: z.boolean().optional(), // true なら出さない(理由は hiddenReason に書く)
  hiddenReason: z.string().optional(),
  x: z.string().url().optional(), // その話をXに出したポストのURL。あれば話のページに埋め込む
  cast: z.array(z.string()).optional(), // この話に出てくるキャラの slug(site.json の characters)。なければ棚の cast
};

// まんがのシリーズは src/lib/series.ts の一覧表から作る(形ごとの項目は formats)
const manga = Object.fromEntries(series.map((s) => [s.key, defineCollection({
  loader: glob({ pattern: "*.md", base: futonPath(s.key) }),
  schema: z.object({ ...common, ...formats[s.format] }),
})]));

// 技術記事(ふとんの tech/*.md。futon sync --tech <Lume のブログ> で取り込める)
const tech = defineCollection({
  loader: glob({ pattern: "*.md", base: futonPath("tech") }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    emoji: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.coerce.string()).optional(),
    draft: z.boolean().optional(),
  }),
});

// ガイドラインなど、ページに埋め込む文章(futon/guidelines/*.md)
const guidelines = defineCollection({ loader: glob({ pattern: "*.md", base: futonPath("guidelines") }) });

export const collections = { ...manga, tech, guidelines };
