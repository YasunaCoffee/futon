// 縦にコマが並ぶ4コマから「転」のコマ(最後から2番目)を切り出して、トップの大きな1コマ用の画像にする。
// コマ枠はページの白い溝(両側が枠線)から測る。 node scripts/hero.mjs で全話ぶん作り直す
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function runs(mask, min) {
  const out = []; let s = -1;
  for (let i = 0; i <= mask.length; i++) {
    if (i < mask.length && mask[i]) { if (s < 0) s = i; }
    else if (s >= 0) { if (i - s >= min) out.push([s, i]); s = -1; }
  }
  return out;
}
function gutters(frac) {
  return runs(frac.map((v) => v < 0.1), 4).filter(([a, b]) => b - a <= 40 && a > 0 && b < frac.length && frac[a - 1] > 0.5 && frac[b] > 0.5).map(([a, b]) => (a + b) >> 1);
}
const split = (lo, hi, cuts) => { const e = [lo, ...cuts.filter((c) => c > lo && c < hi), hi]; return e.slice(1).map((b, i) => [e[i], b]).filter(([a, b]) => b - a > 80); };

export async function yonkomaHero(srcFile, outFile) {
  const { data, info } = await sharp(srcFile).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const dark = (x, y) => data[y * W + x] < 110;
  const colFrac = (x0, x1, y0, y1) => Array.from({ length: x1 - x0 }, (_, i) => { let n = 0; for (let y = y0; y < y1; y++) n += dark(x0 + i, y); return n / (y1 - y0); });
  const rowFrac = (x0, x1, y0, y1) => Array.from({ length: y1 - y0 }, (_, j) => { let n = 0; for (let x = x0; x < x1; x++) n += dark(x, y0 + j); return n / (x1 - x0); });
  const vg = gutters(colFrac(0, W, 40, H - 40)).filter((x) => x > W * 0.6);
  const leftEnd = vg.length ? vg[vg.length - 1] : Math.round(W * 0.84);
  const rows = split(0, H, gutters(rowFrac(4, leftEnd - 4, 0, H)));
  const panels = [];
  for (const [y0, y1] of rows) {
    const cols = split(0, leftEnd, gutters(colFrac(0, leftEnd, y0 + 8, y1 - 8)).map((c) => c));
    for (const [x0, x1] of cols) panels.push([x0, x1, y0, y1]);
  }
  if (panels.length < 2) throw new Error("コマを見つけられませんでした: " + srcFile);
  // 転=最後から2番目。横に2コマ並ぶ段なら、その段で一番大きいもの
  const [x0, x1, y0, y1] = panels[panels.length - 2];
  await sharp(srcFile).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).webp({ quality: 85 }).toFile(outFile);
  return outFile;
}

if (process.argv[1] && process.argv[1].endsWith("hero.mjs")) {
  // node lib/hero.mjs <棚> で、その棚の画像(public/img/<棚>/NNN.webp)の分を全部作り直す
  const shelf = process.argv[2];
  if (!shelf) { console.error("棚の名前を渡してください(例: node lib/hero.mjs yonkoma)"); process.exit(1); }
  const dir = path.join(path.resolve(process.env.FUTON || "futon"), "public/img", shelf);
  for (const f of (await fs.readdir(dir)).filter((f) => /^\d{3}\.webp$/.test(f))) {
    const out = path.join(dir, f.replace(".webp", "_hero.webp"));
    try { await yonkomaHero(path.join(dir, f), out); console.log("ok", f); } catch (e) { console.log("skip", f, e.message); }
  }
}
