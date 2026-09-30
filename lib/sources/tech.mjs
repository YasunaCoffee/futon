// 技術記事:Lume(Simple Blog テーマ)のブログのリポジトリから取り込む。 --tech <ブログのリポジトリ>
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

export const flag = "tech";
export const series = "tech";
export const help = "--tech <Lume のブログのリポジトリ>";

export async function sync(ctx, src) {
  if (ctx.DRY) { ctx.report.notes.push(`テック記事: ${src} から取り込む(--dry なので流していない)`); return; }
  const out = execFileSync("python3", [path.join(ctx.ROOT, "lib/import_tech.py"), src], { encoding: "utf8", env: { ...process.env, FUTON: ctx.FUTON } });
  ctx.report.notes.push("テック記事: " + out.trim());
  // サムネは一覧で小さく出すだけなので、幅 480 の webp にして軽くする(元の png は消す)
  const dir = path.join(ctx.FUTON, "public/img/tech/thumbs");
  let n = 0;
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!f.endsWith(".png")) continue;
    const png = path.join(dir, f);
    await sharp(png).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 80 }).toFile(png.replace(/\.png$/, ".webp"));
    fs.rmSync(png);
    n++;
  }
  if (n) ctx.report.notes.push(`テック記事: サムネ ${n} 枚を webp にしました`);
}
