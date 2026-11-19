"""Tema scriptleri birim testleri (küçük fixture SQLite; 237 MB DB kullanılmaz).

  python -m unittest scripts/themes/test_themes.py -v
"""
from __future__ import annotations

import csv
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import audit_sample  # noqa: E402
import build_bundles  # noqa: E402
import clean  # noqa: E402
import common as C  # noqa: E402
import relabel  # noqa: E402

FIX_TAX = HERE / "fixtures" / "taxonomy.fixture.json"

MEALS = {
    "1:1": "Rahmân ve Rahîm olan Allah'ın ismiyle",
    "1:2": "Hamd o âlemlerin Rabbi",
    "1:3": "O Rahmân, Rahîm",
    "1:4": "Din gününün mâliki",
    "1:5": "Ancak sana ibadet ederiz ve ancak senden yardım dileriz",
    "1:6": "Bizi doğru yola hidayet eyle",
    "1:7": "(Kendilerine) nimet verdiklerinin yoluna; gazaba uğrayanların ve sapanların değil",
    "2:1": "Elif, Lâm, Mîm",
    "2:2": "Bu kitap, onda şüphe yok, müttakîler için hidayettir",
    "2:3": "Onlar gaybe iman ederler, namazı dosdoğru kılarlar",
}

TAGS = [  # verse_key, ana_tema, alt_taglar
    ("1:1", "A1_ALLAH_ULUHIYET", ["rahmet", "Rahmet", "yol"]),
    ("1:2", "C4_ILIM_AKIL_TEFEKKÜR", ["hamd", "sabır"]),
    ("1:3", "B1_TAHARET_TEMIZLIK", ["deneme", "sabir"]),
    ("1:4", "Z9_BILINMEYEN", ["hesap günü", "gürültü"]),
    ("1:5", "B2_SERI_IBADETLER", ["ibadet"]),
    ("1:6", "A1_ALLAH_ULUHIYET", ["hidayet"]),
    ("1:7", "D9_ESKI", []),
    ("2:2", "A1_ALLAH_ULUHIYET", ["hidayet", "tevekkül"]),
]
ITEMS = [  # verse_key, tag, isim, aciklama  (bazıları yalnız item'da: drift)
    ("1:1", "rahmet", None, None),
    ("1:1", "dua-korunma", "Besmele", "Her işin başında"),
    ("1:2", "hamd", None, None),
    ("1:5", "dua-bağışlanma", "Örnek", "kürasyon"),
    ("1:5", "namaz-vakit", None, None),
    ("2:3", "namaz-genel", "Namaz", "kürasyon, verse_tags satırı yok"),
]


def make_db(path: Path) -> None:
    c = sqlite3.connect(path)
    c.executescript("""
    CREATE TABLE sureler (id INTEGER PRIMARY KEY, adi_arapca TEXT, translit TEXT, adi_turkce TEXT, tur TEXT, ayet_sayisi INTEGER);
    CREATE TABLE verses (verse_key TEXT PRIMARY KEY, surah_id INTEGER, ayah_number INTEGER, arabic_text TEXT,
        primary_translation TEXT);
    CREATE TABLE translations (id INTEGER PRIMARY KEY AUTOINCREMENT, verse_key TEXT, source TEXT, text TEXT);
    CREATE TABLE verse_tags (verse_key TEXT PRIMARY KEY, ana_tema TEXT NOT NULL, alt_taglar TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX idx_verse_tags_ana_tema ON verse_tags(ana_tema);
    CREATE TABLE verse_tag_items (verse_key TEXT NOT NULL, tag TEXT NOT NULL, isim TEXT, aciklama TEXT);
    CREATE UNIQUE INDEX uq_vti ON verse_tag_items(verse_key, tag);
    """)
    c.executemany("INSERT INTO sureler (id, adi_turkce) VALUES (?,?)", [(1, "Fâtiha"), (2, "Bakara")])
    for k, m in MEALS.items():
        s, a = map(int, k.split(":"))
        c.execute("INSERT INTO verses VALUES (?,?,?,?,?)", (k, s, a, "", m))
        c.execute("INSERT INTO translations (verse_key, source, text) VALUES (?, 'yazir', ?)", (k, m))
    c.executemany("INSERT INTO verse_tags (verse_key, ana_tema, alt_taglar) VALUES (?,?,?)",
                  [(k, a, json.dumps(t, ensure_ascii=False)) for k, a, t in TAGS])
    c.executemany("INSERT INTO verse_tag_items VALUES (?,?,?,?)", ITEMS)
    c.commit()
    c.close()


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.db = self.dir / "app.db"
        make_db(self.db)
        self.tax = C.load_taxonomy(FIX_TAX)

    def tearDown(self):
        self.tmp.cleanup()

    def run_clean(self):
        out = self.dir / "out.db"
        rc = clean.main(["--db", str(self.db), "--out", str(out), "--taxonomy", str(FIX_TAX), "--force",
                         "--lenient"])  # fixture'da namaz-genel yok: kasıtlı (kürasyon korunur)
        self.assertEqual(rc, 0)
        return out


