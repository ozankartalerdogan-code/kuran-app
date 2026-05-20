import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


ENRICHED_PATH = Path("data2/processed/root_explanations_tr_enriched.json")
V2_PATH = Path("data2/processed/root_explanations_tr_v2.json")
CANONICAL_PATH = Path("data2/processed/canonical_word_analysis_v4.json")
REVIEW_CSV_PATH = Path("data2/processed/root_explanations_review_batch_733_FINAL.csv")
OUT_PATH = Path("data/analysis-snapshots/root-explanations-v2-impact-audit.json")


def clean(value):
    return str(value or "").strip()


def verse_sort_key(verse_key):
    surah, ayah = verse_key.split(":")
    return int(surah), int(ayah)


def load_roots(path):
    rows = json.loads(path.read_text(encoding="utf-8"))
    return {clean(row.get("root")): row for row in rows}


def is_filled(row):
    return bool(clean(row.get("short_tr")) and clean(row.get("summary_tr")))


def load_review_meta():
    if not REVIEW_CSV_PATH.exists():
        return {}
    with REVIEW_CSV_PATH.open(encoding="utf-8-sig", newline="") as handle:
        return {clean(row.get("root")): row for row in csv.DictReader(handle)}


def analyze(limit, verse_keys, canonical, newly_filled_roots, enriched_by_root, v2_by_root, review_meta):
    selected = verse_keys[:limit]
    affected_verses = []
    root_counts = Counter()
    root_verse_counts = defaultdict(set)
    word_hits = 0

    for verse_key in selected:
        hits = []
        for word in canonical[verse_key]:
            root = clean(word.get("root"))
            if root not in newly_filled_roots:
                continue
            word_hits += 1
            root_counts[root] += 1
            root_verse_counts[root].add(verse_key)
            if len(hits) < 8:
                v2_row = v2_by_root[root]
                meta = review_meta.get(root, {})
                hits.append(
                    {
                        "root": root,
                        "arabic": clean(word.get("arabic")),
                        "lemma": clean(word.get("lemma")),
                        "meaning_tr": clean(word.get("meaning_tr")),
                        "v2_short_tr": clean(v2_row.get("short_tr")),
                        "risk_level": clean(meta.get("risk_level")) or "unknown",
                    }
                )
        if hits:
            affected_verses.append({"verseKey": verse_key, "newRootExplanations": hits})

    risk_root_counts = Counter()
    risk_word_counts = Counter()
    risky_examples = []
    for root, count in root_counts.most_common():
        meta = review_meta.get(root, {})
        risk = clean(meta.get("risk_level")) or "unknown"
        risk_root_counts[risk] += 1
        risk_word_counts[risk] += count
        if risk == "zor":
            v2_row = v2_by_root[root]
            risky_examples.append(
                {
                    "root": root,
                    "wordHits": count,
                    "verseHits": len(root_verse_counts[root]),
                    "short_tr": clean(v2_row.get("short_tr")),
                    "summary_tr": clean(v2_row.get("summary_tr")),
                    "sampleVerses": sorted(root_verse_counts[root], key=verse_sort_key)[:5],
                    "notes": clean(meta.get("notes")),
                }
            )

    top_roots = []
    for root, count in root_counts.most_common(50):
        v2_row = v2_by_root[root]
        meta = review_meta.get(root, {})
        top_roots.append(
            {
                "root": root,
                "wordHits": count,
                "verseHits": len(root_verse_counts[root]),
                "risk_level": clean(meta.get("risk_level")) or "unknown",
                "short_tr": clean(v2_row.get("short_tr")),
                "summary_tr": clean(v2_row.get("summary_tr")),
                "sampleVerses": sorted(root_verse_counts[root], key=verse_sort_key)[:5],
            }
        )

    affected_verse_keys = [item["verseKey"] for item in affected_verses]

    return {
        "limit": limit,
        "processedVerses": len(selected),
        "newlyExplainedRootCountInRange": len(root_counts),
        "newlyExplainedWordHits": word_hits,
        "potentiallyAffectedVerseCount": len(affected_verses),
        "affectedVerseKeys": affected_verse_keys,
        "riskRootCounts": dict(risk_root_counts),
        "riskWordHitCounts": dict(risk_word_counts),
        "topNewlyExplainedRoots": top_roots,
        "affectedVersesSample": affected_verses[:80],
        "riskyExamplesTop20": risky_examples[:20],
    }


def main():
    enriched_by_root = load_roots(ENRICHED_PATH)
    v2_by_root = load_roots(V2_PATH)
    canonical = json.loads(CANONICAL_PATH.read_text(encoding="utf-8"))
    review_meta = load_review_meta()

    newly_filled_roots = sorted(
        root
        for root, v2_row in v2_by_root.items()
        if root in enriched_by_root and not is_filled(enriched_by_root[root]) and is_filled(v2_row)
    )

    verse_keys = sorted(canonical.keys(), key=verse_sort_key)
    result = {
        "source": {
            "enriched": str(ENRICHED_PATH),
            "v2": str(V2_PATH),
            "canonical": str(CANONICAL_PATH),
            "reviewCsv": str(REVIEW_CSV_PATH) if REVIEW_CSV_PATH.exists() else None,
        },
        "global": {
            "enrichedRootCount": len(enriched_by_root),
            "v2RootCount": len(v2_by_root),
            "rootsChangedEmptyToFilled": len(newly_filled_roots),
            "newlyFilledRootsSample": newly_filled_roots[:50],
        },
        "limits": {
            "100": analyze(100, verse_keys, canonical, newly_filled_roots, enriched_by_root, v2_by_root, review_meta),
            "500": analyze(500, verse_keys, canonical, newly_filled_roots, enriched_by_root, v2_by_root, review_meta),
        },
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"output: {OUT_PATH}")
    print(f"roots empty->filled: {result['global']['rootsChangedEmptyToFilled']}")
    for limit, summary in result["limits"].items():
        print(f"\nlimit {limit}")
        print(f"processed verses: {summary['processedVerses']}")
        print(f"new roots in range: {summary['newlyExplainedRootCountInRange']}")
        print(f"new word hits: {summary['newlyExplainedWordHits']}")
        print(f"potentially affected verses: {summary['potentiallyAffectedVerseCount']}")
        print(f"risk root counts: {summary['riskRootCounts']}")
        print(f"risk word hit counts: {summary['riskWordHitCounts']}")
        print("top risky examples:")
        for item in summary["riskyExamplesTop20"][:10]:
            print(
                f"- {item['root']} hits={item['wordHits']} verses={item['verseHits']} "
                f"short={item['short_tr']} samples={', '.join(item['sampleVerses'])}"
            )


if __name__ == "__main__":
    main()
