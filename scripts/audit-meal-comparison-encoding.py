import json
import re
from collections import Counter, defaultdict
from pathlib import Path


SOURCE_DIR = Path("data/meal-comparison/by-surah")
OUT_JSON = Path("data/analysis-snapshots/meal-comparison-encoding-audit.json")
OUT_DOC = Path("docs/MEAL_COMPARISON_ENCODING_AUDIT.md")

BROKEN_TOKEN_RE = re.compile(
    r"(?iu)\b[\w'’\-]*[01][\w'’\-]*\b"
)

SAFE_FIX_MAP = {
    "ad1yla": "adıyla",
    "ad1na": "adına",
    "ad1n1": "adını",
    "ad1": "adı",
    "a1r": "ağır",
    "a1rl1": "ağırlı",
    "a1rlığınca": "ağırlığınca",
    "a1rl1ğınca": "ağırlığınca",
    "ba1ş": "bağış",
    "ba1şlayan": "bağışlayan",
    "ba1ışlayan": "bağışlayan",
    "do1ru": "doğru",
    "doru": "doğru",
    "doruya": "doğruya",
    "yard1m": "yardım",
    "yaln1z": "yalnız",
    "rah0m": "rahim",
    "rah1m": "rahim",
    "sap1tanlar1n": "sapıtanların",
    "sapm1": "sapmış",
    "tart1lar1": "tartıları",
    "ni'metlerini": "nimetlerini",
}

UNSAFE_HINTS = {
    "1": "tek karakterli veya bağlamsız 1",
    "0": "tek karakterli veya bağlamsız 0",
}


def clean(value):
    return str(value or "").strip()


def normalize_token(token):
    return clean(token).strip(".,;:!?()[]{}\"“”'’`").lower()


def is_safe_fix_candidate(token):
    normalized = normalize_token(token)
    return normalized in SAFE_FIX_MAP


