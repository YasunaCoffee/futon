// カードの見え方を確かめる。SNS に貼ったとき、サムネ(og:image)が出るか・出ない理由は何か。
//
//   futon card <URL>              公開ページを X・Discord のふりをして読み、出るか確かめる。見本の HTML も書き出す
//   futon card <URL> --html <道>   見本の書き出し先(既定は ./card-preview.html)
//   futon card --dist [フォルダ]    干したサイト(既定は ./dist)の全ページを、公開前にまとめて確かめる
//
// 決まりごと(X の Cards の説明書より。変わることがあるので目安):
//   - twitter:card が無いと X はカードを出さない。summary_large_image は画像 300×157 以上、4096×4096 以下、5MB 未満
//   - X は robots.txt を守る。Twitterbot が締め出されていると、ページも画像も読まない
//   - 形式は JPG・PNG・WEBP・GIF(WEBP でも X に出ることを確かめた)
//   - X は一度読んだカードをしばらく覚えている。直したあとは、URL に ?v=2 などを付けて貼ると読み直す
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true) : undefined; };
const UA = {
  x: "Twitterbot/1.0",
  discord: "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
};
const bot = (agent) => (agent.includes("Discordbot") ? "Discordbot" : "Twitterbot");
const MAX_X_BYTES = 5 * 1024 * 1024;

