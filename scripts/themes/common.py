"""Tema etiketleri: ortak yardımcılar (taksonomi yükleme/doğrulama, normalize, DB şeması).

Sözleşme: docs/denetim/tema-sozlesme.md
Yalnız Python 3.12 stdlib.
"""
from __future__ import annotations

import json
import re
import shutil
import sqlite3
import sys
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_DB = REPO / "data" / "app.db"
DEFAULT_OUT_DB = REPO / "data" / "app.themes.db"
REAL_TAXONOMY = REPO / "content" / "themes" / "taxonomy.json"
PLACEHOLDER_TAXONOMY = REPO / "content" / "themes" / "taxonomy.placeholder.json"

L1_RE = re.compile(r"^[A-G][0-9]_[A-Z_]+$")
L2_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
CURATED_PREFIXES = ("namaz-", "korunma-", "ismiazam-", "dua-")


def default_taxonomy_path() -> Path:
    return REAL_TAXONOMY if REAL_TAXONOMY.exists() else PLACEHOLDER_TAXONOMY


def stdout_utf8() -> None:
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


# ---------------------------------------------------------------- normalize
_TR_MAP = str.maketrans({"ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
                         "ç": "c", "Ç": "c", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u"})


def ascii_fold(s: str) -> str:
    s = s.translate(_TR_MAP)
    s = unicodedata.normalize("NFKD", s)
    return "".join(ch for ch in s if not unicodedata.combining(ch)).encode("ascii", "ignore").decode()


def normalize_l2(tag: str) -> str:
    """Ham alt etiket -> aday ASCII level2 kodu ('Allah'ın_gücü' -> 'allahin-gucu')."""
    s = ascii_fold(tag.strip().lower())
    s = re.sub(r"['’`]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def normalize_l1(code: str) -> str:
    s = ascii_fold(code.strip()).upper()
    return re.sub(r"[^A-Z0-9_]", "", s)


def is_curated(tag: str) -> bool:
    return tag.startswith(CURATED_PREFIXES)


def dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


# ---------------------------------------------------------------- taxonomy
class Taxonomy:
    def __init__(self, data: dict, path: Path | None = None):
        self.data = data
        self.path = path
        self.groups = data.get("groups", [])
        self.level1 = data.get("level1", [])
        self.level2 = data.get("level2", [])
        mig = data.get("migration") or {}
        self.mig1: dict = mig.get("level1") or {}
        self.mig2: dict = mig.get("level2") or {}
        self.l1 = {x["code"]: x for x in self.level1}
        self.l2 = {x["code"]: x for x in self.level2}

    @property
    def is_placeholder(self) -> bool:
        return "_placeholder" in self.data

    def title(self, code: str | None, lang: str = "tr") -> str:
        if code is None:
            return ""
        e = self.l1.get(code) or self.l2.get(code)
        if e and e.get(lang):
            return e[lang]
        return code.replace("_", " ").replace("-", " ")

    def is_sensitive(self, code: str | None) -> bool:
        e = self.l1.get(code) or self.l2.get(code) if code else None
        return bool(e and e.get("sensitive"))

    def map_l1(self, code: str | None) -> tuple[str | None, str]:
        """-> (yeni kod | None, neden: keep|migrated|normalized|dropped|unknown|empty)"""
        if code is None or code == "":
            return None, "empty"
        if code in self.mig1:
            new = self.mig1[code]
            return (new, "migrated") if new is None or new in self.l1 else (None, "unknown")
        if code in self.l1:
            return code, "keep"
        n = normalize_l1(code)
        if n in self.mig1:
            new = self.mig1[n]
            return (new, "migrated") if new is None or new in self.l1 else (None, "unknown")
        if n in self.l1:
            return n, "normalized"
        return None, "unknown"

    def map_l2(self, tag: str) -> tuple[str | None, str]:
        """-> (yeni kod | None, neden: keep|migrated|normalized|dropped|curated|unknown)

        Kürasyonlu (namaz-/korunma-/ismiazam-/dua-) etiketler taksonomide yoksa bile
        (migration ile başka koda eşlenmedikçe) aynen korunur -> 'curated'.
        """
        if tag in self.mig2:
            new = self.mig2[tag]
            return (None, "dropped") if new is None else (new, "migrated")
        if tag in self.l2:
            return tag, "keep"
        n = normalize_l2(tag)
        if n in self.mig2:
            new = self.mig2[n]
            return (None, "dropped") if new is None else (new, "migrated")
        if n in self.l2:
            return n, "normalized"
        if is_curated(tag):
            return tag, "curated"
        return None, "unknown"

    def sha(self) -> str:
        import hashlib
        return hashlib.sha256(json.dumps(self.data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]


def load_taxonomy(path: Path | str | None = None) -> Taxonomy:
    p = Path(path) if path else default_taxonomy_path()
    with open(p, encoding="utf-8") as f:
        return Taxonomy(json.load(f), p)


def validate_taxonomy(tax: Taxonomy, db_tags: set[str] | None = None) -> tuple[list[str], list[str]]:
    """Sözleşme kuralları. -> (errors, warnings). db_tags: DB'deki tüm alt etiketler (kürasyon kontrolü)."""
    err: list[str] = []
    warn: list[str] = []
    gcodes = [g.get("code") for g in tax.groups]
    if len(gcodes) != len(set(gcodes)):
        err.append("groups: tekrar eden kod")
    for g in tax.groups:
        for k in ("code", "tr", "en"):
            if not g.get(k):
                err.append(f"group {g.get('code')}: '{k}' eksik")

    seen: set[str] = set()
    for e in tax.level1:
        c = e.get("code", "")
        if not L1_RE.match(c):
            err.append(f"level1 kod biçimi geçersiz: {c!r}")
        if c in seen:
            err.append(f"level1 tekrar: {c}")
        seen.add(c)
        if e.get("group") not in gcodes:
            err.append(f"level1 {c}: grup yok ({e.get('group')!r})")
        elif c[:1] != e["group"]:
            warn.append(f"level1 {c}: kod harfi grup ({e['group']}) ile uyuşmuyor")
        for k in ("tr", "en"):
            if not e.get(k):
                err.append(f"level1 {c}: '{k}' eksik")
        if not e.get("descTr"):
            warn.append(f"level1 {c}: descTr boş")
        if not isinstance(e.get("sensitive"), bool):
            err.append(f"level1 {c}: 'sensitive' bool olmalı")
    for e in tax.level2:
        c = e.get("code", "")
        if not L2_RE.match(c):
            err.append(f"level2 kod biçimi geçersiz: {c!r}")
        if c in seen:
            err.append(f"level2 tekrar (veya level1 ile çakışma): {c}")
        seen.add(c)
        parents = e.get("parents") or []
        if not parents:
            err.append(f"level2 {c}: parents boş")
        for p in parents:
            if p not in tax.l1:
                err.append(f"level2 {c}: parent yok: {p}")
        for k in ("tr", "en"):
            if not e.get(k):
                err.append(f"level2 {c}: '{k}' eksik")
        if not isinstance(e.get("sensitive"), bool):
            err.append(f"level2 {c}: 'sensitive' bool olmalı")

    for old, new in tax.mig1.items():
        if new is not None and new not in tax.l1:
            err.append(f"migration.level1 {old!r} -> {new!r}: hedef level1'de yok")
    for old, new in tax.mig2.items():
        if new is not None and new not in tax.l2:
            err.append(f"migration.level2 {old!r} -> {new!r}: hedef level2'de yok")

    if db_tags is not None:
        missing = sorted(t for t in db_tags if is_curated(t) and tax.map_l2(t)[1] == "curated")
        if missing:
            err.append(f"kürasyonlu {len(missing)} kod taksonomide yok/eşlenmemiş: "
                       + ", ".join(missing[:15]) + (" ..." if len(missing) > 15 else ""))
    return err, warn


def check_or_exit(tax: Taxonomy, db_tags: set[str] | None, lenient: bool) -> None:
    err, warn = validate_taxonomy(tax, db_tags)
    for w in warn[:10]:
        print(f"  uyarı: {w}")
    if len(warn) > 10:
        print(f"  ... +{len(warn) - 10} uyarı")
    for e in err:
        print(f"  {'UYARI(lenient)' if lenient else 'HATA'}: {e}")
    if err and not lenient:
        sys.exit("Taksonomi doğrulaması başarısız (--lenient ile devam edilebilir).")


# ---------------------------------------------------------------- DB
def open_ro(path: Path | str):
    """Salt-okunur bağlantı; `with` bloğu sonunda kapanır."""
    from contextlib import closing
    p = Path(path).resolve()
    if not p.exists():
        sys.exit(f"DB yok: {p}")
    return closing(sqlite3.connect(f"file:{p.as_posix()}?mode=ro", uri=True))


def prepare_output_db(src: Path, out: Path | None, in_place: bool, force: bool,
                      reuse_existing: bool = False) -> Path:
    """Çıktı DB yolunu hazırlar. Kaynağa asla yazmaz (in_place hariç)."""
    src = Path(src).resolve()
    if in_place:
        return src
    out = Path(out or DEFAULT_OUT_DB).resolve()
    if out == src:
        sys.exit("Çıktı DB kaynakla aynı; yerinde yazmak için --in-place verin.")
    if out.exists():
        if reuse_existing:
            return out
        if not force:
            sys.exit(f"Çıktı DB zaten var: {out} (--force ile üzerine yazılır)")
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(out.suffix + ".tmp")
    shutil.copyfile(src, tmp)
    tmp.replace(out)
    return out


def ensure_nullable_schema(conn: sqlite3.Connection) -> bool:
    """verse_tags.ana_tema NOT NULL ise tabloyu nullable olarak yeniden kurar (veri korunur).
    -> True: değişiklik yapıldı."""
    cols = conn.execute("PRAGMA table_info(verse_tags)").fetchall()
    if not cols:
        conn.execute("""CREATE TABLE verse_tags (verse_key TEXT PRIMARY KEY, ana_tema TEXT,
                        alt_taglar TEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_verse_tags_ana_tema ON verse_tags(ana_tema)")
        return True
    ana = [c for c in cols if c[1] == "ana_tema"][0]
    if not ana[3]:  # notnull=0
        return False
    idx = [r[0] for r in conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='verse_tags' AND sql IS NOT NULL")]
    conn.execute("BEGIN")
    conn.execute("ALTER TABLE verse_tags RENAME TO verse_tags__old")
    conn.execute("""CREATE TABLE verse_tags (
    verse_key TEXT PRIMARY KEY,
    ana_tema TEXT,
    alt_taglar TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)""")
    conn.execute("""INSERT INTO verse_tags (verse_key, ana_tema, alt_taglar, updated_at)
                    SELECT verse_key, ana_tema, alt_taglar, updated_at FROM verse_tags__old""")
    conn.execute("DROP TABLE verse_tags__old")
    for sql in idx:
        conn.execute(sql)
    conn.execute("COMMIT")
    return True


def parse_tags(raw) -> list[str]:
    if not raw:
        return []
    try:
        v = json.loads(raw)
    except (TypeError, ValueError):
        return []
    return [str(x) for x in v if isinstance(x, str) and x.strip()] if isinstance(v, list) else []


def load_tag_state(conn: sqlite3.Connection):
    """-> (verse_tags: {vk: (ana, [alts])}, items: {vk: {tag: (isim, aciklama)}} sıralı)"""
    vt = {}
    for vk, ana, alt in conn.execute("SELECT verse_key, ana_tema, alt_taglar FROM verse_tags"):
        vt[vk] = (ana, parse_tags(alt))
    items: dict[str, dict[str, tuple]] = {}
    for vk, tag, isim, acik in conn.execute(
            "SELECT verse_key, tag, isim, aciklama FROM verse_tag_items ORDER BY rowid"):
        d = items.setdefault(vk, {})
        if tag not in d:
            d[tag] = (isim, acik)
    return vt, items


def drift_stats(vt: dict, items: dict, tax: Taxonomy | None = None) -> dict:
    s_alt = {(k, t) for k, (_, a) in vt.items() for t in a}
    s_it = {(k, t) for k, d in items.items() for t in d}
    tags = {t for _, t in s_alt | s_it}
    st = {
        "verses": len(vt),
        "verses_null_main": sum(1 for a, _ in vt.values() if not a),
        "distinct_level1": len({a for a, _ in vt.values() if a}),
        "alt_pairs": len(s_alt),
        "item_pairs": len(s_it),
        "drift_alt_not_items": len(s_alt - s_it),
        "drift_items_not_alt": len(s_it - s_alt),
        "items_without_verse_tags_row": len(set(items) - set(vt)),
        "distinct_tags": len(tags),
        "non_ascii_or_bad_format_tags": sum(1 for t in tags if not L2_RE.match(t)),
        "curated_pairs": sum(1 for _, t in s_it | s_alt if is_curated(t)),
    }
    if tax is not None:
        st["level1_not_in_taxonomy"] = sum(1 for a, _ in vt.values() if a and a not in tax.l1)
        st["tags_not_in_taxonomy"] = sum(1 for t in tags if t not in tax.l2 and not is_curated(t))
    from collections import Counter
    c = Counter(t for _, t in s_alt | s_it)
    st["tags_lt3_verses"] = sum(1 for n in c.values() if n < 3)
    return st


def load_gemini_key() -> str | None:
    import os
    k = os.environ.get("GEMINI_API_KEY")
    if k:
        return k.strip()
    for p in (REPO / ".env.local", Path(r"C:\Projects\kuran_app\.env.local")):
        try:
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("GEMINI_API_KEY="):
                    v = line.split("=", 1)[1].strip()
                    if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
                        v = v[1:-1]
                    if v:
                        return v
        except OSError:
            continue
    return None
