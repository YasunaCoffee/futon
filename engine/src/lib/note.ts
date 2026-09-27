// 外のよみもの(note・Zenn)をビルドのときにフィードから取る。取れなくてもサイトのビルドは止めない
export type FeedItem = { title: string; link: string; date: Date; thumb?: string };

import { site } from "./content";
// 宛先は futon/site.json の feeds。書いていなければ欄ごと出ない
const NOTE = site.feeds?.note?.rss;

const pick = (s: string, tag: string) => s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim();
const unescape = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function cached(name: string, load: () => Promise<FeedItem[]>) {
  let p: Promise<FeedItem[]> | null = null;
  return (limit = 5) => {
    p ??= load().catch((e) => { console.warn(`[${name}] フィードを取れませんでした。欄は空で出します:`, e.message); return []; });
    return p.then((a) => a.slice(0, limit));
  };
}
const get = async (u: string) => {
  const res = await fetch(u, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${u} ${res.status}`);
  return res;
};

// note:RSS
export const noteItems = cached("note", async () => {
  if (!NOTE) return [];
  const xml = await (await get(NOTE)).text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => ({
    title: unescape(pick(it, "title") ?? ""), link: pick(it, "link") ?? "",
    date: new Date(pick(it, "pubDate") ?? 0), thumb: pick(it, "media:thumbnail"),
  })).filter((i) => i.title && i.link);
});

// Zenn:RSS(サムネは enclosure の url)
export const zennItems = cached("zenn", async () => {
  if (!site.feeds?.zenn?.rss) return [];
  const xml = await (await get(site.feeds.zenn.rss)).text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => ({
    title: unescape(pick(it, "title") ?? ""), link: pick(it, "link") ?? "",
    date: new Date(pick(it, "pubDate") ?? 0), thumb: it.match(/<enclosure url="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&"),
  })).filter((i) => i.title && i.link);
});
