// ほかの場所で更新されたものを、サイトにまとめて反映する。何度流しても同じ結果になる。
//
//   futon sync --<取り込み口> <値> … [--dry]      (取り込み口の一覧は、何も渡さずに futon sync で出る)
//
// 元データごとの読み方(取り込み口)は1ファイルずつ。エンジンにあるもの(lib/sources/)と、
// 中身のフォルダの sources/*.mjs に置いたもの(そのサイト専用の取り込み口)を両方使う。
// ここは共通の部分:サイトの md を読む・足す・直す・画像を取れなかった回を積む・結果を出す。
// --dry をつけると、書き換えずに何をするかだけ出す。
import fs from "node:fs/promises";
import path from "node:path";
import { addEpisode, ROOT, FUTON } from "./lib.mjs";
import * as tech from "./sources/tech.mjs";

// 取り込み口:エンジンのもの + 中身のフォルダの sources/*.mjs
const own = await fs.readdir(path.join(FUTON, "sources")).catch(() => []);
const sources = [
  ...(await Promise.all(own.filter((f) => f.endsWith(".mjs")).sort().map((f) => import(path.join(FUTON, "sources", f))))),
  tech,
];

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i].replace(/^--/, "");
  if (k === "dry") args.dry = true;
  else args[k] = process.argv[++i];
}
const DRY = !!args.dry;
const report = { added: [], updated: [], pending: [], notes: [] };

// サイト側の md を読む(1行1項目の単純な frontmatter だけ扱う)。num → { file, text, fm }
async function readSite(key) {
  const dir = path.join(FUTON, key);
  const out = new Map();
  for (const f of (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith(".md"))) {
    const file = path.join(dir, f);
    const text = await fs.readFile(file, "utf8");
    const fm = {};
    for (const m of text.matchAll(/^(\w+): (.+)$/gm)) {
      try { fm[m[1]] = JSON.parse(m[2]); } catch { fm[m[1]] = m[2]; }
    }
    out.set(Number(fm.num), { file, text, fm });
  }
  return out;
}

// 話の md の項目を書き換える(changes が空なら何もしない)
async function patch(entry, changes, label) {
  if (!Object.keys(changes).length) return;
  let text = entry.text;
  for (const [k, v] of Object.entries(changes)) {
    const line = `${k}: ${JSON.stringify(v)}`;
    text = new RegExp(`^${k}: .+$`, "m").test(text) ? text.replace(new RegExp(`^${k}: .+$`, "m"), line)
      : text.replace(/\n---\n?$/, `\n${line}\n---\n`);
  }
  report.updated.push(`${label}: ${Object.entries(changes).map(([k, v]) => `${k}「${entry.fm[k] ?? ""}」→「${v}」`).join(" / ")}`);
  if (!DRY) await fs.writeFile(entry.file, text);
}

// 画像を CDN から取れない環境では、足す回を sync/pending.json に積んでおく。
// push すると GitHub Actions(fetch-images)が画像を取って回を足し、commit する
const PENDING = path.join(process.cwd(), "sync/pending.json");
async function defer(key, a, label, err) {
  const list = JSON.parse(await fs.readFile(PENDING, "utf8").catch(() => "[]"))
    .filter((x) => !(x.series === key && x.args.num === a.num));
  list.push({ series: key, args: a, label });
  await fs.mkdir(path.dirname(PENDING), { recursive: true });
  await fs.writeFile(PENDING, JSON.stringify(list, null, 2) + "\n");
  report.added.push(`${label}(画像を取れなかったので sync/pending.json に積んだ。push すると Actions が足す:${err.message})`);
}

// 1話足す
async function add(key, a, label, note = "") {
  if (!DRY) try { await addEpisode(key, a); } catch (err) { await defer(key, a, label, err); return; }
  report.added.push(`${label} ${note}`.trim());
}

// 表記ゆれを揃える(「 / 」「／」「　」は半角スペース、全角？は半角)
const norm = (s) => String(s ?? "").replace(/\s*[／/]\s*/g, " ").replace(/　/g, " ").replace(/？/g, "?").replace(/\s+/g, " ").trim();
const unhtml = (s) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();

const ctx = { ROOT, FUTON, DRY, report, readSite, patch, add, norm, unhtml };
const use = sources.filter((s) => args[s.flag]);
if (!use.length) {
  console.error("元データを1つ以上渡してください:\n" + sources.map((s) => `  ${s.help}(${s.series})`).join("\n"));
  process.exit(1);
}
for (const s of use) await s.sync(ctx, args[s.flag], args);

const sec = (t, a) => a.length && console.log(`\n■ ${t}\n` + a.map((x) => "  - " + x).join("\n"));
console.log(DRY ? "(--dry:書き換えていません)" : "反映しました");
sec("足した", report.added);
sec("直した", report.updated);
sec("足せなかった(要対応)", report.pending);
sec("メモ", report.notes);
if (!report.added.length && !report.updated.length && !report.pending.length) console.log("サイトはもう最新です");
