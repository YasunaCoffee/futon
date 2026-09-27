# receipt

futon についてくるテーマ。感熱紙のレシート。新着は領収証の品目と合計、キャラは会員情報、本はお買い上げ品、下にバーコードとお客様控え。
紹介の絵(`intro.image`)かマスコット、なければ1人目のキャラの絵を、紙の上に落書きのように重ねる。404 は「取消」。
`site.json` に `"theme": "receipt"` と書くと着られる。

書くと出る欄は techou と同じ(`hello`・`since`・`intro`・`characters`・棚の `cast`・`books`・`tech`)。
全部を使った例が futon の `samples/showcase/`(`node tools/try.mjs receipt` で試着できる)。

文字は当時に寄せている:レジの印字の等幅ゴシック(MS ゴシック、なければ Kosugi)。店名は Dela Gothic One。
