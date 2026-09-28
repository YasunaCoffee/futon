// futon のエンジン(Astro)の設定。futon コマンドから root をこのフォルダにして動かす。
// 中身のフォルダは環境変数 FUTON(futon コマンドが絶対パスで渡す)。画像などはその中の public/ から出す
import { defineConfig } from "astro/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const FUTON = path.resolve(process.env.FUTON || "futon");
const site = JSON.parse(fs.readFileSync(path.join(FUTON, "site.json"), "utf8"));

// テーマ:site.json の "theme" に、パッケージ名か、ふとんからの相対パス("./themes/mine" など)を書く。
// 書かなければ heisei(futon の標準)。テーマはページの見た目(Base・Home・ShelfIndex・Episode・
// TechIndex・TechPost・About・Privacy・NotFound の .astro)を全部持つ。エンジンの部品は @futon/… で読む
function resolveTheme(name) {
  // futon についてくるテーマ(themes/<名前>)は名前だけで着られる:"heisei"(標準)・"plain"
  const builtin = path.join(ENGINE, "..", "themes", name || "heisei");
  if (!name || (/^[a-z0-9-]+$/.test(name) && fs.existsSync(path.join(builtin, "Base.astro")))) return builtin;
  if (name.startsWith(".") || path.isAbsolute(name)) return path.resolve(FUTON, name);
  return path.dirname(createRequire(path.join(FUTON, "_")).resolve(`${name}/package.json`));
}
// FUTON_THEME=<テーマ> で、そのときだけ着せ替えて見られる(site.json は変えない)
const THEME_SRC = resolveTheme(process.env.FUTON_THEME || site.theme);

// テーマと追加ページは、エンジンの中(.work/)に写してから使う。
// Astro は、プロジェクトの外にある .astro の <script> をうまく組み立てられないため
// (ふとんやテーマがどこに置かれていても同じように建つようにする)
const WORK = path.join(ENGINE, ".work");
const stage = (src, name) => {
  const dest = path.join(WORK, name);
  fs.rmSync(dest, { recursive: true, force: true });
  // テーマの中の node_modules は写さない(futon 自体が node_modules の中にあっても、テーマは写す)
  if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true, filter: (f) => !path.relative(src, f).split(path.sep).includes("node_modules") });
  return dest;
};
const THEME = stage(THEME_SRC, "theme");
// テーマに GroupIndex.astro(グループのページ)が無ければ、エンジンの標準のものを使う
if (!fs.existsSync(path.join(THEME, "GroupIndex.astro"))) fs.copyFileSync(path.join(ENGINE, "src/fallback/GroupIndex.astro"), path.join(THEME, "GroupIndex.astro"));
const PAGES = stage(path.join(FUTON, "pages"), "pages");
// 技術記事(ふとんの tech/ に md があるときだけ /tech/ を出す)
const hasTech = fs.existsSync(path.join(FUTON, "tech")) && fs.readdirSync(path.join(FUTON, "tech")).some((f) => f.endsWith(".md"));

// 追加ページ:site.json の extraPages に { "<URL>": "<名前>" } と書くと、
// 中身のフォルダの pages/<名前>.astro を /<URL>/ に出す。
// 追加ページからエンジンの部品は "@futon/layouts/Base.astro" のように読む
const extraPages = {
  name: "futon-extra-pages",
  hooks: {
    "astro:config:setup": ({ injectRoute }) => {
      if (hasTech) {
        injectRoute({ pattern: "/tech", entrypoint: path.join(ENGINE, "src/routes/tech/index.astro") });
        injectRoute({ pattern: "/tech/[slug]", entrypoint: path.join(ENGINE, "src/routes/tech/[slug].astro") });
      }
      for (const [pattern, name] of Object.entries(site.extraPages ?? {}))
        injectRoute({ pattern: `/${pattern}`, entrypoint: path.join(PAGES, `${name}.astro`) });
    },
  },
};

// 公開先が決まったら site.json に url を入れる(RSSとOGPの絶対URLに使う)
export default defineConfig({
  site: site.url,
  // サブフォルダに置くとき(例:/heisei/)は FUTON_BASE で渡す。リンクは全部 url() を通すので付いてくる
  base: process.env.FUTON_BASE || "/",
  trailingSlash: "always",
  publicDir: path.join(FUTON, "public"),
  integrations: [extraPages],
  vite: {
    resolve: { alias: { "@futon": path.join(ENGINE, "src"), "@theme": THEME } },
    server: { fs: { allow: [ENGINE, FUTON, THEME] } },
  },
});