// ---------- 読み取り ----------
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
export function parseMeta(html) {
  const meta = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const attr = (n) => tag.match(new RegExp(`\\b${n}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
    const key = attr("property") ?? attr("name");
    const val = attr("content");
    if (key && val) {
      const k = (key[2] ?? key[3] ?? key[4]).toLowerCase();
      if (!(k in meta)) meta[k] = decode(val[2] ?? val[3] ?? val[4] ?? "");
    }
    const eq = attr("http-equiv");
    if (eq && /refresh/i.test(eq[2] ?? eq[3] ?? eq[4]) && val) meta["refresh"] = decode(val[2] ?? val[3] ?? val[4] ?? "");
  }
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t) meta["<title>"] = decode(t[1].trim());
  return meta;
}

// 画像の頭の数バイトから形式を当てる(Content-Type はあてにならないことがある)
export function sniff(buf) {
  const b = buf.subarray(0, 12);
  if (b[0] === 0xff && b[1] === 0xd8) return "jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.toString("ascii", 0, 3) === "GIF") return "gif";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (b.toString("ascii", 4, 12).startsWith("ftypavif")) return "avif";
  if (/^\s*<(\?xml|svg)/.test(buf.subarray(0, 100).toString("utf8"))) return "svg";
  return "unknown";
}

async function imageInfo(buf) {
  const format = sniff(buf);
  let width, height;
  try { ({ width, height } = await sharp(buf).metadata()); } catch { /* 読めない形式 */ }
  return { format, width, height, bytes: buf.length };
}

// robots.txt:その UA(なければ *)の Disallow/Allow を見て、道が読めるか。長く一致したほうが勝つ
export function robotsAllows(txt, agent, p) {
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") {
      if (!lastWasAgent) groups.push(cur = { agents: [], rules: [] });
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (k === "allow" || k === "disallow")) cur.rules.push({ allow: k === "allow", path: v });
    }
  }
  const name = agent.toLowerCase();
  const g = groups.filter((x) => x.agents.some((a) => a !== "*" && name.includes(a)));
  const use = g.length ? g : groups.filter((x) => x.agents.includes("*"));
  let best = { len: -1, allow: true };
  for (const r of use.flatMap((x) => x.rules)) {
    if (!r.path) continue; // 「Disallow:」だけは全部よい
    const re = new RegExp("^" + r.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (re.test(p) && r.path.length > best.len) best = { len: r.path.length, allow: r.allow };
  }
  return best.allow;
}

// ---------- 判定 ----------
// 画像とメタから、X・Discord それぞれの ✓ ✗ ⚠ を並べる
function judge({ meta, image, imageUrl, robots }) {
  const card = meta["twitter:card"];
  const xs = [], ds = [];
  const ok = (list, msg) => list.push(["✓", msg]);
  const ng = (list, msg) => list.push(["✗", msg]);
  const warn = (list, msg) => list.push(["⚠", msg]);

  if (!card) ng(xs, "twitter:card がない(X はカードを出さない)");
  else ok(xs, `twitter:card = ${card}`);
  if (!imageUrl) { ng(xs, "og:image も twitter:image もない"); ng(ds, "og:image がない"); }
  else {
    if (!/^https?:\/\//.test(imageUrl)) ng(xs, `画像の URL が絶対URLではない: ${imageUrl}`);
    else if (imageUrl.startsWith("http:")) warn(xs, "画像が http(https ではない)");
  }
  if (robots) {
    for (const [who, list, agent] of [["X", xs, UA.x], ["Discord", ds, UA.discord]]) {
      if (robots[agent] && robots[agent].page === false) ng(list, `robots.txt が ${who} にページを読ませていない`);
      if (robots[agent] && robots[agent].image === false) ng(list, `robots.txt が ${who} に画像を読ませていない`);
    }
  }
  if (image) {
    if (image.error) { ng(xs, `画像を取れない: ${image.error}`); ng(ds, `画像を取れない: ${image.error}`); }
    else {
      const { format, width, height, bytes } = image;
      const size = width ? `${width}×${height}` : "大きさ不明";
      const kb = `${Math.round(bytes / 1024)}KB`;
      if (["jpeg", "png", "gif", "webp"].includes(format)) ok(xs, `画像は ${format}(${size}・${kb})`);
      else ng(xs, `X が読めない形式: ${format}`);
      if (bytes >= MAX_X_BYTES) ng(xs, `画像が 5MB 以上(${kb})`);
      if (width && card === "summary_large_image") {
        if (width < 300 || height < 157) ng(xs, `大きい画像のカードには小さすぎる(300×157 以上がいる): ${size}`);
        else if (Math.abs(width / height - 1.91) > 0.25) warn(xs, `横長 1.91:1(例 1200×630)でないので、上下か左右が切れる: ${size}`);
      }
      if (width && (width > 4096 || height > 4096)) ng(xs, `画像が 4096 を超えている: ${size}`);
      if (["jpeg", "png", "gif", "webp"].includes(format)) ok(ds, `画像は ${format}(${size}・${kb})`);
      else ng(ds, `Discord が出せない形式: ${format}`);
    }
  }
  if (meta["og:title"] || meta["twitter:title"]) ok(ds, "題名あり"); else warn(ds, "og:title がない(<title> が使われる)");
  return { x: xs, discord: ds };
}

const verdict = (list) => (list.some(([s]) => s === "✗") ? "出ない" : list.some(([s]) => s === "⚠") ? "出ないかも" : "出る");

// ---------- 見本の HTML ----------
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function previewHtml({ url, meta, imageUrl, result }) {
  const title = meta["twitter:title"] ?? meta["og:title"] ?? meta["<title>"] ?? url;
  const desc = meta["twitter:description"] ?? meta["og:description"] ?? "";
  const site = meta["og:site_name"] ?? "";
  const host = new URL(url).host;
  const large = meta["twitter:card"] === "summary_large_image";
  const rows = (list) => list.map(([s, m]) => `<li class="${s === "✓" ? "ok" : s === "✗" ? "ng" : "warn"}">${s} ${esc(m)}</li>`).join("");
  const img = imageUrl ? `<img src="${esc(imageUrl)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'broken',textContent:'画像を読めない'}))">` : `<div class="broken">画像なし</div>`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>カードの見え方</title><style>
:root{--bg:#f5f8fa;--fg:#0f1419;--sub:#536471;--line:#cfd9de;--card:#fff;--ok:#00875a;--ng:#d0021b;--warn:#b26a00}
@media (prefers-color-scheme:dark){:root{--bg:#15202b;--fg:#e7e9ea;--sub:#8b98a5;--line:#38444d;--card:#192734;--ok:#3ecf8e;--ng:#ff6b6b;--warn:#f5b041}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif}
main{max-width:600px;margin:0 auto;padding:24px 16px}h1{font-size:18px;margin:0 0 4px}.url{color:var(--sub);word-break:break-all;margin:0 0 24px}
h2{font-size:15px;margin:28px 0 8px}.v{font-weight:700}.v.出る{color:var(--ok)}.v.出ない{color:var(--ng)}.v.出ないかも{color:var(--warn)}
ul{list-style:none;padding:0;margin:8px 0 0;font-size:13px}li{padding:2px 0}li.ok{color:var(--ok)}li.ng{color:var(--ng)}li.warn{color:var(--warn)}
.x{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--card);position:relative}
.x img,.x .broken{display:block;width:100%;aspect-ratio:1.91/1;object-fit:cover}
.x .dom{position:absolute;left:12px;bottom:12px;background:rgba(0,0,0,.77);color:#fff;font-size:13px;padding:0 6px;border-radius:4px}
.x.small{display:flex}.x.small img,.x.small .broken{width:130px;aspect-ratio:1;flex:none}.x.small .t{padding:12px;font-size:14px}.x.small .t span{color:var(--sub)}
.d{background:#2b2d31;color:#dbdee1;border-left:4px solid #1e1f22;border-radius:4px;padding:12px 16px;max-width:432px}
.d .s{font-size:12px;color:#b5bac1}.d .t{color:#00a8fc;font-weight:600;margin:4px 0}.d .p{font-size:14px;margin:0 0 12px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.d img,.d .broken{display:block;max-width:100%;border-radius:4px}.nocard{border:1px dashed var(--line);border-radius:16px;padding:16px;color:var(--sub);font-size:13px;word-break:break-all}.nocard a{color:#1d9bf0}
.broken{background:var(--line);color:var(--sub);display:flex;align-items:center;justify-content:center;min-height:120px;font-size:13px}
</style></head><body><main>
<h1>${esc(title)}</h1><p class="url">${esc(url)}</p>
<h2>X: <span class="v ${verdict(result.x)}">${verdict(result.x)}</span></h2>
${verdict(result.x) === "出ない" ? `<div class="nocard">カードは出ず、URL だけが出ます<br><a>${esc(url)}</a></div>` : large ? `<div class="x">${img}<span class="dom">${esc(host)}</span></div>` : `<div class="x small">${img}<div class="t">${esc(title)}<br><span>${esc(host)}</span></div></div>`}
<ul>${rows(result.x)}</ul>
<h2>Discord: <span class="v ${verdict(result.discord)}">${verdict(result.discord)}</span></h2>
<div class="d">${site ? `<div class="s">${esc(site)}</div>` : ""}<div class="t">${esc(title)}</div>${desc ? `<p class="p">${esc(desc)}</p>` : ""}${imageUrl ? img : ""}</div>
<ul>${rows(result.discord)}</ul>
<p class="url" style="margin-top:28px">見本は見た目の目安です。X は一度読んだカードをしばらく覚えているので、直したあとは URL に ?v=2 などを付けて貼ると読み直します。</p>
</main></body></html>`;
}

// ---------- 公開ページを確かめる ----------
async function get(url, agent, opts = {}) {
  const chain = [];
  let cur = url;
  for (let i = 0; i < 10; i++) {
    const res = await fetch(cur, { headers: { "user-agent": agent, accept: opts.accept ?? "*/*" }, redirect: "manual", signal: AbortSignal.timeout(20000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      chain.push(`${res.status} ${cur}`);
      cur = new URL(res.headers.get("location"), cur).href;
      continue;
    }
    return { res, url: cur, chain, buf: Buffer.from(await res.arrayBuffer()) };
  }
  throw new Error("転送が多すぎる");
}

async function checkUrl(url) {
  console.log(`カードを確かめます: ${url}\n`);
  const page = await get(url, UA.x, { accept: "text/html" });
  if (page.chain.length) console.log(`  転送: ${page.chain.join(" → ")} → ${page.url}`);
  console.log(`  ページ: ${page.res.status} ${page.res.headers.get("content-type") ?? ""}`);
  if (!page.res.ok) { console.log(`\n✗ ページが ${page.res.status} を返した。X も Discord もカードを作れない`); process.exitCode = 1; return; }
  const meta = parseMeta(page.buf.toString("utf8"));
  if (meta.refresh) console.log(`  ⚠ meta refresh で転送している(${meta.refresh})。SNS は転送先ではなく、このページのメタを使う`);
  const raw = meta["twitter:image"] ?? meta["og:image"];
  const imageUrl = raw ? new URL(raw, page.url).href : undefined;

  // robots.txt(ページと画像のそれぞれの持ち主)
  const robots = {};
  const robotsFor = async (u) => {
    try { const r = await get(new URL("/robots.txt", u).href, UA.x); return r.res.ok ? r.buf.toString("utf8") : ""; } catch { return ""; }
  };
  const pageRobots = await robotsFor(page.url);
  const imgRobots = imageUrl ? (new URL(imageUrl).origin === new URL(page.url).origin ? pageRobots : await robotsFor(imageUrl)) : "";
  for (const agent of [UA.x, UA.discord]) {
    robots[agent] = {
      page: robotsAllows(pageRobots, bot(agent), new URL(page.url).pathname),
      image: imageUrl ? robotsAllows(imgRobots, bot(agent), new URL(imageUrl).pathname) : undefined,
    };
  }

  let image;
  if (imageUrl) {
    try {
      const r = await get(imageUrl, UA.x, { accept: "image/*" });
      if (!r.res.ok) image = { error: `${r.res.status}` };
      else {
        image = await imageInfo(r.buf);
        const ct = r.res.headers.get("content-type") ?? "";
        console.log(`  画像: ${r.res.status} ${ct} ${imageUrl}`);
        if (ct && !ct.startsWith("image/")) image.error = `Content-Type が画像ではない(${ct})`;
      }
    } catch (e) { image = { error: [e.message, e.cause?.code ?? e.cause?.message].filter(Boolean).join(": ") }; }
  }

  const result = judge({ meta, image, imageUrl: raw, robots }); // 絶対URLかどうかは書かれたままの値で見る
  for (const [name, list] of [["X", result.x], ["Discord", result.discord]]) {
    console.log(`\n${name}: ${verdict(list)}`);
    for (const [s, m] of list) console.log(`  ${s} ${m}`);
  }
  const out = path.resolve(typeof flag("--html") === "string" ? flag("--html") : "card-preview.html");
  fs.writeFileSync(out, previewHtml({ url: page.url, meta, imageUrl, result }));
  console.log(`\n見本: ${out}`);
  if (verdict(result.x) === "出る") console.log("X: 全部 ✓ なのに X で出ないなら、X が前に読んだカード(ページが無かったころなど)を覚えています。URL に ?v=2 などを付けて貼ると読み直します。");
  else console.log("X は一度読んだカードをしばらく覚えています。直したあとは URL に ?v=2 などを付けて貼ると読み直します。");
  if (result.x.some(([s]) => s === "✗") || result.discord.some(([s]) => s === "✗")) process.exitCode = 1;
}

// ---------- 干したサイトを確かめる ----------
async function checkDist(dir) {
  const root = path.resolve(dir);
  if (!fs.existsSync(root)) { console.error(`見つかりません: ${root}(先に futon build で干してください)`); process.exit(1); }
  const pages = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".html")) pages.push(p); } };
  walk(root);
  const cache = new Map();
  const problems = [];
  let good = 0;
  for (const file of pages) {
    const rel = path.relative(root, file);
    const meta = parseMeta(fs.readFileSync(file, "utf8"));
    if (meta.refresh && !meta["og:image"]) continue; // 転送だけのページ
    const raw = meta["twitter:image"] ?? meta["og:image"];
    let image;
    if (raw) {
      // https://ドメイン/道?v=… → dist/道
      const p = decodeURIComponent((/^https?:/.test(raw) ? new URL(raw).pathname : raw).split("?")[0]).replace(/^\//, "");
      const f = path.join(root, p);
      if (!cache.has(f)) cache.set(f, fs.existsSync(f) ? await imageInfo(fs.readFileSync(f)) : { error: `dist に画像がない(${p})` });
      image = cache.get(f);
    }
    const r = judge({ meta, image, imageUrl: raw });
    const bad = [...r.x, ...r.discord].filter(([s]) => s !== "✓");
    if (bad.length) problems.push([rel, [...new Map(bad.map((b) => [b.join(" "), b])).values()]]);
    else good++;
  }
  console.log(`カードを確かめました: ${pages.length} ページ(${root})\n  ✓ 問題なし ${good} ページ`);
  // 同じ指摘はまとめる
  const byMsg = new Map();
  for (const [rel, list] of problems) for (const [s, m] of list) { const k = `${s} ${m.replace(/[（(][^)）]*[)）]/g, "").replace(/:\s*\d+×\d+$/, "").trim()}`; if (!byMsg.has(k)) byMsg.set(k, []); byMsg.get(k).push(rel); }
  for (const [k, rels] of [...byMsg].sort((a, b) => (a[0][0] === "✗" ? -1 : 1) - (b[0][0] === "✗" ? -1 : 1))) {
    console.log(`  ${k}: ${rels.length} ページ`);
    for (const r of rels.slice(0, 5)) console.log(`      ${r}`);
    if (rels.length > 5) console.log(`      ほか ${rels.length - 5} ページ`);
  }
  if ([...byMsg.keys()].some((k) => k.startsWith("✗"))) process.exitCode = 1;
}

const dist = flag("--dist");
const target = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--html" && !(args[i - 1] === "--dist"));
if (dist) await checkDist(typeof dist === "string" ? dist : "dist");
else if (target && /^https?:\/\//.test(target)) await checkUrl(target);
else {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n"));
  process.exitCode = target ? 1 : 0;
}
