// みほんのふとんの絵(色と飾り:パステルのコマ・ふきだし・きらきら・窓の枠・札)を描き直す道具。HTML+SVG をブラウザで描いて png にする。
// 仮のキャラは描かない(DRAW_CHARS=1 のときだけ描く)。使うには playwright が要る(futon の依存には入れていない)。
// node samples/showcase/art/make.mjs → png2/ に出るので、webp にして public/img へ(nikki/ は雛形 starter/public/img/nikki/ へ)
import { chromium } from "playwright";
import fs from "node:fs";
const INK = "#3b3355";
const DRAW_CHARS = process.env.DRAW_CHARS === "1"; // 1 にすると、おもちの仮キャラも描く
const C = { pink: ["#ffd3e6", "#f27bab"], blue: ["#cfdcff", "#4b63d8"], white: ["#ffffff", INK], yellow: ["#fff3b8", "#e0a93a"] };
const spark = (x, y, s = 10, c = "#fff") => `<path d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z" fill="${c}"/>`;
// おもちのキャラ。kind: usa(うさ耳)/neko(ねこ耳)/mochi。face: dot / happy / sleep / wink / sad / surprise
function blob(cx, cy, r, color, kind = "mochi", face = "dot", tilt = 0) {
  if (!DRAW_CHARS) return ""; // 仮のキャラは描かない(色と飾りだけ)
  const [fill, line] = C[color];
  const sw = Math.max(2.5, r / 16);
  let ears = "";
  if (kind === "usa") ears = [-1, 1].map((d) => `<ellipse cx="${cx + d * r * .38}" cy="${cy - r * 1.05}" rx="${r * .2}" ry="${r * .55}" transform="rotate(${d * 12} ${cx + d * r * .38} ${cy - r * .6})" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/><ellipse cx="${cx + d * r * .38}" cy="${cy - r * 1.02}" rx="${r * .08}" ry="${r * .35}" transform="rotate(${d * 12} ${cx + d * r * .38} ${cy - r * .6})" fill="${line}" opacity=".45"/>`).join("");
  if (kind === "neko") ears = [-1, 1].map((d) => `<path d="M${cx + d * r * .78} ${cy - r * .35} L${cx + d * r * .62} ${cy - r * 1.02} L${cx + d * r * .18} ${cy - r * .72}Z" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`).join("");
  const ey = cy - r * .05, ex = r * .32, es = r * .085;
  const eye = (x, mode) => mode === "dot" ? `<circle cx="${x}" cy="${ey}" r="${es}" fill="${INK}"/>`
    : mode === "happy" ? `<path d="M${x - es * 1.4} ${ey + es * .5} Q${x} ${ey - es * 1.6} ${x + es * 1.4} ${ey + es * .5}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round"/>`
    : mode === "sleep" ? `<path d="M${x - es * 1.4} ${ey} Q${x} ${ey + es * 1.4} ${x + es * 1.4} ${ey}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round"/>`
    : mode === "sad" ? `<path d="M${x - es * 1.3} ${ey - es * .6} L${x + es * 1.3} ${ey + es * .4}" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round"/>`
    : mode === "big" ? `<circle cx="${x}" cy="${ey}" r="${es * 1.5}" fill="${INK}"/><circle cx="${x + es * .5}" cy="${ey - es * .5}" r="${es * .55}" fill="#fff"/>`
    : `<circle cx="${x}" cy="${ey}" r="${es}" fill="${INK}"/>`;
  const eyes = { dot: ["dot", "dot"], happy: ["happy", "happy"], sleep: ["sleep", "sleep"], wink: ["dot", "happy"], sad: ["sad", "sad"], surprise: ["big", "big"] }[face];
  const mouth = face === "surprise" ? `<ellipse cx="${cx}" cy="${ey + r * .2}" rx="${r * .07}" ry="${r * .09}" fill="${INK}"/>`
    : `<path d="M${cx - r * .14} ${ey + r * .13} q${r * .07} ${r * .11} ${r * .14} 0 q${r * .07} ${r * .11} ${r * .14} 0" fill="none" stroke="${INK}" stroke-width="${sw * .8}" stroke-linecap="round"/>`;
  return `<g transform="rotate(${tilt} ${cx} ${cy})">${ears}
    <path d="M${cx - r} ${cy + r * .55} C${cx - r * 1.08} ${cy - r * .75} ${cx - r * .5} ${cy - r * .98} ${cx} ${cy - r * .98} C${cx + r * .5} ${cy - r * .98} ${cx + r * 1.08} ${cy - r * .75} ${cx + r} ${cy + r * .55} C${cx + r * .7} ${cy + r * .82} ${cx - r * .7} ${cy + r * .82} ${cx - r} ${cy + r * .55}Z" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>
    <ellipse cx="${cx - ex - r * .1}" cy="${ey + r * .17}" rx="${r * .12}" ry="${r * .07}" fill="#ff8fb8" opacity=".55"/><ellipse cx="${cx + ex + r * .1}" cy="${ey + r * .17}" rx="${r * .12}" ry="${r * .07}" fill="#ff8fb8" opacity=".55"/>
    ${eye(cx - ex, eyes[0])}${eye(cx + ex, eyes[1])}${mouth}</g>`;
}
// ふきだし(HTML)
const bubble = (x, y, text, { color = "white", size = 26, tail = "bl", w } = {}) => {
  const [fill, line] = C[color];
  return `<div class="bub t-${tail}" style="left:${x}px;top:${y}px;--f:${fill};--l:${color === "white" ? INK : line};font-size:${size}px;${w ? `width:${w}px;` : ""}">${text}</div>`;
};
const page = (w, h, body, bg = "#eef0ff") => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;800&family=DotGothic16&display=swap">
<style>*{box-sizing:border-box;margin:0}body{width:${w}px;height:${h}px;background:${bg};font-family:"M PLUS Rounded 1c",sans-serif;color:${INK};position:relative;overflow:hidden}
svg.l{position:absolute;inset:0}
.bub{position:absolute;background:var(--f);border:3px solid var(--l);border-radius:18px;padding:6px 14px;font-weight:800;white-space:nowrap;line-height:1.3;color:var(--l);box-shadow:3px 3px 0 color-mix(in srgb,var(--l) 30%,transparent)}
.bub::after{content:"";position:absolute;bottom:-14px;width:18px;height:14px;background:var(--f);border:3px solid var(--l);border-top:0;clip-path:polygon(0 0,100% 0,0 100%)}
.bub.t-bl::after{left:22px;border-right:0}.bub.t-br::after{right:22px;clip-path:polygon(0 0,100% 0,100% 100%);border-left:0}
.bub.t-none::after{display:none}
.panel{position:absolute;border:4px solid ${INK};border-radius:10px;overflow:hidden}
.win{position:absolute;border:3px solid #4b63d8;border-radius:12px;background:#f6f7ff;overflow:hidden}
.win .bar{height:34px;background:linear-gradient(#dfe6ff,#c9d4ff);border-bottom:3px solid #4b63d8;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-family:"DotGothic16";color:#4b63d8;font-size:18px}
.win .bar b{letter-spacing:6px}
.dot{font-family:"DotGothic16"}
.tate{writing-mode:vertical-rl;font-weight:800}
</style></head><body>${body}</body></html>`;
const svg = (w, h, inner) => `<svg class="l" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
const sparks = (list, c) => list.map(([x, y, s]) => spark(x, y, s, c)).join("");

const out = {};
// 雛形(はじめてのふとん)の絵日記:色と飾りだけ
out["nikki/001"] = [480, 640, page(480, 640, svg(480, 640, `<circle cx="240" cy="360" r="170" fill="#dde6ff"/>${sparks([[70, 110, 16], [410, 150, 12], [400, 540, 18], [80, 520, 11], [250, 600, 9]], "#9fb3f5")}`) + bubble(130, 90, "はじめた ✦", { size: 34, color: "white", tail: "bl" }), "#f5f8ff")];
out["nikki/002"] = [480, 640, page(480, 640, svg(480, 640, `<circle cx="240" cy="360" r="170" fill="#ffe3ef"/>${sparks([[80, 130, 12], [400, 110, 16], [410, 520, 11], [70, 540, 18], [240, 600, 9]], "#f7a8c8")}`) + bubble(140, 90, "つづいた ♡", { size: 34, color: "white", tail: "br" }), "#fff7fb")];
// キャラA:ピンクのうさぎのおもち
out["chars/a"] = [300, 400, page(300, 400, svg(300, 400, `<circle cx="150" cy="230" r="120" fill="#ffe3ef"/>${sparks([[40, 60, 12], [260, 90, 9], [250, 330, 11], [50, 300, 7]], "#f7a8c8")}${blob(150, 270, 95, "pink", "usa", "wink")}`) + bubble(170, 30, "(｡•ω•｡)ﾉ", { size: 22, color: "white", tail: "bl" }), "#fff7fb")];
// キャラB:青いねこのおもち
out["chars/b"] = [300, 400, page(300, 400, svg(300, 400, `<circle cx="150" cy="230" r="120" fill="#dde6ff"/>${sparks([[45, 70, 10], [262, 60, 12], [255, 320, 8], [40, 330, 11]], "#9fb3f5")}${blob(150, 275, 95, "blue", "neko", "dot")}`) + bubble(20, 40, "ฅ(•ω•)ฅ", { size: 22, color: "white", tail: "br" }).replace("ฅ(•ω•)ฅ", "=^･ω･^="), "#f5f8ff")];
// 本の表紙
out["books/1"] = [300, 420, page(300, 420, `<div class="win" style="inset:14px"><div class="bar"><span>mihon_01.png</span><b>_□×</b></div>
  ${svg(272, 392, `<rect x="0" y="34" width="272" height="358" fill="#eef0ff"/>${sparks([[40, 90, 11], [240, 120, 9], [220, 330, 12], [36, 300, 8]], "#fff")}${blob(90, 290, 58, "pink", "usa", "happy", -6)}${blob(190, 300, 55, "blue", "neko", "wink", 5)}`)}
  <div style="position:absolute;left:0;right:0;top:62px;text-align:center"><div style="font-weight:800;font-size:40px;color:#f27bab;-webkit-text-stroke:1.5px ${INK};text-shadow:3px 3px 0 #fff">みほんの本</div><div class="dot" style="font-size:18px;color:#4b63d8;margin-top:4px">- vol.1 -</div></div>
  ${bubble(100, 150, "✦ ﾖﾛｼｸ ✦", { size: 18, color: "white", tail: "bl" })}</div>`, "#ffd3e6")];

// まんがのコマ
const koma = (x, y, w, h, bg, inner, bubbles = "") => `<div class="panel" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${bg}">${svg(w, h, inner)}${bubbles}</div>`;
const w = 512; // まんがのコマの幅(ふきだしの位置用)
const stories = {
  "mangaka/001/right": [["#fff7fb", (w, h) => blob(w * .32, h * .62, 62, "pink", "usa", "dot") + sparks([[w * .8, 40, 9]], "#f7a8c8"), [[w * .5, 26, "おはよ〜", "white", "bl"]]],
    ["#f5f8ff", (w, h) => blob(w * .7, h * .62, 62, "blue", "neko", "sleep"), [[30, 30, "(ˇωˇ)ｽﾔｧ", "white", "br"]]],
    ["#fff7fb", (w, h) => blob(w * .3, h * .62, 58, "pink", "usa", "surprise") + blob(w * .72, h * .64, 58, "blue", "neko", "sleep"), [[w * .12, 22, "!?", "pink", "bl"]]],
    ["#eef0ff", (w, h) => blob(w * .5, h * .6, 70, "pink", "usa", "happy") + sparks([[60, 50, 12], [w - 60, 60, 10]], "#fff"), [[w * .56, 24, "おこしたよ♡", "white", "bl"]]]],
  "mangaka/001/left": [["#f5f8ff", (w, h) => blob(w * .5, h * .62, 64, "blue", "neko", "sad"), [[w * .5, 26, "あと5ふん…", "blue", "bl"]]],
    ["#fff7fb", (w, h) => blob(w * .35, h * .62, 60, "pink", "usa", "dot"), [[w * .55, 30, "(´・ω・`)", "white", "bl"]]],
    ["#eef0ff", (w, h) => blob(w * .3, h * .62, 58, "pink", "usa", "sleep") + blob(w * .7, h * .62, 58, "blue", "neko", "sleep"), [[w * .38, 22, "…", "white", "bl"]]],
    ["#fff3b8", (w, h) => `<text x="${w / 2}" y="${h * .58}" text-anchor="middle" font-family="DotGothic16" font-size="46" fill="#e0a93a">zzZ zzZ</text>` + sparks([[50, 40, 12], [w - 50, h - 40, 12]], "#fff"), []]],
  "mangaka/002/right": [["#eef0ff", (w, h) => blob(w * .5, h * .62, 64, "blue", "neko", "dot") + sparks([[70, 50, 10]], "#fff"), [[w * .55, 24, "おなかすいた", "blue", "bl"]]],
    ["#fff7fb", (w, h) => blob(w * .3, h * .62, 60, "pink", "usa", "wink"), [[w * .45, 30, "おもち やく?", "white", "bl"]]],
    ["#fff3b8", (w, h) => blob(w * .5, h * .62, 64, "white", "mochi", "surprise"), [[w * .55, 22, "え…", "white", "bl"]]],
    ["#f5f8ff", (w, h) => blob(w * .3, h * .64, 56, "pink", "usa", "happy") + blob(w * .72, h * .64, 56, "blue", "neko", "happy"), [[w * .3, 22, "(*´∀｀*)", "white", "bl"]]]],
  "mangaka/002/left": [["#fff7fb", (w, h) => blob(w * .5, h * .62, 64, "white", "mochi", "sad"), [[w * .5, 26, "やかないで…", "white", "bl"]]],
    ["#eef0ff", (w, h) => blob(w * .3, h * .62, 58, "pink", "usa", "surprise") + blob(w * .7, h * .62, 58, "blue", "neko", "surprise"), [[w * .4, 22, "しゃべった!", "pink", "bl"]]],
    ["#f5f8ff", (w, h) => blob(w * .5, h * .62, 60, "white", "mochi", "happy") + sparks([[70, 60, 11], [w - 70, 50, 9]], "#9fb3f5"), [[w * .52, 26, "ともだち ね", "white", "bl"]]],
    ["#fff7fb", (w, h) => blob(w * .24, h * .64, 48, "pink", "usa", "happy") + blob(w * .5, h * .66, 44, "white", "mochi", "happy") + blob(w * .76, h * .64, 48, "blue", "neko", "happy"), [[w * .6, 20, "♡", "pink", "bl"]]]],
};
for (const [name, ps] of Object.entries(stories)) {
  const W = 540, H = 960, g = 14, ph = (H - g * 5) / 4, pw = W - g * 2;
  const body = ps.map(([bg, draw, bs], i) => koma(g, g + i * (ph + g), pw, ph, bg, draw(pw, ph), bs.map(([x, y, t, c, tl]) => bubble(Math.min(x, pw - 200), y, t, { size: 24, color: c, tail: tl })).join(""))).join("");
  out[name] = [W, H, page(W, H, body, "#ffffff")];
}
// 札
for (const [n, t] of [["001", "見本の結び"], ["002", "見本の結び"]])
  out[`mangaka/${n}/card`] = [540, 960, page(540, 960, `<div class="win" style="inset:30px"><div class="bar"><span>fuda_${n}.txt</span><b>_□×</b></div>
  ${svg(480, 900, sparks([[70, 150, 16], [410, 230, 12], [380, 760, 16], [90, 700, 11]], "#f7a8c8") + blob(240, 760, 70, "pink", "usa", "sleep"))}
  <div class="tate" style="position:absolute;right:120px;top:110px;font-size:52px;letter-spacing:10px">${t}</div>
  <div class="tate" style="position:absolute;right:200px;top:190px;font-size:52px;letter-spacing:10px">二行目</div>
  <div class="tate dot" style="position:absolute;left:70px;top:130px;font-size:24px;color:#4b63d8">見本の出典</div></div>`, "#ffd3e6")];
// 4コマ
const yk = {
  "yonkoma/001": [["#fff7fb", "pink", "usa", "dot", "きょうは"], ["#f5f8ff", "pink", "usa", "happy", "がんばる!"], ["#eef0ff", "pink", "usa", "sleep", "…"], ["#fff3b8", "pink", "usa", "wink", "あした から"]],
  "yonkoma/002": [["#f5f8ff", "blue", "neko", "dot", "なぜ ねむい?"], ["#eef0ff", "blue", "neko", "surprise", "よるふかし"], ["#fff7fb", "blue", "neko", "sad", "(´・ω・`)"], ["#fff3b8", "blue", "neko", "sleep", "ﾛｼﾞｶﾙ…"]],
  "yonkoma/003": [["#fff7fb", "white", "mochi", "dot", "ふとん"], ["#eef0ff", "white", "mochi", "happy", "ふかふか"], ["#f5f8ff", "white", "mochi", "sleep", "zzZ"], ["#fff3b8", "white", "mochi", "surprise", "ちこく!"]],
};
for (const [name, ps] of Object.entries(yk)) {
  const W = 600, H = 1600, g = 18, ph = (H - g * 5) / 4, pw = W - g * 2;
  const body = ps.map(([bg, col, kind, face, t], i) => koma(g, g + i * (ph + g), pw, ph, bg,
    blob(pw * (i % 2 ? .66 : .36), ph * .62, 100, col, kind, face, i === 3 ? -8 : 0) + sparks([[50, 50, 14], [pw - 50, ph - 50, 12]], "#fff"),
    bubble(i % 2 ? 30 : pw * .5, 34, t, { size: 34, color: "white", tail: i % 2 ? "br" : "bl" }))).join("");
  out[name] = [W, H, page(W, H, body, "#ffffff")];
}

const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const [name, [w, h, html]] of Object.entries(out)) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, async (r) => { const res = await fetch(r.request().url(), { headers: { "user-agent": r.request().headers()["user-agent"] } }); await r.fulfill({ status: res.status, body: Buffer.from(await res.arrayBuffer()), headers: { "content-type": res.headers.get("content-type") ?? "", "access-control-allow-origin": "*" } }); });
  await p.setContent(html, { waitUntil: "networkidle" }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  fs.mkdirSync(`png2/${name.split("/").slice(0, -1).join("/")}`, { recursive: true });
  await p.screenshot({ path: `png2/${name}.png` }); await p.close(); console.log(name);
}
await b.close();
