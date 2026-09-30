# このふとんで AI がやること

このフォルダは futon のサイトの「中身」。見た目(テーマ)とエンジンはここには無い。
ふつうの頼まれごとは、下のファイルを書き換えるだけで済む。コードは触らない。

## よくある頼まれごと

| 頼まれたこと | やること |
|---|---|
| 「1話足して」 | `<棚>/NNN.md` を1つ足す(番号は続き)。画像は `public/img/<棚>/` に置いて md から指す。書き方は同じ棚のいちばん新しい md をまねる |
| 「この回を伏せて」 | その md に `hidden: true` と `hiddenReason: 理由` を足す(消さない) |
| 「◯日に公開して」 | md の `date` をその日にする。未来の日付は、その日のビルドまで出ない |
| 「新しい連載(棚)をつくって」 | `shelves.yaml` に1件足して、`<key>/` フォルダに md を置く。書き方は `shelves.yaml` の先頭と、いまある棚をまねる |
| 「連載をまとめて」(例:「4コマ漫画」でくくる) | `shelves.yaml` に `- group: <key>` と `name`・`lead` の行を足し、まとめたい棚に `group: <key>` を書く。メニューのタブが1つになり、`/<key>/` に棚がならぶ |
| 「キャラを足して」 | `site.json` の `characters` に1件足す(`slug`・`name`・`image`・`text`、あれば顔の `face`) |
| 「本を足して」 | `site.json` の `books` に1件足す。出てくるキャラは `characters: ["slug"]` |
| 「この話に出てくる人を出して」 | 棚全体なら `shelves.yaml` の `cast: [slug]`、1話だけなら md に `cast: [slug]` |
| 「見た目を変えて」 | `site.json` の `"theme"` を書き換える(heisei(標準) / plain / techou / kaomoji / vhs / keitai / mado / receipt) |
| 「メニューにリンクを足して」(お問い合わせフォームなど) | `site.json` の `menu` に `{ "label": "おといあわせ", "href": "https://…" }` を足す |
| 「漫画を横スワイプで読めるようにして」 | `shelves.yaml` のその棚の `page` に `swipe: rtl`(右から左。左から右なら `swipe: true`)を足す。画像が2枚以上の話だけに効く |
| 「英語のサイトにして」 | `site.json` に `"lang": "en"`(テーマのメニューやボタンが英語になる)。1語だけ変えるなら `"labels": { "ホーム": "Top" }`。中身の文章はそのまま好きな言語で書く |
| 「AI のクローラーも全部通して」 | `site.json` に `"aiCrawlers": "allow"`。自分で書くなら `public/robots.txt` を置く(そちらが優先) |
| 「サイト名・紹介文を変えて」 | `site.json` の `title`・`description`・`intro` |

## 公開する前に

- `site.json` の `url` に公開するアドレスを入れる(シェアのカード画像・`sitemap.xml`・`robots.txt` に使う)。検索に出すなら `noindex` を外す
- **AI クローラー対策は公開した日から。** 干すと `robots.txt` ができて、AI の学習用クローラーは断り、AI 検索とふつうの検索は通す。
  ただし robots.txt はお願いなので、置き場所(Cloudflare など)の AI クローラーのブロックも入れる。
  転送量や実行回数で課金されるサーバーなら、予算のアラートや上限も付ける(クローラーの通信がそのまま請求になる)

## 確かめる

書き換えたら、プロジェクトの一番上で `npx futon build` が通ることを確かめる(`npm run build` でも同じ)。
手元で見るなら `npx futon dev`。

## やらないこと

- `node_modules/` の中(futon 本体)を書き換えない
- 画像を消さない・上書きしない(持ち主の作品)
- 持ち主の実際の出来事や作品の中身を、想像で書き足さない。わからないことは聞く