class TestValidate(Base):
    def test_fixture_valid(self):
        err, _ = C.validate_taxonomy(self.tax)
        self.assertEqual(err, [])

    def test_placeholder_valid(self):
        err, _ = C.validate_taxonomy(C.load_taxonomy(C.PLACEHOLDER_TAXONOMY))
        self.assertEqual(err, [])

    def test_rules(self):
        d = json.loads(FIX_TAX.read_text(encoding="utf-8"))
        d["level1"].append(dict(d["level1"][0]))                       # tekrar
        d["level1"].append({**d["level1"][0], "code": "a1_kucuk"})      # biçim
        d["level2"].append({"code": "Sabır", "parents": ["X1_YOK"], "tr": "x", "en": "x", "sensitive": False})
        d["migration"]["level2"]["foo"] = "olmayan-hedef"
        d["migration"]["level1"]["X"] = "Y1_YOK"
        err, _ = C.validate_taxonomy(C.Taxonomy(d))
        joined = "\n".join(err)
        for frag in ("level1 tekrar", "kod biçimi geçersiz: 'a1_kucuk'", "kod biçimi geçersiz: 'Sabır'",
                     "parent yok: X1_YOK", "'olmayan-hedef': hedef level2'de yok", "'Y1_YOK': hedef level1'de yok"):
            self.assertIn(frag, joined)

    def test_curated_presence(self):
        err, _ = C.validate_taxonomy(self.tax, {"dua-korunma", "dua-bağışlanma", "namaz-genel", "rahmet"})
        self.assertTrue(any("namaz-genel" in e for e in err))
        self.assertFalse(any("dua-bağışlanma" in e for e in err))  # migration ile eşlenmiş

    def test_normalize(self):
        self.assertEqual(C.normalize_l2("Allah'ın_gücü"), "allahin-gucu")
        self.assertEqual(C.normalize_l2("hesap günü"), "hesap-gunu")
        self.assertEqual(C.normalize_l1("C4_ILIM_AKIL_TEFEKKÜR"), "C4_ILIM_AKIL_TEFEKKUR")
        self.assertEqual(self.tax.map_l2("tevekkül"), ("tevekkul", "normalized"))
        self.assertEqual(self.tax.map_l2("yol"), (None, "dropped"))
        self.assertEqual(self.tax.map_l2("dua-yeni"), ("dua-yeni", "curated"))
        self.assertEqual(self.tax.map_l1("D9_ESKI"), (None, "migrated"))


