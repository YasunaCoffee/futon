// 中身のフォルダ(futon=ふとん。中身を敷いておくと、寝ている間にサイトが整う)の場所。ここより下にサイト固有のものは置かない。
// 別の中身でサイトを建てるときは FUTON=<フォルダ> npm run build。
// futon の中身:site.json(サイトの設定)/shelves.yaml(まんがの棚)/<棚>/*.md/tech/*.md/guidelines/*.md/public/(画像など)
import fs from "node:fs";
import path from "node:path";

export const FUTON = path.resolve(process.env.FUTON || "futon");
export const futonPath = (...p: string[]) => path.join(FUTON, ...p);
// 技術記事があるか(tech/ に md がある)。ないときは /tech/ もメニューも出さない
export const hasTech = fs.existsSync(futonPath("tech")) && fs.readdirSync(futonPath("tech")).some((f) => f.endsWith(".md"));
export const readFutonJson = (name: string) => JSON.parse(fs.readFileSync(futonPath(name), "utf8"));
