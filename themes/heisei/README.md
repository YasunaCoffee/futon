# heisei(へいせい)

futon についてくるテーマ。平成のキャラクターサイト風(ドットの背景・ロゴ・タブ・ティッカー・バナー・キャラクターしょうかい・本)。
`site.json` に `"theme": "heisei"` と書くと着られる。

site.json に書くと出る欄(書かなければ出ないか、汎用の文言になる):
`logo`(ロゴのHTML)・`hello`(あいさつ)・`tickerTail`(ティッカーの最後の一言)・`banners`(右のバナー)・`since`・
`characters`(キャラクターしょうかい。`fanart.link` でガイドラインへ)・棚の `cast`(話のページに「この話に出てくる人」。話の md の `cast` で1話ずつ変えられる)・`books` と `storeButton`(`books[].characters` にキャラの `slug` を並べると、本に顔、キャラに「でてくる本」が出て行き来できる。顔は `characters[].face`、なければ立ち絵の上のほうを切り抜く)・`intro`(紹介と `dream`)・`tech`(記事の呼び方)・
about.json の `contactNote`。全部を使った例が futon の `samples/showcase/`。

文字は当時に寄せている:ロゴ・見出しは創英角ポップ体に似た Mochiy Pop P One、本文は MS Pゴシック / Osaka(なければ Kosugi)、ティッカーはドットの DotGothic16。Google Fonts から読む。
