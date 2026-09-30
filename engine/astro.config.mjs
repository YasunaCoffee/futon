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

const BASE = (process.env.FUTON_BASE || "/").replace(/\/?$/, "/"); // サブフォルダに置くときの頭(/ か /heisei/ など)

// sitemap.xml:site.json に url があって noindex でないときだけ、干したページを全部並べて書き出す
// (404 は入れない)。検索エンジンに robots.txt の Sitemap: 行で教えると見つけてもらいやすい
const sitemap = {
  name: "futon-sitemap",
  hooks: {
    "astro:build:done": ({ dir, pages }) => {
      if (!site.url || site.noindex) return;
      const esc = (u) => u.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const urls = pages.map((p) => p.pathname).filter((p) => !/^404\/?$/.test(p))
        .map((p) => new URL(BASE.slice(1) + p, site.url.replace(/\/?$/, "/")).href).sort();
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n")}\n</urlset>\n`;
      fs.writeFileSync(new URL("sitemap.xml", dir), xml);
    },
  },
};

// robots.txt:ふとんの public/ に自分の robots.txt が無ければ、標準のものを書き出す。
// AI の学習・収集用クローラーは断り、AI 検索(リンクで紹介するもの)とふつうの検索は通す。
// 従量課金のサーバーだとクローラーの転送量がそのまま請求になるので、公開した日から効かせておく。
// 全部通したいときは site.json に "aiCrawlers": "allow"
const AI_TRAINING = ["GPTBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider",
  "meta-externalagent", "FacebookBot", "Amazonbot", "cohere-ai", "cohere-training-data-crawler", "Diffbot", "Timpibot",
  "omgili", "omgilibot", "ImagesiftBot", "AI2Bot", "Ai2Bot-Dolma", "img2dataset"];
const AI_SEARCH = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User",
  "DuckAssistBot", "MistralAI-User", "YouBot"];
const robots = {
  name: "futon-robots",
  hooks: {
    "astro:build:done": ({ dir }) => {
      if (fs.existsSync(path.join(FUTON, "public", "robots.txt"))) return;
      const ua = (list) => list.map((n) => `User-agent: ${n}`).join("\n");
      const parts = ["# futon が書き出した robots.txt(ふとんの public/robots.txt を置くとそちらが使われる)"];
      if (site.aiCrawlers !== "allow")
        parts.push(`# AI の学習・収集用:お断り\n${ua(AI_TRAINING)}\nDisallow: /`, `# AI 検索(リンクで紹介するもの):歓迎\n${ua(AI_SEARCH)}\nAllow: /`);
      parts.push("# ふつうの検索エンジンなど\nUser-agent: *\nAllow: /");
      if (site.url && !site.noindex) parts.push(`Sitemap: ${new URL(BASE.slice(1) + "sitemap.xml", site.url.replace(/\/?$/, "/")).href}`);
      fs.writeFileSync(new URL("robots.txt", dir), parts.join("\n\n") + "\n");
    },
  },
};

// 公開先が決まったら site.json に url を入れる(RSSとOGPの絶対URL、sitemap.xml に使う)
export default defineConfig({
  site: site.url,
  // サブフォルダに置くとき(例:/heisei/)は FUTON_BASE で渡す。リンクは全部 url() を通すので付いてくる
  base: process.env.FUTON_BASE || "/",
  trailingSlash: "always",
  publicDir: path.join(FUTON, "public"),
  integrations: [extraPages, sitemap, robots],
  vite: {
    resolve: { alias: { "@futon": path.join(ENGINE, "src"), "@theme": THEME } },
    server: { fs: { allow: [ENGINE, FUTON, THEME] } },
  },
});
