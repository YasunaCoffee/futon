// テーマの試着:全部の欄を使う見本(samples/showcase「みほんのふとん」)を、テーマを着せ替えてビルドし、ページがそろっているか確かめる。
//   node tools/try.mjs            … themes/ の全部
//   node tools/try.mjs heisei     … 1着だけ
// できたサイトは out/<テーマ>/ に出る(npx serve out/heisei などで見られる)。
// futon はこのリポジトリの bin/futon.mjs を使う(FUTON_BIN=<futon.mjs のパス> で差し替えられる)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = process.env.FUTON_BIN ?? path.join(ROOT, "bin/futon.mjs");
const all = fs.readdirSync(path.join(ROOT, "themes")).filter((d) => fs.existsSync(path.join(ROOT, "themes", d, "Base.astro")));
const want = process.argv.slice(2).length ? process.argv.slice(2) : all;

// 見本で出るはずのページ
const must = ["index.html", "404.html", "rss.xml", "about/index.html", "privacy/index.html",
  "manga/index.html", "mangaka/index.html", "mangaka/1/index.html", "yonkoma/index.html", "yonkoma/2/index.html",
  "tech/index.html", "tech/sample-1/index.html"];
// テーマが持っていなければいけないファイル
const parts = ["Base", "Home", "ShelfIndex", "GroupIndex", "Episode", "TechIndex", "TechPost", "About", "Privacy", "NotFound"].map((n) => `${n}.astro`);

let bad = 0;
// テーマの言葉 tr("…") に英語の訳があるか
{
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, "engine/src/lib/i18n/en.json"), "utf8"));
  const files = [...fs.readdirSync(path.join(ROOT, "themes")).flatMap((t) => fs.readdirSync(path.join(ROOT, "themes", t)).filter((f) => f.endsWith(".astro")).map((f) => path.join(ROOT, "themes", t, f))),
    ...["components/Share.astro", "components/Tweet.astro", "fallback/GroupIndex.astro", "lib/content.ts"].map((f) => path.join(ROOT, "engine/src", f))];
  const miss = new Set();
  for (const f of files) for (const m of fs.readFileSync(f, "utf8").matchAll(/\btr\("([^"]+)"\)/g)) if (!(m[1] in en)) miss.add(m[1]);
  if (miss.size) { console.log(`✗ 英語の訳がない言葉(engine/src/lib/i18n/en.json に足す): ${[...miss].join(" / ")}`); bad++; }
}
for (const t of want) {
  const dir = path.join(ROOT, "themes", t);
  const out = path.join(ROOT, "out", t);
  const missingParts = parts.filter((p) => !fs.existsSync(path.join(dir, p)));
  if (missingParts.length) { console.log(`✗ ${t}: 足りない部品 ${missingParts.join(" ")}`); bad++; continue; }
  const r = spawnSync(process.execPath, [bin, "build", path.join(ROOT, "samples/showcase")], {
    encoding: "utf8", env: { ...process.env, FUTON_THEME: dir, FUTON_OUT: out, FUTON_QUIET: "1" },
  });
  if (r.status !== 0) { console.log(`✗ ${t}: ビルドできませんでした\n${(r.stderr || r.stdout).split("\n").filter((l) => !/^\s+at /.test(l)).slice(-12).join("\n")}`); bad++; continue; }
  const missing = must.filter((f) => !fs.existsSync(path.join(out, f)));
  const leftover = fs.readFileSync(path.join(out, "index.html"), "utf8").match(/\{[a-z.]+(\|\w+)?\}/g);
  if (missing.length || leftover) { console.log(`✗ ${t}: ${missing.length ? "出ていないページ " + missing.join(" ") : ""} ${leftover ? "置き換わっていない " + leftover.join(" ") : ""}`); bad++; continue; }
  console.log(`✓ ${t}: ${out}`);
}
process.exit(bad ? 1 : 0);
