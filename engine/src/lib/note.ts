// 外のよみもの(note・Zenn・/dev/null)をビルドのときにフィードから取る。取れなくてもサイトのビルドは止めない
export type FeedItem = { title: string; link: string; date: Date; thumb?: string; hash?: string };

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

// /dev/null:開発者のSNS(dev-null.sh)。投稿は commit。公開の読み取り API から新しい順に取る
export const devnullItems = cached("devnull", async () => {
  const user = site.feeds?.devnull?.user;
  if (!user) return [];
  const base = (site.feeds.devnull.url ?? "https://dev-null.sh").replace(/\/$/, "");
  const json = await (await get(`${base}/api/v1/users/${encodeURIComponent(user)}/commits`)).json();
  return (json.data ?? []).map((c: any) => ({
    title: c.body ?? "", link: c.html_url ?? "", date: new Date(c.created_at ?? 0), hash: c.short_hash,
  })).filter((i: FeedItem) => i.title && i.link);
});
