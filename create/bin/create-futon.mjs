#!/usr/bin/env node
// npm create futon [フォルダ] [-- --theme heisei]
// フォルダを作って、ふとん(雛形)と package.json を置く。あとは npm install して npm run dev
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const name = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--"))) ?? "my-futon";
const theme = flag("--theme");
const dest = path.resolve(name);
if (fs.existsSync(dest) && fs.readdirSync(dest).length) { console.error(`${dest} はもう空ではありません`); process.exit(1); }

const require = createRequire(import.meta.url);
const pkgDir = path.dirname(require.resolve("@yasuna/futon/package.json"));
const { version } = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(path.join(pkgDir, "starter"), path.join(dest, "futon"), { recursive: true });
if (theme) {
  const f = path.join(dest, "futon", "site.json");
  const site = JSON.parse(fs.readFileSync(f, "utf8"));
  fs.writeFileSync(f, JSON.stringify({ ...site, theme }, null, 2) + "\n");
}
fs.writeFileSync(path.join(dest, "package.json"), JSON.stringify({
  name: path.basename(dest).toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "my-futon",
  private: true,
  type: "module",
  scripts: { dev: "futon dev", build: "futon build", preview: "futon preview", sync: "futon sync" },
  dependencies: { "@yasuna/futon": `^${version}` },
}, null, 2) + "\n");
fs.writeFileSync(path.join(dest, ".gitignore"), "node_modules/\ndist/\n");
// AI に頼むときの案内。中身の説明は futon/AGENTS.md にある
fs.writeFileSync(path.join(dest, "AGENTS.md"), "# このサイトで AI がやること\n\n中身はぜんぶ `futon/` にある。頼まれごとの手順は `futon/AGENTS.md` を読むこと。\n");
fs.writeFileSync(path.join(dest, "CLAUDE.md"), "@futon/AGENTS.md\n");

const rel = path.relative(process.cwd(), dest) || ".";
console.log(`ふとんを敷きました: ${dest}

  cd ${rel}
  npm install
  npm run dev      … 手元で見る
  npm run build    … dist/ に書き出す

中身は futon/ の中(site.json・shelves.yaml・話の md と画像)。
AI に頼むなら「1話足して」のように話しかければいい(手順は futon/AGENTS.md)。
見た目は futon/site.json の "theme"(plain / heisei / techou / kaomoji / vhs / keitai / mado / receipt)。`);