class TestClean(Base):
    def test_mapping_merge_drop_sync(self):
        out = self.run_clean()
        c = sqlite3.connect(out)
        vt, items = C.load_tag_state(c)
        self.assertEqual(vt["1:1"], ("A1_ALLAH_ULUHIYET", ["rahmet", "dua-korunma"]))   # Rahmet ikizi + yol silindi
        self.assertEqual(vt["1:2"], ("C4_ILIM_AKIL_TEFEKKUR", ["hamd", "sabir"]))       # ASCII + migration
        self.assertEqual(vt["1:3"], ("B2_SERI_IBADETLER", ["imtihan", "sabir"]))          # B1->B2, deneme->imtihan
        self.assertEqual(vt["1:4"], (None, ["hesap-gunu"]))                              # bilinmeyen l1 -> NULL
        self.assertEqual(vt["1:5"], ("B2_SERI_IBADETLER", ["ibadet", "dua-bagislanma", "namaz-vakit"]))
        self.assertEqual(vt["1:7"], (None, []))
        self.assertEqual(vt["2:2"][1], ["hidayet", "tevekkul"])
        self.assertEqual(vt["2:3"], (None, ["namaz-genel"]))  # item'dan satır oluştu, kürasyon korundu
        self.assertEqual(items["1:1"]["dua-korunma"], ("Besmele", "Her işin başında"))
        self.assertEqual(items["1:5"]["dua-bagislanma"], ("Örnek", "kürasyon"))
        st = C.drift_stats(vt, items)
        self.assertEqual((st["drift_alt_not_items"], st["drift_items_not_alt"]), (0, 0))
        self.assertEqual(st["non_ascii_or_bad_format_tags"], 0)
        # şema: ana_tema nullable, indeks korundu
        notnull = [r[3] for r in c.execute("PRAGMA table_info(verse_tags)") if r[1] == "ana_tema"][0]
        self.assertEqual(notnull, 0)
        self.assertIn("idx_verse_tags_ana_tema",
                      [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='index'")])
        c.close()
        # kaynak DB'ye dokunulmadı
        src = sqlite3.connect(self.db)
        self.assertEqual(src.execute("SELECT ana_tema FROM verse_tags WHERE verse_key='1:2'").fetchone()[0],
                         "C4_ILIM_AKIL_TEFEKKÜR")
        src.close()

    def test_dry_run_writes_nothing(self):
        out = self.dir / "dry.db"
        clean.main(["--db", str(self.db), "--out", str(out), "--taxonomy", str(FIX_TAX), "--dry-run", "--lenient"])
        self.assertFalse(out.exists())

    def test_refuses_same_path(self):
        with self.assertRaises(SystemExit):
            clean.main(["--db", str(self.db), "--out", str(self.db), "--taxonomy", str(FIX_TAX)])


class TestBundles(Base):
    def test_schema(self):
        out = self.run_clean()
        od = self.dir / "bundles"
        build_bundles.main(["--db", str(out), "--taxonomy", str(FIX_TAX), "--out-dir", str(od)])
        mt = json.loads((od / build_bundles.REL["mobile_tax"]).read_text(encoding="utf-8"))
        wt = (od / build_bundles.REL["web_tax"]).read_text(encoding="utf-8")
        self.assertEqual(json.dumps(mt, ensure_ascii=False, separators=(",", ":")) + "\n", wt)
        self.assertEqual(list(mt), ["version", "groups", "level1", "level2", "migration"])
        self.assertEqual(list(mt["level1"][0]), build_bundles.L1_KEYS)
        vtxt = (od / build_bundles.REL["mobile_verses"]).read_text(encoding="utf-8")
        self.assertNotIn(": ", vtxt)  # kompakt
        v = json.loads(vtxt)
        self.assertEqual(v["v"], 1)
        self.assertEqual(v["t"]["1:4"], [None, "hesap-gunu"])
        self.assertEqual(v["t"]["2:2"], ["A1_ALLAH_ULUHIYET", "hidayet", "tevekkul"])
        self.assertNotIn("1:7", v["t"])   # etiketsiz yazılmaz
        self.assertNotIn("2:1", v["t"])
        self.assertEqual(list(v["t"]), sorted(v["t"], key=build_bundles._vk))
        self.assertIn("namaz-genel", v["t"]["2:3"])  # kürasyon (taksonomide yok ama korunur)


class TestAudit(Base):
    def test_sample_and_score(self):
        out = self.run_clean()
        with C.open_ro(out) as conn:
            rows, alloc = audit_sample.sample(conn, self.tax, 5, seed=1)
            rows2, _ = audit_sample.sample(conn, self.tax, 5, seed=1)
        self.assertEqual(len(rows), 5)
        self.assertEqual([r["verse_key"] for r in rows], [r["verse_key"] for r in rows2])  # tohumlu
        self.assertTrue(all(r["judgement"] == "" for r in rows))
        self.assertIn("sensitive", alloc)

    def test_scorer(self):
        rows = ([{"stratum": "l1:X", "sensitive": "no", "judgement": "FIT"}] * 95
                + [{"stratum": "l1:X", "sensitive": "no", "judgement": "zayıf"}] * 4
                + [{"stratum": "sensitive", "sensitive": "yes", "judgement": "UYGUN"}])
        r = audit_sample.score(rows)
        self.assertTrue(r["pass"], r["checks"])
        self.assertEqual(r["overall"]["WEAK"], 4)
        rows[-1] = {"stratum": "sensitive", "sensitive": "yes", "judgement": "YANLIŞ"}
        r = audit_sample.score(rows)
        self.assertFalse(r["checks"]["sensitive_wrong==0"])
        self.assertFalse(r["pass"])
        r = audit_sample.score(rows[:-1] + [{"stratum": "s", "sensitive": "no", "judgement": ""}])
        self.assertFalse(r["checks"]["all_judged"])

    def test_cli_roundtrip(self):
        out = self.run_clean()
        p = self.dir / "a.csv"
        audit_sample.main(["sample", "--db", str(out), "--taxonomy", str(FIX_TAX), "--n", "4", "--out", str(p)])
        with open(p, encoding="utf-8-sig", newline="") as f:
            rows = list(csv.DictReader(f))
        for r in rows:
            r["judgement"] = "FIT"
        with open(p, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=audit_sample.COLS)
            w.writeheader()
            w.writerows(rows)
        self.assertEqual(audit_sample.main(["score", str(p)]), 0)


def fake_resp(rows, usage=None):
    return {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": json.dumps({"verses": rows})}]}}],
            "usageMetadata": usage or {"promptTokenCount": 1000, "candidatesTokenCount": 100}}


class TestRelabel(Base):
    def verses(self):
        with C.open_ro(self.db) as c:
            return relabel.load_verses(c)

    def test_batches_and_prompt(self):
        vs = self.verses()
        bs = relabel.build_batches(vs, vs, size=4)
        self.assertEqual(sum(len(b["keys"]) for b in bs), len(vs))
        self.assertTrue(all(len(b["keys"]) <= 4 for b in bs))
        # Fâtiha 7 -> 4+3 (dengeli), Bakara 3 ayrı batch
        self.assertEqual([len(b["keys"]) for b in bs], [4, 3, 3])
        b1 = bs[1]  # 1:5..1:7, bağlam 1:3,1:4
        lines = b1["passages"][0]["lines"]
        self.assertEqual([k for k, _, t in lines if not t], ["1:3", "1:4"])
        p = relabel.build_prompt(b1, self.tax)
        self.assertIn("[bağlam] 1:3:", p)
        self.assertIn("[HEDEF] 1:7:", p)
        self.assertIn("A1_ALLAH_ULUHIYET: Allah & Uluhiyet [hassas]", p)
        self.assertIn("- NONE:", p)
        self.assertNotIn("dua-korunma", p)  # kürasyon whitelist dışı
        self.assertIn("parantez", relabel.SYSTEM_TR)
        body = relabel.request_body(b1, self.tax, 0)
        gc = body["generationConfig"]
        self.assertEqual(gc["temperature"], 0)
        self.assertEqual(gc["responseMimeType"], "application/json")
        it = gc["responseSchema"]["properties"]["verses"]["items"]["properties"]
        self.assertEqual(it["key"]["enum"], ["1:5", "1:6", "1:7"])
        self.assertIn("NONE", it["main"]["enum"])
        self.assertNotIn("namaz-vakit", it["subs"]["items"]["enum"])
        # karışık paket: kısa sureler tek batch'te
        bs2 = relabel.build_batches(vs, vs, size=25)
        self.assertEqual(len(bs2), 1)
        self.assertEqual(len(bs2[0]["passages"]), 2)

    def test_parse(self):
        vs = self.verses()
        b = relabel.build_batches(vs, [v for v in vs if v["surah"] == 1], 25)[0]
        rows = [{"key": "1:1", "main": "A1_ALLAH_ULUHIYET", "subs": ["rahmet", "uydurma", "rahmet"]},
                {"key": "1:2", "main": "NONE", "subs": ["hamd"]},
                {"key": "1:3", "main": "X9_YOK", "subs": []},
                {"key": "9:9", "main": "NONE", "subs": []}]
        res, probs, usage = relabel.parse_response(fake_resp(rows), b, self.tax)
        self.assertEqual(res["1:1"], ("A1_ALLAH_ULUHIYET", ["rahmet"]))
        self.assertEqual(res["1:2"], (None, ["hamd"]))
        self.assertEqual(res["1:3"], (None, []))
        j = " ".join(probs)
        for frag in ("uydurma", "X9_YOK", "9:9", "eksik 4"):
            self.assertIn(frag, j)
        self.assertEqual(usage["promptTokenCount"], 1000)

    def test_retry_and_apply(self):
        vs = self.verses()
        b = relabel.build_batches(vs, [v for v in vs if v["surah"] == 1], 25)[0]
        good = [{"key": k, "main": "B3_KALBI_IBADETLER" if k == "1:5" else "NONE", "subs": ["tevekkul"] if k == "1:5" else []}
                for k in b["keys"]]
        calls = []

        def caller(body, model, key):
            calls.append(1)
            if len(calls) == 1:
                raise relabel.RetryableError("HTTP 503", None)
            if len(calls) == 2:
                return {"candidates": [{"content": {"parts": [{"text": "{bozuk"}]}}]}
            return fake_resp(good)
        res, probs, _ = relabel.call_with_retry(b, self.tax, "m", "k", 0, caller=caller, sleep=lambda s: None)
        self.assertEqual(len(calls), 3)
        self.assertEqual(len(res), 7)
        out = self.run_clean()
        conn = sqlite3.connect(out, isolation_level=None)
        diffs = relabel.apply_results(conn, res)
        vt, items = C.load_tag_state(conn)
        conn.close()
        self.assertEqual(vt["1:5"], ("B3_KALBI_IBADETLER", ["tevekkul", "dua-bagislanma", "namaz-vakit"]))
        self.assertEqual(items["1:5"]["dua-bagislanma"], ("Örnek", "kürasyon"))  # kürasyon dokunulmadı
        self.assertEqual(vt["1:1"], (None, ["dua-korunma"]))
        self.assertEqual(items["1:1"]["dua-korunma"], ("Besmele", "Her işin başında"))
        st = C.drift_stats(vt, items)
        self.assertEqual((st["drift_alt_not_items"], st["drift_items_not_alt"]), (0, 0))
        d5 = [d for d in diffs if d["verse_key"] == "1:5"][0]
        self.assertEqual((d5["old_main"], d5["new_main"], d5["added"], d5["removed"]),
                         ("B2_SERI_IBADETLER", "B3_KALBI_IBADETLER", "tevekkul", "ibadet"))

    def test_quota_and_rate_limit(self):
        body = json.dumps({"error": {"code": 429, "status": "RESOURCE_EXHAUSTED", "message": "Quota exceeded", "details": [
            {"@type": "type.googleapis.com/google.rpc.QuotaFailure", "violations": [
                {"quotaMetric": "generativelanguage.googleapis.com/generate_content_free_tier_requests",
                 "quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]},
            {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "37s"}]}})
        self.assertEqual(relabel.classify_429(body), (True, 37.0))
        per_min = body.replace("PerDay", "PerMinute")
        self.assertEqual(relabel.classify_429(per_min), (False, 37.0))
        t = [0.0]
        slept = []
        rl = relabel.RateLimiter(6, clock=lambda: t[0], sleep=lambda s: (slept.append(s), t.__setitem__(0, t[0] + s)))
        for _ in range(3):
            rl.wait()
        self.assertEqual(slept, [10.0, 10.0])
        vs = self.verses()
        b = relabel.build_batches(vs, vs[:2], 25)[0]

        def caller(body, model, key):
            raise relabel.DailyQuotaError("günlük")
        with self.assertRaises(relabel.DailyQuotaError):
            relabel.call_with_retry(b, self.tax, "m", "k", 0, caller=caller, sleep=lambda s: None)

    def test_export_import(self):
        vs = self.verses()
        bs = relabel.build_batches(vs, vs, size=4)
        d = self.dir / "agy"
        relabel.export_batches(bs, self.tax, d)
        man = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(len(man["batches"]), 3)
        md = (d / "batch_0001.md").read_text(encoding="utf-8")
        self.assertIn((d / "batch_0001.result.json").resolve().as_posix(), md)
        self.assertIn('"enum"', md)
        self.assertIn("[HEDEF] 1:1:", md)
        # 1: geçerli; 2: geçersiz (bilinmeyen kod, >5 sub); 3: eksik
        ok = {"verses": [{"key": k, "main": "NONE", "subs": []} for k in bs[0]["keys"]]}
        ok["verses"][0] = {"key": "1:1", "main": "A1_ALLAH_ULUHIYET", "subs": ["rahmet"]}
        (d / "batch_0001.result.json").write_text("```json\n" + json.dumps(ok) + "\n```", encoding="utf-8")
        bad = {"verses": [{"key": k, "main": "NONE", "subs": []} for k in bs[1]["keys"]]}
        bad["verses"][0]["subs"] = ["rahmet", "hamd", "hidayet", "sabir", "imtihan", "tevekkul"]
        bad["verses"][1]["main"] = "Z1_UYDURMA"
        (d / "batch_0002.result.json").write_text(json.dumps(bad), encoding="utf-8")
        res, rep = relabel.import_results(d, self.tax)
        self.assertEqual(rep["ok"], ["batch_0001"])
        self.assertEqual(rep["missing"], ["batch_0003"])
        j = " ".join(rep["invalid"]["batch_0002"])
        self.assertIn("6 sub > 5", j)
        self.assertIn("Z1_UYDURMA", j)
        self.assertEqual(res["1:1"], ("A1_ALLAH_ULUHIYET", ["rahmet"]))
        # CLI: kısmi olduğunda yazmaz; --allow-partial ile yazar
        out = self.run_clean()
        args = ["--import-results", str(d), "--db", str(out), "--out", str(out), "--taxonomy", str(FIX_TAX)]
        self.assertEqual(relabel.main(args), 1)
        self.assertEqual((d / "rerun.txt").read_text(encoding="utf-8").split(), ["batch_0002", "batch_0003"])
        with self.assertRaises(SystemExit):  # --db == --out ve --in-place yok
            relabel.main(args + ["--allow-partial"])
        out2 = self.dir / "out2.db"
        self.assertEqual(relabel.main(["--import-results", str(d), "--db", str(out), "--out", str(out2),
                                       "--taxonomy", str(FIX_TAX), "--allow-partial"]), 0)
        with C.open_ro(out2) as c:
            vt, _ = C.load_tag_state(c)
        self.assertEqual(vt["1:1"], ("A1_ALLAH_ULUHIYET", ["rahmet", "dua-korunma"]))
        self.assertTrue((d / "diff.csv").exists())

    def test_cache_roundtrip(self):
        p = self.dir / "c" / "x.jsonl"
        relabel.write_cache(p, {"1:2": (None, []), "1:1": ("A1_ALLAH_ULUHIYET", ["rahmet"])}, {"usage": {}})
        res, meta = relabel.read_cache(p)
        self.assertEqual(res["1:1"], ("A1_ALLAH_ULUHIYET", ["rahmet"]))
        self.assertEqual(list(res), ["1:1", "1:2"])

    def test_dry_run_no_key_needed(self):
        rc = relabel.main(["--db", str(self.db), "--taxonomy", str(FIX_TAX), "--dry-run", "--limit", "5"])
        self.assertEqual(rc, 0)


if __name__ == "__main__":
    unittest.main()
