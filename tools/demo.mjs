// デモサイト:見本(みほんのふとん)を、ついてくるテーマ全部で着て1つのサイトにする。Cloudflare Pages などに置く用。
//   node tools/demo.mjs          → out/demo/(入口の index.html と、/<テーマ>/・/en/<テーマ>/)
// 入口のページはテーマの見た目を小さな窓で並べる。英語版は site.json に "lang": "en" を足しただけの同じ見本
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(ROOT, "bin/futon.mjs");
const OUT = path.join(ROOT, "out/demo");
const THEMES = [
  ["heisei", "平成のキャラクターサイト風(標準)", "2000s Japanese fan site (default)"],
  ["techou", "週間の手帳", "weekly planner"],
  ["kaomoji", "パステルの窓と顔文字", "pastel windows & emoticons"],
  ["vhs", "ビデオのメニュー画面", "VCR menu screen"],
  ["keitai", "ピンクのガラケー", "pink flip phone"],
  ["mado", "むかしのブラウザの窓", "old browser window"],
  ["receipt", "感熱紙のレシート", "thermal receipt"],
  ["plain", "飾りなし", "no decoration"],
];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// 英語版の見本:site.json に lang を足した写し
const enSrc = fs.mkdtempSync(path.join(os.tmpdir(), "futon-demo-en-"));
fs.cpSync(path.join(ROOT, "samples/showcase"), enSrc, { recursive: true });
const sj = JSON.parse(fs.readFileSync(path.join(enSrc, "site.json"), "utf8"));
fs.writeFileSync(path.join(enSrc, "site.json"), JSON.stringify({ ...sj, lang: "en" }, null, 2));

let bad = 0;
for (const [t] of THEMES) for (const [pre, src] of [["", path.join(ROOT, "samples/showcase")], ["en/", enSrc]]) {
  const base = `/${pre}${t}/`;
  const r = spawnSync(process.execPath, [bin, "build", src], {
    encoding: "utf8", env: { ...process.env, FUTON_THEME: path.join(ROOT, "themes", t), FUTON_OUT: path.join(OUT, pre, t), FUTON_BASE: base, FUTON_QUIET: "1" },
  });
  if (r.status !== 0) { console.log(`✗ ${base}\n${(r.stderr || r.stdout).split("\n").slice(-8).join("\n")}`); bad++; } else console.log(`✓ ${base}`);
}
fs.rmSync(enSrc, { recursive: true, force: true });

// 入口のページ(heisei の見た目)
const card = (t, ja, en) => `<li class="card"><a href="./${t}/" class="win" aria-label="${t}"><iframe src="./${t}/" loading="lazy" tabindex="-1" title="${t}"></iframe></a>
<p class="name">${t}</p><p class="d"><span lang="ja">${ja}</span><span lang="en">${en}</span></p>
<p class="go"><a href="./${t}/">日本語で見る</a> <a href="./en/${t}/">English</a></p></li>`;
fs.writeFileSync(path.join(OUT, "index.html"), `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>futon demo</title>
<meta name="description" content="futon:AIフレンドリーな個人サイトエンジン。8種のきせかえを、同じ見本で試せます。">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+P+One&family=Kosugi&family=DotGothic16&display=swap">
<style>
:root{--sky:#CDEBFA;--frame:#3F97D6;--frame-dk:#2A6FA8;--pink:#FF7FA8;--ink:#3A3A4A;--sub:#6F7085;--cream:#FFFBE6;--cream-line:#F0DB8C}
*{box-sizing:border-box}
body{margin:0;color:var(--ink);font:15px/1.7 "Kosugi",sans-serif;background:var(--sky) radial-gradient(#fff 22%,transparent 23%) 0 0/30px 30px;padding:24px 16px 60px}
.wrap{max-width:1100px;margin:0 auto}
h1{font:400 clamp(64px,14vw,120px)/1 "Mochiy Pop P One",sans-serif;color:#fff;margin:10px 0 0;text-align:center;
 text-shadow:0 6px 0 var(--frame-dk),3px 3px 0 var(--frame),-3px 3px 0 var(--frame),3px -3px 0 var(--frame),-3px -3px 0 var(--frame),5px 0 0 var(--frame),-5px 0 0 var(--frame)}
h1 small{font-size:.3em;color:var(--pink);text-shadow:none;vertical-align:top}
.lead{text-align:center;font:400 clamp(20px,4vw,30px)/1.5 "Mochiy Pop P One",sans-serif;color:var(--frame-dk);text-shadow:0 3px 0 #fff;margin:18px 0 6px}
.lead b{font-weight:400;color:var(--pink)}
.sub{text-align:center;margin:0 0 20px}
.cmd{display:inline-block;font-family:"DotGothic16",monospace;font-size:18px;background:var(--cream);border:3px solid var(--cream-line);border-radius:10px;padding:4px 14px;user-select:all}
.links{text-align:center;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:28px}
.btn{font:400 16px "Mochiy Pop P One",sans-serif;color:#fff;text-decoration:none;background:var(--pink);border-radius:99px;padding:6px 20px;box-shadow:0 4px 0 #C23A66}
.btn.b{background:var(--frame);box-shadow:0 4px 0 var(--frame-dk)}
.grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:26px 20px}
.card{background:#fff;border:4px solid var(--frame);border-radius:18px;box-shadow:0 5px 0 var(--frame-dk);padding:12px 12px 14px;text-align:center}
.win{display:block;position:relative;height:380px;overflow:hidden;border-radius:10px;border:2px solid #E3EEF6}
.win iframe{position:absolute;left:0;top:0;width:390px;height:844px;border:0;transform:scale(.55);transform-origin:0 0;pointer-events:none}
.name{font:400 24px "Mochiy Pop P One",sans-serif;color:var(--frame-dk);margin:10px 0 0}
.d{margin:0;color:var(--sub);font-size:13px}.d span{display:block}
.go{margin:8px 0 0;display:flex;gap:10px;justify-content:center;font-size:14px}
.go a{color:#1F63B5}
footer{text-align:center;margin-top:40px;color:var(--sub);font-size:13px}
</style></head><body><div class="wrap">
<h1>futon<small>zzZ</small></h1>
<p class="lead"><b>AIフレンドリー</b>な個人サイトエンジン<br><span style="font-size:.7em">An AI-friendly personal site engine</span></p>
<p class="sub">同じ見本(みほんのふとん)を、8種のきせかえで。どれも <code>site.json</code> の1行で着られます。<br>One sample site, eight themes. Each is one line in <code>site.json</code>.</p>
<p class="sub"><span class="cmd">npm create futon@latest my-site</span></p>
<p class="links"><a class="btn" href="https://github.com/YasunaCoffee/futon">GitHub</a><a class="btn b" href="https://www.npmjs.com/package/@yasuna/futon">npm</a></p>
<ul class="grid">${THEMES.map((x) => card(...x)).join("\n")}</ul>
<footer>MIT(見本のヤスナとのんたんの絵とブッダめっちゃロジカルの4コマは MIT の対象外・© yasuna)</footer>
</div></body></html>`);
// 入口にも robots.txt を置く(各テーマの中に futon が書き出したものを写す)
if (fs.existsSync(path.join(OUT, "heisei", "robots.txt"))) fs.copyFileSync(path.join(OUT, "heisei", "robots.txt"), path.join(OUT, "robots.txt"));
console.log(bad ? `✗ ${bad} 件ビルドできませんでした` : `デモを干しました: ${OUT}`);
process.exit(bad ? 1 : 0);
