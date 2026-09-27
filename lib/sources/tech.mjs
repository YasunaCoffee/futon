// 技術記事:Lume(Simple Blog テーマ)のブログのリポジトリから取り込む。 --tech <ブログのリポジトリ>
import path from "node:path";
import { execFileSync } from "node:child_process";

export const flag = "tech";
export const series = "tech";
export const help = "--tech <Lume のブログのリポジトリ>";

export async function sync(ctx, src) {
  if (ctx.DRY) { ctx.report.notes.push(`テック記事: ${src} から取り込む(--dry なので流していない)`); return; }
  const out = execFileSync("python3", [path.join(ctx.ROOT, "lib/import_tech.py"), src], { encoding: "utf8", env: { ...process.env, FUTON: ctx.FUTON } });
  ctx.report.notes.push("テック記事: " + out.trim());
}
