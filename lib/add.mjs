// 1話足す。棚と形はふとんの shelves.yaml で決まる。画像はid(CDNの画像名)で渡す。
//   形 sheets:futon add <棚> --num 19 --kanji 十九 --title "…" --date 2026-10-03 --type B \
//                --kessho "一行目／二行目" --source "…" --ids <右列id> <左列id> <札id>
//   形 single:futon add <棚> --num 3 --title "…" --date 2026-09-26 --cite "…" --lett "…" --id <画像id>
// --x <XのポストURL> をつけると、話のページにそのポストを埋め込む(あとから md に x: を足してもよい)
// 日付は公開日。未来の日付にしておくと、その日のビルドまでサイトに出ない(予約配信)。
import { addEpisode, formatOf } from "./lib.mjs";

const [key, ...rest] = process.argv.slice(2);
const a = {};
for (let i = 0; i < rest.length; i++) {
  const k = rest[i].replace(/^--/, "");
  if (k === "ids") { a.ids = rest.slice(i + 1, i + 4); i += 3; }
  else { a[k] = rest[i + 1]; i++; }
}
a.num = Number(a.num);
let fmt;
try { fmt = formatOf(key); } catch (err) { console.error(err.message); process.exit(1); }
const miss = fmt.need.filter((k) => !a[k]);
if (miss.length) { console.error("足りない項目: " + miss.join(", ")); process.exit(1); }
console.log("追加しました:", await addEpisode(key, a));