def main():
    source_counts = Counter()
    source_entry_counts = Counter()
    verse_counts = Counter()
    token_counts = Counter()
    token_source_counts = defaultdict(Counter)
    examples_by_token = defaultdict(list)
    affected_entries = 0
    affected_verses = set()
    safe_fix_counts = Counter()
    unsafe_token_counts = Counter()
    entry_examples = []

    files = sorted(SOURCE_DIR.glob("*.json"))
    total_entries = 0
    total_verses = 0

    for path in files:
        records = json.loads(path.read_text(encoding="utf-8"))
        for record in records:
            total_verses += 1
            verse_key = f"{record.get('surahId')}:{record.get('ayahNumber')}"
            verse_has_issue = False
            for entry in record.get("entries", []):
                total_entries += 1
                source = clean(entry.get("sourceName"))
                text = clean(entry.get("text"))
                tokens = BROKEN_TOKEN_RE.findall(text)
                if not tokens:
                    continue
                affected_entries += 1
                verse_has_issue = True
                source_counts[source] += 1
                source_entry_counts[source] += 1
                if len(entry_examples) < 80:
                    entry_examples.append(
                        {
                            "verseKey": verse_key,
                            "source": source,
                            "text": text[:240],
                            "tokens": tokens[:12],
                        }
                    )
                for token in tokens:
                    normalized = normalize_token(token)
                    token_counts[normalized] += 1
                    token_source_counts[normalized][source] += 1
                    if len(examples_by_token[normalized]) < 5:
                        examples_by_token[normalized].append(
                            {
                                "verseKey": verse_key,
                                "source": source,
                                "text": text[:180],
                            }
                        )
                    if normalized in SAFE_FIX_MAP:
                        safe_fix_counts[normalized] += 1
                    else:
                        unsafe_token_counts[normalized] += 1
            if verse_has_issue:
                affected_verses.add(verse_key)
                verse_counts[verse_key] += 1

    safe_fix_map_ranked = [
        {
            "broken": token,
            "suggested": SAFE_FIX_MAP[token],
            "count": safe_fix_counts[token],
            "examples": examples_by_token[token],
        }
        for token, _ in safe_fix_counts.most_common()
    ]
    unsafe_tokens = [
        {
            "token": token,
            "count": count,
            "topSources": dict(token_source_counts[token].most_common(5)),
            "examples": examples_by_token[token],
        }
        for token, count in unsafe_token_counts.most_common(100)
    ]

    result = {
        "summary": {
            "surahFileCount": len(files),
            "totalVerses": total_verses,
            "totalEntries": total_entries,
            "affectedVerseCount": len(affected_verses),
            "affectedEntryCount": affected_entries,
            "safeFixTokenHitCount": sum(safe_fix_counts.values()),
            "unsafeTokenHitCount": sum(unsafe_token_counts.values()),
        },
        "topSources": [
            {
                "source": source,
                "affectedEntries": count,
            }
            for source, count in source_counts.most_common(40)
        ],
        "topVerses": [
            {
                "verseKey": verse,
                "affectedEntries": count,
            }
            for verse, count in verse_counts.most_common(80)
        ],
        "topBrokenTokens": [
            {
                "token": token,
                "count": count,
                "isSafeFixCandidate": token in SAFE_FIX_MAP,
                "suggested": SAFE_FIX_MAP.get(token),
                "topSources": dict(token_source_counts[token].most_common(5)),
                "examples": examples_by_token[token],
            }
            for token, count in token_counts.most_common(150)
        ],
        "safeFixMapSuggested": safe_fix_map_ranked,
        "unsafeTokensTop100": unsafe_tokens,
        "entryExamples": entry_examples,
        "doNotShowRules": [
            "Token içinde 1/0 kalıntısı var ve safeFixMap içinde yoksa kullanıcı-facing phrase olarak gösterme.",
            "Bir meal entry'sinde birden fazla bozuk token varsa phrase extraction için kullanma.",
            "Bozuk token özel isim, ekli kelime veya bağlam gerektiriyorsa otomatik düzeltme yapma.",
            "Ayet genelinde temiz entry sayısı yeterliyse bozuk entry'leri phrase/common/divergent üretiminden hariç tut.",
        ],
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    doc_lines = [
        "# Meal Comparison Encoding Audit",
        "",
        "Tarih: 2026-05-14",
        "",
        "Bu rapor `data/meal-comparison/by-surah` altındaki meal text alanlarında görülen `1/0` encoding kalıntılarını inspect-only olarak inceler. Runtime, UI, default source veya veri dosyaları değiştirilmedi.",
        "",
        "## Genel Sayilar",
        "",
        "| Metrik | Deger |",
        "|---|---:|",
        f"| Sure dosyasi | {len(files)} |",
        f"| Toplam ayet | {total_verses} |",
        f"| Toplam meal entry | {total_entries} |",
        f"| Etkilenen ayet | {len(affected_verses)} |",
        f"| Etkilenen entry | {affected_entries} |",
        f"| Guvenli fix map token hit | {sum(safe_fix_counts.values())} |",
        f"| Guvensiz/review gereken token hit | {sum(unsafe_token_counts.values())} |",
        "",
        "## En Sorunlu Source'lar",
        "",
        "| Source | Etkilenen entry |",
        "|---|---:|",
    ]
    for source, count in source_counts.most_common(20):
        doc_lines.append(f"| `{source}` | {count} |")

    doc_lines.extend([
        "",
        "## En Sik Bozuk Token'lar",
        "",
        "| Token | Adet | Guvenli fix? | Oneri |",
        "|---|---:|---|---|",
    ])
    for token, count in token_counts.most_common(50):
        suggested = SAFE_FIX_MAP.get(token, "")
        doc_lines.append(f"| `{token}` | {count} | {'evet' if suggested else 'hayir'} | {suggested or '-'} |")

    doc_lines.extend([
        "",
        "## Guvenli Fix Map Onerisi",
        "",
        "Bu liste sadece cok belirgin ve tekrarli kalintilar icin oneridir. Emin olunmayan tokenlar otomatik duzeltilmemelidir.",
        "",
        "| Bozuk | Onerilen | Hit |",
        "|---|---|---:|",
    ])
    for item in safe_fix_map_ranked:
        doc_lines.append(f"| `{item['broken']}` | `{item['suggested']}` | {item['count']} |")

    doc_lines.extend([
        "",
        "## Kullaniciya Gosterilmemesi Gereken Durumlar",
        "",
        "- Token icinde `1/0` kalintisi var ve safeFixMap icinde yoksa kullanici-facing phrase olarak gosterilmemeli.",
        "- Bir meal entry'sinde birden fazla bozuk token varsa phrase extraction icin kullanilmamali.",
        "- Ozel isim, ekli kelime veya baglam gerektiren kelimeler otomatik duzeltilmemeli.",
        "- Temiz entry sayisi yeterliyse bozuk entry'ler common/divergent phrase uretiminden haric tutulmali.",
        "",
        "## En Guvenli Sonraki Adim",
        "",
        "Runtime'a baglamadan once preview katmaninda kullanilacak `cleanMealTextForPreview` benzeri bir helper sadece safeFixMap icindeki tokenlari duzeltmeli, diger bozuk entry'leri phrase uretiminden elemelidir. Bu helper once inspect scriptlerinde denenmeli, sonra Kanitli Analiz phrase kategorilerine opt-in eklenmelidir.",
        "",
    ])

    OUT_DOC.parent.mkdir(parents=True, exist_ok=True)
    OUT_DOC.write_text("\n".join(doc_lines), encoding="utf-8")

    print(f"json: {OUT_JSON}")
    print(f"doc: {OUT_DOC}")
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))
    print("top sources:", source_counts.most_common(10))
    print("top tokens:", token_counts.most_common(20))


if __name__ == "__main__":
    main()
