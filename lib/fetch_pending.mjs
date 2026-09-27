// sync/pending.json に積まれた回を、画像を CDN から取って足す(GitHub Actions の fetch-images から流す)。
// 足せた回は一覧から消える。全部足せたらファイルごと消す。
import fs from "node:fs/promises";
import path from "node:path";
import { addEpisode } from "./lib.mjs";

const PENDING = path.join(process.cwd(), "sync/pending.json");
const list = JSON.parse(await fs.readFile(PENDING, "utf8").catch(() => "[]"));
const left = [];
for (const x of list) {
  try {
    await addEpisode(x.series, x.args);
    console.log("足しました:", x.label);
  } catch (err) {
    console.error("足せませんでした:", x.label, err.message);
    left.push(x);
  }
}
if (left.length) await fs.writeFile(PENDING, JSON.stringify(left, null, 2) + "\n");
else await fs.rm(PENDING, { force: true });
if (left.length) process.exitCode = 1;
