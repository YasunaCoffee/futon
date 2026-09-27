import { getCollection } from "astro:content";
import { readFutonJson } from "./futon";
// サイトの設定(futon/site.json)。名前・ロゴ・運営者・フィードの宛先・キャラクター・本・動画など
const site: any = readFutonJson("site.json");
import { series } from "./series";

// 公開ルール:hidden でなく、公開日がビルドした日(日本時間)以前のものだけ出す。
// 確認用に全部見たいときは SHOW_ALL=1 で起動する。
const SHOW_ALL = import.meta.env.SHOW_ALL === "1" || process.env.SHOW_ALL === "1";
const todayJST = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
export const today = todayJST();
const visible = (d: { hidden?: boolean; date: Date }) =>
  SHOW_ALL || (!d.hidden && d.date.toISOString().slice(0, 10) <= today);

export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const md = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
export const dotted = (d: Date) => ymd(d).replaceAll("-", ".");
export const url = (p: string) => import.meta.env.BASE_URL.replace(/\/$/, "") + "/" + p.replace(/^\//, "");

const byNewest = (a: any, b: any) => b.data.date - a.data.date || b.data.num - a.data.num;

// まんがのシリーズ(src/lib/series.ts)の公開済みの回を新しい順に
export async function episodes(key: string): Promise<any[]> {
  return (await getCollection(key as any)).filter((e: any) => visible(e.data)).sort(byNewest);
}

export async function techPosts() {
  return (await getCollection("tech")).filter((e) => !e.data.draft && (SHOW_ALL || ymd(e.data.date) <= today))
    .sort((a, b) => +b.data.date - +a.data.date || a.id.localeCompare(b.id)); // 同じ日付なら記事名順(毎回同じ並びにする)
}
export const techThumb = (id: string) => url(`img/tech/thumbs/${id}.png`);

// kind: まんが(series.ts のシリーズ)・動画・技術記事。series はシリーズの key か "video" / "tech"
export type Item = { kind: "manga" | "video" | "tech"; series: string; label: string; title: string; date: Date; href: string;
  thumb?: string; note?: string; newsNote?: string };

// 新着:まんが(一覧表の順)・動画・技術記事をまぜて新しい順
export async function newest(): Promise<Item[]> {
  const m: Item[] = [];
  for (const s of series)
    for (const e of await episodes(s.key))
      m.push({ kind: "manga", series: s.key, label: s.short, title: e.data.title, date: e.data.date,
        href: url(`${s.key}/${e.data.num}/`), thumb: url(s.card(e.data).thumb), note: s.itemNote(e.data), newsNote: s.newsNote?.(e.data) });
  // 動画は YouTube の動画ID(youtube)で持つ。ショート動画をYouTubeに上げたら site.json の videos に足す
  const v = ((site.videos ?? []) as { title: string; youtube: string; date: string; series?: string }[])
    .filter((x) => SHOW_ALL || x.date <= today).map((x) => ({ kind: "video" as const, series: "video", label: "どうが", title: x.title,
      date: new Date(x.date), href: url("/#video"), thumb: `https://i.ytimg.com/vi/${x.youtube}/hqdefault.jpg`, note: "ショートどうが" }));
  const t = (await techPosts()).map((e) => ({ kind: "tech" as const, series: "tech", label: site.tech?.tab ?? "記事", title: e.data.title, date: e.data.date,
    href: url(`tech/${e.id}/`), thumb: techThumb(e.id), note: e.data.category }));
  return [...m, ...v, ...t].sort((a, b) => +b.date - +a.date);
}
// キャラクターと本。books[].characters にキャラの slug を並べると、本とキャラを行き来できる(テーマから使う)
export const characters: any[] = site.characters ?? [];
export const castOf = (slugs: string[] = []): any[] => slugs.map((k) => characters.find((c) => c.slug === k)).filter(Boolean);
export const books: any[] = (site.books ?? []).map((b: any, i: number) => ({ ...b, id: `book-${b.slug ?? i + 1}`, cast: castOf(b.characters) }));
export const booksOf = (slug?: string): any[] => (slug ? books.filter((b) => b.characters?.includes(slug)) : []);
export const isNew = (d: Date) => (Date.parse(today) - +d) / 86400e3 <= 2;
export { site };
