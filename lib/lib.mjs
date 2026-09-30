// 話を1本ずつサイトに取り込む道具。画像はCDNから取ってwebpにしてリポジトリに置く
// (CDNのリンクは失効することがあるので、サイトは手元の画像だけを見る)
// どのシリーズがどの形(sheets / single)かは src/lib/series.ts の一覧表で決まる。
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { yonkomaHero } from "./hero.mjs";
import { seriesByKey } from "../engine/src/lib/series.ts";

// 画像の取り先:ふとんの site.json の imageBase(例 "https://…/")。id を足して `${imageBase}${id}.png` を取る
const imageBase = () => {
  const site = JSON.parse(fsSync.readFileSync(futonPath("site.json"), "utf8"));
  if (!site.imageBase) throw new Error("画像の取り先がありません。ふとんの site.json に imageBase を書いてください");
  return site.imageBase.endsWith("/") ? site.imageBase : site.imageBase + "/";
};
// futon パッケージの場所
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
// 中身のフォルダ(src/lib/futon.ts と同じ決め方。FUTON=<フォルダ> で差し替えられる)
export { FUTON } from "../engine/src/lib/futon.ts";
import { FUTON, futonPath } from "../engine/src/lib/futon.ts";

async function fetchWebp(id, out, width) {
  const dest = futonPath("public", out);
  try { await fs.access(dest); return out; } catch {}
  const res = await fetch(imageBase() + id + ".png");
  if (!res.ok) throw new Error(`画像を取れませんでした ${id} (${res.status})`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await sharp(Buffer.from(await res.arrayBuffer())).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(dest);
  return out;
}

async function smallCopy(src, out, width) {
  const dest = futonPath("public", out);
  try { await fs.access(dest); return out; } catch {}
  await sharp(futonPath("public", src)).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
  return out;
}

export const pad = (n) => String(n).padStart(3, "0");
const q = (v) => JSON.stringify(v);

async function writeMd(key, num, fm) {
  const lines = Object.entries(fm).filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => typeof v === "object" ? `${k}:\n${Object.entries(v).map(([a, b]) => `  ${a}: ${q(b)}`).join("\n")}` : `${k}: ${q(v)}`);
  const file = futonPath(key, `${pad(num)}.md`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `---\n${lines.join("\n")}\n---\n`);
  return file;
}

// 形ごとの足し方。need は add.mjs で必ず渡す項目
export const formats = {
  // 画像を何枚か並べる形:右列・左列・札の3枚(ids の順)
  sheets: {
    need: ["num", "kanji", "title", "date", "type", "kessho", "source", "ids"],
    async add(key, e) {
      const dir = `img/${key}/${pad(e.num)}`;
      const images = {
        right: await fetchWebp(e.ids[0], `${dir}/right.webp`, 720),
        left: await fetchWebp(e.ids[1], `${dir}/left.webp`, 720),
        card: await fetchWebp(e.ids[2], `${dir}/card.webp`, 540),
      };
      // 一覧やトピックで小さく出す用(右列を幅360に縮める)。shelves.yaml から {images.thumb} で使える
      images.thumb = await smallCopy(images.right, `${dir}/thumb.webp`, 360);
      return writeMd(key, e.num, { num: e.num, kanji: e.kanji, title: e.title, date: e.date, type: e.type,
        kessho: e.kessho, source: e.source, images, x: e.x, hidden: e.hidden, hiddenReason: e.hiddenReason });
    },
  },
  // 1枚で読む形。シリーズに hero があれば、トップの大きな1コマも作る
  single: {
    need: ["num", "title", "date", "cite", "lett", "id"],
    async add(key, e) {
      const image = await fetchWebp(e.id, `img/${key}/${pad(e.num)}.webp`, 900);
      const thumb = await fetchWebp(e.id, `img/${key}/${pad(e.num)}_s.webp`, 420);
      if (seriesByKey[key].hero) {
        const hero = futonPath("public", `img/${key}/${pad(e.num)}_hero.webp`);
        await yonkomaHero(futonPath("public", image), hero).catch((err) => console.warn("大きな1コマを作れませんでした:", err.message));
      }
      return writeMd(key, e.num, { num: e.num, title: e.title, date: e.date, cite: e.cite, lett: e.lett,
        kind: e.kind, image, thumb, x: e.x, hidden: e.hidden, hiddenReason: e.hiddenReason });
    },
  },
};

export function formatOf(key) {
  const s = seriesByKey[key];
  if (!s) throw new Error(`シリーズ ${key} は src/lib/series.ts にありません`);
  return formats[s.format];
}

// どのシリーズでも:1話足す
export const addEpisode = (key, e) => formatOf(key).add(key, e);
