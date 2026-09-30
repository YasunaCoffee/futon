// まんがの棚(シリーズ)。中身は futon/shelves.yaml に書き、ここはそれを読んで組み立てるだけ。
// 棚を足すときは shelves.yaml に1件足して futon/<key>/ に話の md を置く。
// 形(format)が今までにないものなら、下の formats に1つ足す。
import fs from "node:fs";
import yaml from "js-yaml";
import { z } from "astro/zod";
import { futonPath } from "./futon.ts"; // node(スクリプト)からも読むので拡張子まで書く

// 形ごとの、話の md に要る項目
export const formats = {
  // 画像を何枚か並べて読む
  sheets: {
    kessho: z.string(),
    source: z.string(),
    kanji: z.string(),
    type: z.enum(["A", "B", "C"]),
    images: z.object({ right: z.string(), left: z.string(), card: z.string(), thumb: z.string().optional() }),
  },
  // 1枚で読む
  single: {
    cite: z.string(),
    lett: z.string(),
    kind: z.string().optional(),
    image: z.string(),
    thumb: z.string(),
  },
};

// {項目} / {項目.中} / {項目|変換} を話の中身で置き換える
const filters: Record<string, (v: any) => string> = {
  md: (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
  oneline: (s: string) => String(s).replaceAll("／", " "),
  hero: (s: string) => String(s).replace(".webp", "_hero.webp"),
};
const fill = (tpl: string | undefined, d: any): string =>
  (tpl ?? "").replace(/\{([\w.]+)(?:\|(\w+))?\}/g, (_, key: string, f?: string) => {
    const v = key.split(".").reduce((o, k) => o?.[k], d);
    if (v === undefined || v === null) return "";
    return f ? filters[f](v) : String(v);
  });

type Img = { src: string; alt: string };
export type Series = {
  key: string; // URL と futon/<key>/ の名前
  name: string;
  short: string;
  format: keyof typeof formats;
  lead: string;
  indexHeading?: string;
  card: (d: any) => { thumb: string; sub: string };
  page: (d: any) => {
    title: string; description: string; crumb: string; heading: string; kind?: string; meta: string;
    images: Img[]; kessho?: { lines: string[]; source: string }; share: string;
    cast: string[]; // 出てくるキャラの slug(話の md の cast、なければ棚の cast)
    og: string;
    swipe: false | "ltr" | "rtl"; // 画像を横スワイプで1枚ずつ読む(page.swipe。rtl なら漫画の向きで右から左へ)
  };
  topic: (d: any) => { img: string; label: string };
  newsNote?: (d: any) => string;
  itemNote: (d: any) => string;
  banner?: { cls: string; img: string; imgStyle?: string; sub: (n: number) => string };
  hero?: (d: any) => { img: string; alt: string; cap: string };
};

function compile(y: any): Series {
  if (!formats[y.format as keyof typeof formats]) throw new Error(`shelves.yaml の ${y.key}: format「${y.format}」はありません(${Object.keys(formats).join(" / ")})`);
  const p = y.page;
  return {
    key: y.key, name: y.name, short: y.short, format: y.format, lead: y.lead, indexHeading: y.indexHeading,
    card: (d) => ({ thumb: fill(y.card.thumb, d), sub: fill(y.card.sub, d) }),
    page: (d) => ({
      title: fill(p.title, d), description: fill(p.description, d), crumb: fill(p.crumb, d), heading: fill(p.heading, d),
      kind: fill(p.kind, d) || undefined, meta: fill(p.meta, d),
      images: p.images.map((i: any) => ({ src: fill(i.src, d), alt: fill(i.alt, d) })),
      kessho: p.verse && { lines: fill(p.verse.text, d).split("／"), source: fill(p.verse.source, d) },
      share: fill(p.share, d),
      cast: d.cast ?? y.cast ?? [],
      swipe: p.swipe && p.images.length > 1 ? (p.swipe === "rtl" ? "rtl" : "ltr") : false,
      og: fill(p.og ?? y.hero?.img ?? p.images[0].src, d), // OGP の画像(page.og。無ければ hero、それも無ければ1枚目)
    }),
    topic: (d) => ({ img: fill(y.topic.img, d), label: fill(y.topic.label, d) }),
    newsNote: y.newsNote ? (d) => fill(y.newsNote, d) : undefined,
    itemNote: (d) => fill(y.itemNote, d),
    banner: y.banner ? { cls: y.banner.cls, img: y.banner.img, imgStyle: y.banner.imgStyle, sub: (n) => fill(y.banner.sub, { count: n }) } : undefined,
    hero: y.hero ? (d) => ({ img: fill(y.hero.img, d), alt: fill(y.hero.alt, d), cap: fill(y.hero.cap, d) }) : undefined,
  };
}

const file = futonPath("shelves.yaml");
const raw: any[] = fs.existsSync(file) ? ((yaml.load(fs.readFileSync(file, "utf8")) as any[]) ?? []) : [];
// 「- group: <key>」の行はグループ(いくつかの棚をまとめる入れもの)。それ以外は棚
export type Group = { key: string; name: string; short: string; lead: string; shelves: Series[] };
export const series: Series[] = raw.filter((y) => !(y.group && !y.key)).map((y) => ({ ...compile(y), group: y.group }));
export const seriesByKey = Object.fromEntries(series.map((s) => [s.key, s]));
export const groups: Group[] = raw.filter((y) => y.group && !y.key).map((y) => ({
  key: y.group, name: y.name ?? y.group, short: y.short ?? y.name ?? y.group, lead: y.lead ?? "",
  shelves: series.filter((s: any) => s.group === y.group),
})).filter((g) => g.shelves.length);
for (const g of groups) if (seriesByKey[g.key]) throw new Error(`shelves.yaml:グループ「${g.key}」と同じ名前の棚があります`);
export const groupOf = (s: Series): Group | undefined => groups.find((g) => g.shelves.includes(s));
// メニューのタブ:グループに入った棚はグループのタブ1つにまとめる(最初の棚の位置に出す)
export const tabOf = (s: Series) => groupOf(s)?.key ?? s.key;
export const shelfNav = (url: (p: string) => string, label: "short" | "name" = "short"): [string, string, string][] => {
  const seen = new Set<string>(); const out: [string, string, string][] = [];
  for (const s of series) {
    const g = groupOf(s);
    if (g) { if (!seen.has(g.key)) { seen.add(g.key); out.push([g.key, g[label], url(`${g.key}/`)]); } }
    else out.push([s.key, s[label], url(`${s.key}/`)]);
  }
  return out;
};
