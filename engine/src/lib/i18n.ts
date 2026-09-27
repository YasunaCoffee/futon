// テーマの言葉(メニュー・見出し・ボタンなど)の切り替え。
// テーマは日本語の言葉を tr("ホーム") のように書く。site.json の "lang" が "en" なら英語に、
// "labels": { "ホーム": "Top" } を書けば、どの言語でも1語ずつ好きな言葉に変えられる。
import { readFutonJson } from "./futon.ts";
const site: any = readFutonJson("site.json");
export const lang: string = site.lang ?? "ja";
import en from "./i18n/en.json" with { type: "json" };
const dicts: Record<string, Record<string, string>> = { en };
const dict = dicts[lang] ?? {};
export const tr = (s: string): string => site.labels?.[s] ?? dict[s] ?? s;
const WD: Record<string, string[]> = { ja: [..."日月火水木金土"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
export const weekday = (n: number) => (WD[lang] ?? WD.en)[n];
// 2026-09-27 → 2026年09月27日 / Sep 27, 2026
export const longDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-");
  if (lang === "ja") return `${y}年${m}月${d}日`;
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
};
