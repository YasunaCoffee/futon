import rss from "@astrojs/rss";
import { newest, site } from "../lib/content";
import { series } from "../lib/series";
export async function GET(context) {
  const items = (await newest()).filter((i) => i.kind !== "video").slice(0, 30);
  return rss({
    title: site.title,
    description: [...series.map((s) => s.name), "AIとの技術記事"].join("・") + "の新着",
    site: context.site ?? "https://example.invalid",
    items: items.map((i) => ({ title: `【${i.label}】${i.title}`, pubDate: i.date, link: i.href, description: i.note })),
  });
}
