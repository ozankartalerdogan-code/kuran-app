"""Bağlam pencereli LLM yeniden etiketleme (plan 3B).

Her batch ~30 hedef ayet; her hedefin ±2 komşu ayet meali bağlam olarak verilir (etiketlenmez).
Kapalı listeler: level1 kodları + NONE, level2 kodları (kürasyonlu namaz-/korunma-/ismiazam-/dua- hariç;
onlar DB'de aynen korunur).

İki yol:
 A) Çevrimdışı (agy vb. ajan):  --export-batches DIR  ->  ajan her batch_NNNN.md için
    batch_NNNN.result.json yazar  ->  --import-results DIR  (doğrular + DB'ye yazar + diff.csv)
 B) Gemini REST (ücretsiz katman; istemci tarafı hız sınırı, günlük kotada temiz durur, önbellekle sürer)

Örnek:
  python scripts/themes/relabel.py --dry-run --limit 30
  python scripts/themes/relabel.py --export-batches data/relabel/agy
  python scripts/themes/relabel.py --import-results data/relabel/agy --db data/app.themes.db --out data/app.themes.db
  python scripts/themes/relabel.py --surah 1 --out %TEMP%/t.db --out-dir %TEMP%/relabel      (REST, 1 istek)

API anahtarı: GEMINI_API_KEY ortam değişkeni ya da .env.local (asla yazdırılmaz).
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import sqlite3
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

PROMPT_VERSION = "v1"
NONE = "NONE"
MAX_SUBS = 5
CONTEXT = 2
API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
# USD / 1M token (giriş, çıkış+düşünme) — yalnız ücretli katman karşılaştırması için.
PRICES = {"gemini-2.5-flash": (0.30, 2.50), "gemini-2.5-flash-lite": (0.10, 0.40),
          "gemini-2.5-pro": (1.25, 10.0)}
CHARS_PER_TOKEN = 3.5  # Türkçe için kaba tahmin (dry-run)

SYSTEM_TR = """Sen Kur'an ayetlerini konu etiketleriyle sınıflandıran dikkatli bir uzmansın.
Görevin: [HEDEF] olarak işaretli her ayet için EN FAZLA 1 ana tema (level1) ve EN FAZLA 5 alt konu (level2) seçmek.

