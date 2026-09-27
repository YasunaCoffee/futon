#!/usr/bin/env node
// futon:中身のフォルダ(ふとん)を敷いておくと、寝ている間に自分のホームページが整う。
//
//   futon init [フォルダ]          ふとんを敷く(雛形を置く。既定は ./futon)
//   futon dev [フォルダ]           ふとんに入る(手元でプレビュー)
//   futon build [フォルダ]         ふとんを干す(dist/ に書き出す)
//   futon preview                  干したものを見る
//   futon sync [--各取り込み口]     寝かしつけ(元データから最新にする。--dry で確認だけ)
//   futon add <棚> --num … …       1話足す
//   futon fetch-pending            画像を取れなかった回(sync/pending.json)を足す
//
// フォルダは引数か環境変数 FUTON で渡す。どちらもなければ ./futon。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// プロキシのある環境では、fetch がプロキシを通るように自分を起こし直す
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1", NODE_NO_WARNINGS: "1" } });
  process.exit(r.status ?? 1);
}

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE = path.join(PKG, "engine");
const [cmd, ...rest] = process.argv.slice(2);
const positional = rest[0] && !rest[0].startsWith("--") ? rest[0] : undefined;
const setFuton = (dir) => {
  process.env.FUTON = path.resolve(dir ?? process.env.FUTON ?? "futon");
  if (!fs.existsSync(path.join(process.env.FUTON, "site.json"))) {
    console.error(`ふとんが見つかりません: ${process.env.FUTON}/site.json\n  futon init で敷いてください`);
    process.exit(1);
  }
};

switch (cmd) {
  case "init": {
    const dest = path.resolve(positional ?? "futon");
    if (fs.existsSync(dest) && fs.readdirSync(dest).length) { console.error(`${dest} はもう空ではありません`); process.exit(1); }
    fs.cpSync(path.join(PKG, "starter"), dest, { recursive: true });
    console.log(`ふとんを敷きました: ${dest}\n  site.json と shelves.yaml を書き換えて、futon dev ${path.relative(process.cwd(), dest) || "."} で見られます`);
    break;
  }
  case "dev":
  case "build":
  case "preview": {
    setFuton(positional);
    const astro = await import("astro");
    const outDir = path.resolve(process.env.FUTON_OUT ?? "dist");
    // Astro はビルドの途中の部品を書き出し先に置いて、そこから自分の依存を読む。
    // 書き出し先がエンジンの外だと依存が見つからないので、エンジンの中で組んでから写す
    const work = path.join(ENGINE, ".out");
    // Astro は作業場所(cwd)にも中間の部品を置くので、エンジンの中に移ってから動かす
    process.chdir(ENGINE);
    const config = { root: ENGINE, outDir: cmd === "dev" ? outDir : work, logLevel: process.env.FUTON_QUIET ? "warn" : "info" };
    if (cmd === "build") {
      await astro.build(config);
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.cpSync(work, outDir, { recursive: true });
      console.log(`ふとんを干しました: ${outDir}`);
    } else if (cmd === "preview") await astro.preview(config);
    else await astro.dev(config);
    break;
  }
  case "sync":
  case "add":
  case "fetch-pending": {
    setFuton(process.env.FUTON);
    const script = { sync: "sync.mjs", add: "add.mjs", "fetch-pending": "fetch_pending.mjs" }[cmd];
    process.argv = [process.argv[0], path.join(PKG, "lib", script), ...rest];
    await import(path.join(PKG, "lib", script));
    break;
  }
  default:
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n"));
    process.exit(cmd ? 1 : 0);
}
