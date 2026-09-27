# futon で作業するとき

中身のフォルダ(ふとん)を敷いておくと、寝ている間に自分のホームページが整う個人サイトエンジン。使い方は README.md(英語)と README.ja.md(日本語)。

- **エンジンに特定のサイトの中身を入れない。** 名前・文言・シリーズ・取り込み口など、サイト固有のものは利用者のふとん(`site.json`・`shelves.yaml`・`sources/`・`pages/`)に置く
- **エンジンに見た目を入れない。** 見た目はテーマ(標準は `themes/heisei/`、飾りなしは `themes/plain/`)。エンジンの `engine/src/pages/` は、どのテーマ部品を出すかを書いた薄いページだけにする
- 変えたら確かめる:雛形が標準テーマで建つこと、ついてくるテーマが全部見本で建つこと(`node tools/try.mjs`。どちらも `.github/workflows/check.yml` と同じ)。すでに futon を使っているサイトがあるなら、そのサイトで変える前と後の `futon build` の結果を比べて、意図しない差がないこと
- 利用者向けの言葉はふとんの世界観でそろえる(敷く=init/入る=dev/干す=build/寝かしつけ=sync)
- futon の顔は文字だけのロゴ(`docs/images/logo.png`、MIT)。キャラクターは顔にしない
- README の説明画像は heisei テーマの見た目(水色の水玉・青い枠・アクアの見出し帯・ピンクのリボン、字は Mochiy Pop P One・Kosugi・DotGothic16)でそろえる
- README は英語(`README.md`、表の顔)と日本語(`README.ja.md`)の2つ。片方を直したら、もう片方も同じ変更の中で直す。画像も英語版(`docs/images/en/`)と日本語版(`docs/images/`)の2組
- テーマに出す言葉は `tr("日本語")` で包み、英語を `engine/src/lib/i18n/en.json` に足す(`node tools/try.mjs` が足りない訳を知らせる)
- 売りは「AIフレンドリー」。中身の形(md・json・shelves.yaml)を変えたら、雛形の `starter/AGENTS.md` の手順も同じ変更の中で直す

## npm に出す

- `@yasuna/futon`(本体)と `create-futon`(`create/`)の2つ。版は両方の package.json で上げる
- 出すのは Actions の `publish`(手で流す。シークレット `NPM_TOKEN` が要る)。手元から `npm publish` しない
- 入れた形で動くかは check の `package` ジョブが見る(npm pack → create-futon → 干す)。
  エンジンが node_modules の中にあることを忘れない(パスに node_modules を含むかで判断しない)