Kurallar:
1. Yalnızca verilen kapalı listelerdeki kodları kullan. Listede olmayan kod uydurma.
2. Ana tema, ayetin kendisinin açıkça ele aldığı ana konudur. Ayet kısa, bağlama muhtaç ya da konusu belirsizse ana tema "NONE" olsun. Şüphedeysen "NONE" seç; zorlama etiket koyma.
3. Alt konular yalnızca ayette açıkça geçen ya da doğrudan işlenen konulardır; boş liste geçerli bir cevaptır.
4. Meal metnindeki parantez içi açıklamalar (...) ve köşeli parantezler [...] mütercimin yorum ekleridir; bunları etiket için DELİL OLARAK KULLANMA. Yalnızca parantez dışındaki meal metnine dayan.
5. [hassas] işaretli sınıflar (Allah'ın isim ve sıfatları, peygamberler, melekler/gayb, ibadetler, din mensupları): ayet bu konuyu açıkça ve doğrudan işlemiyorsa bu kodları KOYMA; emin değilsen boş bırak.
6. [bağlam] satırları yalnızca anlamı anlamana yardım içindir; onları etiketleme. Her [HEDEF] ayet için çıktıda tam bir kayıt olmalı.
7. Çıktı yalnızca istenen JSON şemasında olsun."""


# ---------------------------------------------------------------- data
def load_verses(conn: sqlite3.Connection) -> list[dict]:
    q = """SELECT v.verse_key, v.surah_id, v.ayah_number, s.adi_turkce,
                  COALESCE(t.text, v.primary_translation, '')
           FROM verses v
           LEFT JOIN sureler s ON s.id = v.surah_id
           LEFT JOIN translations t ON t.verse_key = v.verse_key AND t.source = 'yazir'
           ORDER BY v.surah_id, v.ayah_number"""
    seen, out = set(), []
    for vk, sid, an, sname, meal in conn.execute(q):
        if vk in seen:
            continue
        seen.add(vk)
        out.append({"key": vk, "surah": sid, "ayah": an, "surah_name": sname or f"Sure {sid}",
                    "meal": " ".join((meal or "").split())})
    return out


def select_targets(verses: list[dict], surahs: set[int] | None, limit: int | None) -> list[dict]:
    t = [v for v in verses if not surahs or v["surah"] in surahs]
    return t[:limit] if limit else t


def build_batches(verses: list[dict], targets: list[dict], size: int = 30) -> list[dict]:
    """Hedefleri sure içinde dengeli ardışık parçalara böler, kısa sureleri aynı batch'te paketler.
    -> [{"keys", "passages": [{"surah", "surah_name", "lines": [(key, meal, is_target)]}]}]"""
    by_surah: dict[int, list[dict]] = {}
    for v in verses:
        by_surah.setdefault(v["surah"], []).append(v)
    groups: list[tuple[int, list[dict]]] = []
    for v in targets:
        if groups and groups[-1][0] == v["surah"]:
            groups[-1][1].append(v)
        else:
            groups.append((v["surah"], [v]))
    parts = []
    for s, allv in groups:  # 30 ayetlik sure -> 15+15 (25+5 değil)
        n = max(1, -(-len(allv) // size))
        step = -(-len(allv) // n)
        parts += [(s, allv[j:j + step]) for j in range(0, len(allv), step)]
    batches, cur = [], []
    for s, ch in parts:
        if cur and sum(len(c) for _, c in cur) + len(ch) > size:
            batches.append(_mk_batch(cur, by_surah))
            cur = []
        cur.append((s, ch))
    if cur:
        batches.append(_mk_batch(cur, by_surah))
    return batches


def _mk_batch(parts, by_surah):
    passages, keys = [], []
    for s, ch in parts:
        sv = by_surah[s]
        idx = {v["key"]: i for i, v in enumerate(sv)}
        lo = max(0, idx[ch[0]["key"]] - CONTEXT)
        hi = min(len(sv), idx[ch[-1]["key"]] + CONTEXT + 1)
        chkeys = {v["key"] for v in ch}
        lines = [(v["key"], v["meal"], v["key"] in chkeys) for v in sv[lo:hi]]
        passages.append({"surah": s, "surah_name": sv[0]["surah_name"], "lines": lines})
        keys += [v["key"] for v in ch]
    return {"keys": keys, "passages": passages}


# ---------------------------------------------------------------- prompt
def whitelist_l2(tax: C.Taxonomy) -> list[dict]:
    return [e for e in tax.level2 if not C.is_curated(e["code"])]


def build_prompt(batch: dict, tax: C.Taxonomy) -> str:
    out = ["## Ana tema (level1) kapalı listesi — tam olarak biri ya da NONE"]
    for e in tax.level1:
        d = (e.get("descTr") or "").strip()
        out.append(f"- {e['code']}: {e['tr']}{' [hassas]' if e.get('sensitive') else ''}{' — ' + d if d else ''}")
    out.append(f"- {NONE}: belirgin tek ana konu yok / şüpheli")
    l2 = whitelist_l2(tax)
    out.append("\n## Alt konu (level2) kapalı listesi — 0 ile 5 arası")
    if not l2:
        out.append("(liste boş: alt konu verme, subs = [])")
    for e in l2:
        d = (e.get("descTr") or "").strip()
        out.append(f"- {e['code']}: {e['tr']}{' [hassas]' if e.get('sensitive') else ''}"
                   f"{' — ' + d if d else ''} (üst: {', '.join(e.get('parents', []))})")
    out.append("\n## Ayetler (Türkçe meal, Elmalılı Hamdi Yazır)")
    for p in batch["passages"]:
        out.append(f"\n### {p['surah']}. {p['surah_name']} suresi")
        for key, meal, is_t in p["lines"]:
            out.append(f"{'[HEDEF]' if is_t else '[bağlam]'} {key}: {meal}")
    out.append(f"\nEtiketlenecek ayetler ({len(batch['keys'])}): {', '.join(batch['keys'])}")
    return "\n".join(out)


def response_schema(batch: dict, tax: C.Taxonomy) -> dict:
    """Gemini responseSchema (OpenAPI alt kümesi)."""
    l2 = [e["code"] for e in whitelist_l2(tax)]
    sub_item = {"type": "STRING", "enum": l2} if l2 else {"type": "STRING"}
    return {
        "type": "OBJECT",
        "properties": {"verses": {"type": "ARRAY", "items": {
            "type": "OBJECT",
            "properties": {
                "key": {"type": "STRING", "enum": list(batch["keys"])},
                "main": {"type": "STRING", "enum": [e["code"] for e in tax.level1] + [NONE]},
                "subs": {"type": "ARRAY", "items": sub_item, "maxItems": MAX_SUBS},
            },
            "required": ["key", "main", "subs"],
            "propertyOrdering": ["key", "main", "subs"],
        }}},
        "required": ["verses"],
    }


def json_schema(batch: dict, tax: C.Taxonomy) -> dict:
    """Standart JSON Schema (çevrimdışı ajan istemi için)."""
    l2 = [e["code"] for e in whitelist_l2(tax)]
    return {
        "type": "object", "required": ["verses"], "additionalProperties": False,
        "properties": {"verses": {
            "type": "array", "minItems": len(batch["keys"]), "maxItems": len(batch["keys"]),
            "items": {"type": "object", "required": ["key", "main", "subs"], "additionalProperties": False,
                      "properties": {
                          "key": {"type": "string", "enum": list(batch["keys"])},
                          "main": {"type": "string", "enum": [e["code"] for e in tax.level1] + [NONE]},
                          "subs": {"type": "array", "maxItems": MAX_SUBS if l2 else 0, "uniqueItems": True,
                                   "items": {"type": "string", "enum": l2} if l2 else {"type": "string"}}}}}},
    }


def request_body(batch: dict, tax: C.Taxonomy, thinking_budget: int | None) -> dict:
    gc = {"temperature": 0, "responseMimeType": "application/json",
          "responseSchema": response_schema(batch, tax)}
    if thinking_budget is not None:
        gc["thinkingConfig"] = {"thinkingBudget": thinking_budget}
    return {"systemInstruction": {"parts": [{"text": SYSTEM_TR}]},
            "contents": [{"role": "user", "parts": [{"text": build_prompt(batch, tax)}]}],
            "generationConfig": gc}


def batch_id(batch: dict, tax: C.Taxonomy, model: str, thinking_budget) -> str:
    h = hashlib.sha256(json.dumps([PROMPT_VERSION, model, tax.sha(), thinking_budget, batch["keys"]],
                                  ensure_ascii=False).encode()).hexdigest()[:12]
    return f"{batch['keys'][0].replace(':', '-')}_{h}"


# ---------------------------------------------------------------- validation
def validate_rows(rows, batch_keys, tax: C.Taxonomy, strict: bool):
    """-> (results {key: (main|None, [subs])}, problems [str]).
    strict=True (içe aktarma): her ihlal problem sayılır; çağıran batch'i reddeder.
    strict=False (API): geçersiz kodlar atılır, problem olarak raporlanır."""
    problems: list[str] = []
    if not isinstance(rows, list):
        return {}, ["'verses' listesi yok"]
    allowed2 = {e["code"] for e in whitelist_l2(tax)}
    want = set(batch_keys)
    res: dict[str, tuple] = {}
    for r in rows:
        if not isinstance(r, dict):
            problems.append(f"kayıt nesne değil: {str(r)[:40]}")
            continue
        k = r.get("key")
        if k not in want:
            problems.append(f"beklenmeyen anahtar {k!r}")
            continue
        if k in res:
            problems.append(f"tekrar anahtar {k}")
            continue
        m = r.get("main")
        if isinstance(m, list):
            problems.append(f"{k}: main liste ({len(m)}) — en fazla 1 level1")
            m = m[0] if len(m) == 1 else None
        if m in (None, "", NONE, "null"):
            m = None
        elif m not in tax.l1:
            problems.append(f"{k}: geçersiz main {m!r}")
            m = None
        raw = r.get("subs")
        if raw is None:
            raw = []
        if not isinstance(raw, list):
            problems.append(f"{k}: subs liste değil")
            raw = []
        subs = []
        for s in raw:
            if s in tax.l1:
                problems.append(f"{k}: subs içinde level1 kodu {s!r}")
            elif s not in allowed2:
                problems.append(f"{k}: geçersiz sub {s!r}")
            elif s in subs:
                if strict:
                    problems.append(f"{k}: tekrar sub {s!r}")
            else:
                subs.append(s)
        if len(subs) > MAX_SUBS:
            problems.append(f"{k}: {len(subs)} sub > {MAX_SUBS}")
            subs = subs[:MAX_SUBS]
        res[k] = (m, subs)
    missing = want - set(res)
    if missing:
        problems.append(f"eksik {len(missing)} ayet: {sorted(missing, key=_vk)[:5]}")
    return res, problems


def parse_response(resp: dict, batch: dict, tax: C.Taxonomy):
    """Gemini yanıtı -> (results, problems, usage)"""
    usage = resp.get("usageMetadata", {}) or {}
    cands = resp.get("candidates") or []
    if not cands:
        raise ValueError(f"aday yok: {json.dumps(resp.get('promptFeedback', {}), ensure_ascii=False)[:200]}")
    cand = cands[0]
    fr = cand.get("finishReason")
    text = "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts", []) if not p.get("thought"))
    data = json.loads(text)
    rows = data.get("verses") if isinstance(data, dict) else data
    if not isinstance(rows, list):
        raise ValueError("JSON 'verses' listesi yok")
    res, problems = validate_rows(rows, batch["keys"], tax, strict=False)
    if fr not in (None, "STOP"):
        problems.insert(0, f"finishReason={fr}")
    return res, problems, usage


def _vk(k):
    a, b = k.split(":")
    return int(a), int(b)


# ---------------------------------------------------------------- HTTP (ücretsiz katman)
class RetryableError(Exception):
    def __init__(self, msg, delay: float | None = None):
        super().__init__(msg)
        self.delay = delay


class DailyQuotaError(Exception):
    """Günlük kota bitti: temiz dur; önbellek ertesi gün kaldığı yerden sürdürür."""


class RateLimiter:
    """İstemci tarafı: dakikada en fazla rpm istek (eşit aralıklı)."""

    def __init__(self, rpm: float, clock=time.monotonic, sleep=time.sleep):
        self.interval = 60.0 / rpm if rpm and rpm > 0 else 0.0
        self.clock, self.sleep = clock, sleep
        self.next_t = None
        self.lock = threading.Lock()

    def wait(self) -> None:
        if not self.interval:
            return
        with self.lock:
            now = self.clock()
            if self.next_t is not None and now < self.next_t:
                self.sleep(self.next_t - now)
                now = self.next_t
            self.next_t = now + self.interval


def classify_429(body_text: str) -> tuple[bool, float | None]:
    """429 gövdesi -> (günlük_kota_mı, retryDelay sn). Gemini: details[].violations[].quotaId
    ör. 'GenerateRequestsPerDayPerProjectPerModel-FreeTier'; RetryInfo.retryDelay '37s'."""
    daily, delay = False, None
    try:
        err = json.loads(body_text).get("error", {}) or {}
    except (ValueError, AttributeError):
        err = {}
    for d in err.get("details", []) or []:
        rd = d.get("retryDelay")
        if isinstance(rd, str) and rd.endswith("s"):
            try:
                delay = float(rd[:-1])
            except ValueError:
                pass
        for v in d.get("violations", []) or []:
            q = f"{v.get('quotaId', '')} {v.get('quotaMetric', '')}".lower()
            if "perday" in q or "per_day" in q:
                daily = True
    msg = str(err.get("message") or "").lower()
    if "per day" in msg or "perday" in msg or "daily" in msg:
        daily = True
    return daily, delay


def http_call(body: dict, model: str, key: str, timeout: int = 180) -> dict:
    req = urllib.request.Request(API.format(model=model), data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        full = e.read().decode(errors="replace")
        msg = full[:300]
        if e.code == 429:
            daily, delay = classify_429(full)
            ra = e.headers.get("Retry-After") if e.headers else None
            if ra and delay is None:
                try:
                    delay = float(ra)
                except ValueError:
                    pass
            if daily:
                raise DailyQuotaError(f"HTTP 429 günlük kota ({model}): {msg}") from None
            raise RetryableError(f"HTTP 429: {msg}", delay) from None
        if e.code == 402:  # ön ödemeli kredi bitti / faturalandırma: tüm koşuyu temiz durdur
            raise DailyQuotaError(f"HTTP 402 kredi/faturalandırma ({model}): {msg}") from None
        if e.code in (408, 500, 502, 503, 504):
            raise RetryableError(f"HTTP {e.code}: {msg}") from None
        raise RuntimeError(f"HTTP {e.code}: {msg}") from None
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise RetryableError(f"ağ: {e}") from None


def call_with_retry(batch, tax, model, key, thinking_budget, retries=5, caller=http_call, sleep=time.sleep,
                    limiter: RateLimiter | None = None):
    """DailyQuotaError yeniden denenmez, yukarı taşınır."""
    body = request_body(batch, tax, thinking_budget)
    last = None
    for att in range(retries):
        try:
            if limiter:
                limiter.wait()
            resp = caller(body, model, key)
            res, probs, usage = parse_response(resp, batch, tax)
            if set(batch["keys"]) - set(res) and att < retries - 1:
                raise RetryableError("eksik ayet")
            return res, probs, usage
        except (RetryableError, ValueError) as e:  # JSONDecodeError ValueError'dır
            last = e
            if att < retries - 1:
                d = getattr(e, "delay", None)
                sleep(d + 1 if d is not None else min(60, 2 ** att * 4) + random.random())
    raise RuntimeError(f"{retries} denemede başarısız: {last}")


# ---------------------------------------------------------------- cache
def cache_path(out_dir: Path, bid: str) -> Path:
    return out_dir / "cache" / f"{bid}.jsonl"


def read_cache(p: Path):
    if not p.exists():
        return None
    res, meta = {}, None
    for line in p.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        o = json.loads(line)
        if "_meta" in o:
            meta = o["_meta"]
        else:
            res[o["key"]] = (o["main"], o["subs"])
    return (res, meta) if meta is not None else None


def write_cache(p: Path, res: dict, meta: dict) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        for k in sorted(res, key=_vk):
            f.write(json.dumps({"key": k, "main": res[k][0], "subs": res[k][1]}, ensure_ascii=False) + "\n")
        f.write(json.dumps({"_meta": meta}, ensure_ascii=False) + "\n")
    tmp.replace(p)


def cost_usd(usage: dict, model: str, price_in=None, price_out=None) -> float:
    pi, po = PRICES.get(model, PRICES["gemini-2.5-flash"])
    pi = price_in if price_in is not None else pi
    po = price_out if price_out is not None else po
    inp = usage.get("promptTokenCount", 0)
    out = usage.get("candidatesTokenCount", 0) + usage.get("thoughtsTokenCount", 0)
    return inp / 1e6 * pi + out / 1e6 * po


# ---------------------------------------------------------------- offline (agy)
AGY_HEADER = """# Tema etiketleme — {name} ({n} ayet)

Bu dosya kendi kendine yeterlidir. Aşağıdaki talimatları uygula, ayetleri etiketle ve cevabını
YALNIZCA geçerli JSON olarak şu dosyaya yaz (başka hiçbir dosyayı değiştirme, açıklama ekleme):

    {result}

## Talimatlar
{system}
"""

AGY_FOOTER = """
## Çıktı biçimi (JSON Schema — birebir uy)
Her [HEDEF] ayet için tam bir kayıt; `main` level1 kodu ya da "NONE"; `subs` 0–{maxs} level2 kodu.
```json
{schema}
```
Örnek: {{"verses": [{{"key": "{k0}", "main": "NONE", "subs": []}}]}}

Cevabını YALNIZCA JSON olarak `{result}` dosyasına yaz.
"""


def export_batches(batches: list[dict], tax: C.Taxonomy, out: Path) -> Path:
    out = out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    man = {"prompt_version": PROMPT_VERSION, "taxonomy": str(tax.path), "taxonomy_sha": tax.sha(),
           "created": time.strftime("%Y-%m-%dT%H:%M:%S"), "batches": []}
    for i, b in enumerate(batches, 1):
        name = f"batch_{i:04d}"
        res = out / f"{name}.result.json"
        txt = (AGY_HEADER.format(name=name, n=len(b["keys"]), result=res.as_posix(), system=SYSTEM_TR)
               + "\n" + build_prompt(b, tax) + "\n"
               + AGY_FOOTER.format(maxs=MAX_SUBS, schema=json.dumps(json_schema(b, tax), ensure_ascii=False, indent=1),
                                   k0=b["keys"][0], result=res.as_posix()))
        (out / f"{name}.md").write_text(txt, encoding="utf-8")
        man["batches"].append({"name": name, "prompt": f"{name}.md", "result": f"{name}.result.json",
                               "keys": b["keys"], "chars": len(txt)})
    (out / "manifest.json").write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding="utf-8")
    return out / "manifest.json"


def import_results(dir_: Path, tax: C.Taxonomy):
    """-> (results {key: (main, subs)}, report {ok, invalid {name: [problems]}, missing [names]})"""
    man = json.loads((dir_ / "manifest.json").read_text(encoding="utf-8"))
    if man.get("taxonomy_sha") != tax.sha():
        print(f"UYARI: manifest taksonomisi ({man.get('taxonomy_sha')}) mevcut taksonomiden ({tax.sha()}) farklı;"
              " kodlar mevcut taksonomiye göre doğrulanıyor.")
    results: dict[str, tuple] = {}
    rep = {"ok": [], "invalid": {}, "missing": []}
    for b in man["batches"]:
        p = dir_ / b["result"]
        if not p.exists():
            rep["missing"].append(b["name"])
            continue
        try:
            txt = p.read_text(encoding="utf-8-sig").strip()
            if txt.startswith("```"):  # ajan kod bloğu sardıysa
                txt = txt.strip("`").split("\n", 1)[1] if "\n" in txt else txt
                txt = txt.rsplit("```", 1)[0]
            data = json.loads(txt)
        except (ValueError, OSError) as e:
            rep["invalid"][b["name"]] = [f"JSON okunamadı: {e}"]
            continue
        if isinstance(data, dict) and set(data) - {"verses"}:
            probs0 = [f"fazla alan: {sorted(set(data) - {'verses'})}"]
        else:
            probs0 = []
        rows = data.get("verses") if isinstance(data, dict) else data
        res, probs = validate_rows(rows, b["keys"], tax, strict=True)
        probs = probs0 + probs
        if probs:
            rep["invalid"][b["name"]] = probs
            continue
        results.update(res)
        rep["ok"].append(b["name"])
    return results, rep


# ---------------------------------------------------------------- apply
def apply_results(conn: sqlite3.Connection, results: dict) -> list[dict]:
    """Sonuçları yazar; kürasyonlu item'lar (isim/aciklama dahil) dokunulmadan kalır. -> diff satırları"""
    C.ensure_nullable_schema(conn)
    diffs = []
    like = " OR ".join("tag LIKE ?" for _ in C.CURATED_PREFIXES)
    pats = [p + "%" for p in C.CURATED_PREFIXES]
    conn.execute("BEGIN")
    for k in sorted(results, key=_vk):
        main, subs = results[k]
        row = conn.execute("SELECT ana_tema, alt_taglar FROM verse_tags WHERE verse_key=?", (k,)).fetchone()
        old_main, old_alts = (row[0], C.parse_tags(row[1])) if row else (None, [])
        items = conn.execute("SELECT tag FROM verse_tag_items WHERE verse_key=? ORDER BY rowid", (k,)).fetchall()
        curated = C.dedupe([t for (t,) in items if C.is_curated(t)] + [t for t in old_alts if C.is_curated(t)])
        new_alts = C.dedupe(list(subs) + curated)
        conn.execute(f"DELETE FROM verse_tag_items WHERE verse_key=? AND NOT ({like})", (k, *pats))
        existing = {t for (t,) in conn.execute("SELECT tag FROM verse_tag_items WHERE verse_key=?", (k,))}
        for t in new_alts:
            if t not in existing:
                conn.execute("INSERT INTO verse_tag_items (verse_key, tag) VALUES (?,?)", (k, t))
        conn.execute("""INSERT INTO verse_tags (verse_key, ana_tema, alt_taglar, updated_at)
                        VALUES (?,?,?,CURRENT_TIMESTAMP)
                        ON CONFLICT(verse_key) DO UPDATE SET ana_tema=excluded.ana_tema,
                          alt_taglar=excluded.alt_taglar, updated_at=CURRENT_TIMESTAMP""",
                     (k, main, json.dumps(new_alts, ensure_ascii=False)))
        old_nc = [t for t in old_alts if not C.is_curated(t)]
        diffs.append({"verse_key": k, "old_main": old_main or "", "new_main": main or "",
                      "main_changed": int((old_main or None) != main),
                      "old_subs": "|".join(old_nc), "new_subs": "|".join(subs),
                      "added": "|".join(t for t in subs if t not in old_nc),
                      "removed": "|".join(t for t in old_nc if t not in subs),
                      "curated_kept": "|".join(curated)})
    conn.execute("COMMIT")
    return diffs


DIFF_COLS = ["verse_key", "old_main", "new_main", "main_changed", "old_subs", "new_subs", "added", "removed",
             "curated_kept"]


def write_diff(path: Path, diffs: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=DIFF_COLS)
        w.writeheader()
        w.writerows(diffs)


def apply_to_db(a, results: dict, diff_dir: Path) -> None:
    out = C.prepare_output_db(Path(a.db), Path(a.out) if a.out else None, a.in_place, force=False,
                              reuse_existing=True)
    conn = sqlite3.connect(out, isolation_level=None)
    try:
        diffs = apply_results(conn, results)
    finally:
        conn.close()
    dp = diff_dir / "diff.csv"
    write_diff(dp, diffs)
    ch = sum(1 for d in diffs if d["main_changed"] or d["added"] or d["removed"])
    print(f"Yazıldı: {out}  ({len(diffs)} ayet, {ch} değişti)  diff: {dp}")


# ---------------------------------------------------------------- main
def parse_surahs(s: str | None) -> set[int] | None:
    if not s:
        return None
    out: set[int] = set()
    for part in s.split(","):
        part = part.strip()
        if "-" in part:
            x, y = part.split("-")
            out |= set(range(int(x), int(y) + 1))
        elif part:
            out.add(int(part))
    return out


def run_api(a, tax, batches) -> tuple[dict, bool]:
    key = C.load_gemini_key()
    if not key:
        sys.exit("GEMINI_API_KEY bulunamadı (ortam ya da .env.local).")
    out_dir = Path(a.out_dir)
    models = [a.model] + ([a.fallback_model] if a.fallback_model else [])
    limiter = RateLimiter(a.rpm)
    tot = {"in": 0, "out": 0, "think": 0, "cost": 0.0, "calls": 0, "cached": 0}
    results: dict[str, tuple] = {}
    probs_all, failed = [], []
    mi, stop = 0, None
    t0 = time.time()
    for i, b in enumerate(batches, 1):
        hit = None
        for m in models:
            c = read_cache(cache_path(out_dir, batch_id(b, tax, m, a.thinking_budget)))
            if c is not None:
                hit = c
                break
        if hit is not None:
            results.update(hit[0])
            tot["cached"] += 1
            continue
        if stop:
            failed.append(b["keys"][0])
            continue
        while True:
            m = models[mi]
            try:
                ts = time.time()
                res, probs, usage = call_with_retry(b, tax, m, key, a.thinking_budget, limiter=limiter)
                break
            except DailyQuotaError as e:
                if mi + 1 < len(models):
                    mi += 1
                    print(f"Günlük kota bitti ({m}); {models[mi]} modeline geçiliyor.")
                    continue
                stop = str(e)
                res = None
                break
            except RuntimeError as e:
                print(f"[{i}/{len(batches)}] HATA {b['keys'][0]}: {str(e)[:200]}")
                res = None
                break
        if res is None:
            failed.append(b["keys"][0])
            continue
        bid = batch_id(b, tax, m, a.thinking_budget)
        write_cache(cache_path(out_dir, bid), res, {"usage": usage, "model": m, "prompt_version": PROMPT_VERSION,
                                                    "problems": probs, "secs": round(time.time() - ts, 1),
                                                    "ts": time.strftime("%Y-%m-%dT%H:%M:%S")})
        results.update(res)
        probs_all += [f"{bid}: {p}" for p in probs]
        tot["calls"] += 1
        tot["in"] += usage.get("promptTokenCount", 0)
        tot["out"] += usage.get("candidatesTokenCount", 0)
        tot["think"] += usage.get("thoughtsTokenCount", 0)
        tot["cost"] += cost_usd(usage, m, a.price_in, a.price_out)
        print(f"[{i}/{len(batches)}] {bid} {m} ayet={len(res)} sorun={len(probs)} "
              f"token={usage.get('promptTokenCount', 0)}+{usage.get('candidatesTokenCount', 0)}")
    print(f"\nİstek {tot['calls']} (önbellek {tot['cached']}), usageMetadata: giriş {tot['in']} çıkış {tot['out']} "
          f"düşünme {tot['think']} token; süre {time.time() - t0:.0f} sn. Ücretsiz katman: $0 "
          f"(ücretli olsaydı ≈ ${tot['cost']:.4f})")
    for p in probs_all[:30]:
        print("  sorun:", p)
    if stop:
        print(f"DURDU: günlük kota bitti ({stop[:160]}). Aynı komutu yarın tekrar çalıştırın; "
              f"önbellekteki batch'ler atlanır, kalan {len(failed)} batch denenir.")
    elif failed:
        print(f"BAŞARISIZ batch: {len(failed)} (yeniden çalıştırınca yalnız bunlar denenir)")
    return results, bool(failed)


def main(argv=None) -> int:
    C.stdout_utf8()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=str(C.DEFAULT_DB), help="kaynak DB (meal + mevcut etiketler)")
    ap.add_argument("--out", default=None,
                    help=f"çıktı DB (yoksa --db kopyalanır; varsa güncellenir). Varsayılan {C.DEFAULT_OUT_DB}")
    ap.add_argument("--in-place", action="store_true")
    ap.add_argument("--out-dir", default=str(C.REPO / "data" / "relabel"), help="REST önbelleği + diff.csv")
    ap.add_argument("--taxonomy", default=None)
    ap.add_argument("--batch-size", type=int, default=30, help="batch başı hedef ayet (25-40 önerilir)")
    ap.add_argument("--limit", type=int, default=None, help="ilk N hedef ayet")
    ap.add_argument("--surah", default=None, help="sure filtresi, ör. 1 veya 1,2,112-114")
    ap.add_argument("--dry-run", action="store_true", help="ilk istemi yazdır + tahmin; API çağrısı yok")
    ap.add_argument("--export-batches", metavar="DIR", default=None, help="çevrimdışı ajan için batch_NNNN.md + manifest")
    ap.add_argument("--import-results", metavar="DIR", default=None, help="batch_NNNN.result.json'ları doğrula + yaz")
    ap.add_argument("--allow-partial", action="store_true", help="içe aktarmada geçersiz/eksik batch varken de yaz")
    ap.add_argument("--model", default="gemini-2.5-flash")
    ap.add_argument("--fallback-model", default=None, help="günlük kota bitince (ör. gemini-2.5-flash-lite)")
    ap.add_argument("--thinking-budget", type=int, default=0, help="Gemini thinkingBudget (0=kapalı, -1=dinamik)")
    ap.add_argument("--rpm", type=float, default=8, help="istemci tarafı dakika başı istek (0=sınırsız)")
    ap.add_argument("--no-apply", action="store_true", help="REST: yalnız önbelleğe al")
    ap.add_argument("--price-in", type=float, default=None)
    ap.add_argument("--price-out", type=float, default=None)
    ap.add_argument("--lenient", action="store_true")
    a = ap.parse_args(argv)

    tax = C.load_taxonomy(a.taxonomy)
    print(f"Taksonomi: {tax.path} (level1={len(tax.l1)}, level2 whitelist={len(whitelist_l2(tax))})")
    C.check_or_exit(tax, None, a.lenient)

    if a.import_results:
        d = Path(a.import_results)
        results, rep = import_results(d, tax)
        print(f"Geçerli batch: {len(rep['ok'])}, geçersiz: {len(rep['invalid'])}, eksik: {len(rep['missing'])}")
        for n, ps in rep["invalid"].items():
            print(f"  GEÇERSİZ {n}: " + "; ".join(ps[:4]) + (f" (+{len(ps) - 4})" if len(ps) > 4 else ""))
        if rep["missing"]:
            print("  EKSİK: " + ", ".join(rep["missing"][:40]) + (" ..." if len(rep["missing"]) > 40 else ""))
        redo = sorted(set(rep["missing"]) | set(rep["invalid"]))
        (d / "rerun.txt").write_text("\n".join(redo), encoding="utf-8")
        if redo:
            print(f"Yeniden çalıştırılacak liste: {d / 'rerun.txt'}")
            if not a.allow_partial:
                print("Yazılmadı (--allow-partial ile geçerli batch'ler yazılır).")
                return 1
        if results:
            apply_to_db(a, results, d)
        return 0

    with C.open_ro(a.db) as ro:
        verses = load_verses(ro)
    targets = select_targets(verses, parse_surahs(a.surah), a.limit)
    batches = build_batches(verses, targets, a.batch_size)
    print(f"Hedef ayet: {len(targets)}  batch/istek: {len(batches)}  batch boyu: {a.batch_size}")
    if not batches:
        return 0

    if a.export_batches:
        mp = export_batches(batches, tax, Path(a.export_batches))
        sizes = [len(build_prompt(b, tax)) for b in batches]
        print(f"Dışa aktarıldı: {len(batches)} batch -> {mp.parent}  (manifest {mp.name}; "
              f"istem ort. {sum(sizes) / len(sizes) / CHARS_PER_TOKEN:.0f}, en büyük {max(sizes) / CHARS_PER_TOKEN:.0f} token)")
        return 0

    if a.dry_run:
        p0 = build_prompt(batches[0], tax)
        body = request_body(batches[0], tax, a.thinking_budget)
        print("\n----- SİSTEM -----\n" + SYSTEM_TR + "\n----- İLK İSTEM -----\n" + p0 + "\n----- SON -----")
        n0 = len(p0) + len(SYSTEM_TR)
        print(f"\nİlk istem: {n0} karakter, ~{n0 / CHARS_PER_TOKEN:.0f} token; "
              f"şema {len(json.dumps(body['generationConfig']['responseSchema']))} karakter")
        for bs in sorted({25, 30, 40, a.batch_size}):
            full = build_batches(verses, verses, bs)
            chars = sum(len(build_prompt(b, tax)) + len(SYSTEM_TR) + len(json.dumps(response_schema(b, tax)))
                        for b in full)
            tin, tout = chars / CHARS_PER_TOKEN, len(verses) * 30 + len(full) * 20
            mx = max(len(build_prompt(b, tax)) for b in full) / CHARS_PER_TOKEN
            cost = cost_usd({"promptTokenCount": tin, "candidatesTokenCount": tout}, a.model, a.price_in, a.price_out)
            print(f"TAM KOŞU batch {bs}: {len(full)} istek, ~{tin / 1e6:.2f}M giriş + ~{tout / 1e6:.2f}M çıkış token, "
                  f"en büyük istem ~{mx:.0f} token; @{a.rpm:g}/dk ≈ {len(full) / max(a.rpm, 1e-9):.0f} dk; "
                  f"ücretsiz $0 (ücretli ≈ ${cost:.2f})")
        return 0

    results, had_fail = run_api(a, tax, batches)
    if results and not a.no_apply:
        apply_to_db(a, results, Path(a.out_dir))
    return 1 if had_fail else 0


if __name__ == "__main__":
    sys.exit(main())
