"""Lume(Simple Blog テーマ)のブログの記事を、ふとんの tech/ に取り込む。何度流しても同じ結果になる。

    futon sync --tech <ブログのリポジトリ>   (中では python3 lib/import_tech.py <ブログのリポジトリ>)

- 記事: src/posts/*.md → futon/tech/<slug>.md
- 画像・音声・サムネ: futon/public/img/tech/ futon/public/audio/tech/ futon/public/img/tech/thumbs/
- 中身のフォルダは環境変数 FUTON で差し替えられる(既定は futon)
- 本文のパスを書き換える:/img/ → /img/tech/、/audio/ → /audio/tech/、/posts/<slug>/ → /tech/<slug>/
- ```linkcard ブロックは linkcards.cache.json を使って、静的なカードのHTMLにする
"""
import html, json, os, re, shutil, sys

if len(sys.argv) < 2:
    sys.exit("ブログのリポジトリの場所を渡してください")
SRC = os.path.expanduser(sys.argv[1])
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUTON = os.path.abspath(os.environ.get("FUTON") or os.path.join(os.getcwd(), "futon"))
OUT = os.path.join(FUTON, "tech")

cache = json.load(open(os.path.join(SRC, "linkcards.cache.json")))


def card(url):
    c = cache.get(url, {"url": url})
    title = html.escape(c.get("title") or url)
    desc = html.escape((c.get("description") or "")[:90])
    site = html.escape(c.get("siteName") or re.sub(r"^https?://([^/]+).*", r"\1", url))
    img = f'<img src="{html.escape(c["image"])}" alt="" loading="lazy">' if c.get("image") else ""
    return (f'<a class="lcard" href="{html.escape(url)}" target="_blank" rel="noopener">{img}'
            f'<span><b>{title}</b><small>{desc}</small><em>{site}</em></span></a>')


def linkcards(m):
    urls = [u.strip() for u in m.group(1).splitlines() if u.strip()]
    return '<div class="lcards">' + "".join(card(u) for u in urls) + "</div>"


def convert(body):
    body = re.sub(r"```linkcard\n(.*?)```", linkcards, body, flags=re.S)
    body = re.sub(r"(\]\(|src=\"|href=\")/img/", r"\1/img/tech/", body)
    body = re.sub(r"(\]\(|src=\"|href=\")/audio/", r"\1/audio/tech/", body)
    body = re.sub(r"(\]\(|href=\")/posts/", r"\1/tech/", body)
    return body


def copytree(a, b):
    if os.path.isdir(a):
        shutil.copytree(a, b, dirs_exist_ok=True)


os.makedirs(OUT, exist_ok=True)
n = 0
for f in sorted(os.listdir(os.path.join(SRC, "src/posts"))):
    if not f.endswith(".md"):
        continue
    text = open(os.path.join(SRC, "src/posts", f), encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n(.*)", text, re.S)
    fm, body = m.group(1), m.group(2)
    if re.search(r"^draft:\s*true", fm, re.M):
        continue
    open(os.path.join(OUT, f), "w", encoding="utf-8").write(f"---\n{fm}\n---\n{convert(body)}")
    n += 1

copytree(os.path.join(SRC, "src/public/img"), os.path.join(FUTON, "public/img/tech"))
copytree(os.path.join(SRC, "src/public/audio"), os.path.join(FUTON, "public/audio/tech"))
copytree(os.path.join(SRC, "src/thumbnails"), os.path.join(FUTON, "public/img/tech/thumbs"))
print(f"{n} 本を取り込みました")
