import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


V2_PATH = Path("data2/processed/root_explanations_tr_v2.json")
REVIEW_CSV_PATH = Path("data2/processed/root_explanations_review_batch_733_FINAL.csv")
CANONICAL_PATH = Path("data2/processed/canonical_word_analysis_v4.json")
PREVIOUS_AUDIT_PATH = Path("data/analysis-snapshots/root-explanations-v2-impact-audit.json")
OUT_PATH = Path("data/analysis-snapshots/root-explanations-v2-risk-gated-audit.json")


def clean(value):
    return str(value or "").strip()


def verse_sort_key(verse_key):
    surah, ayah = verse_key.split(":")
    return int(surah), int(ayah)


def load_review_meta():
    with REVIEW_CSV_PATH.open(encoding="utf-8-sig", newline="") as handle:
        return {clean(row.get("root")): row for row in csv.DictReader(handle)}


def summarize_roots(root_counts, root_verse_counts, v2_by_root, review_meta, risks, limit=30):
    rows = []
    for root, word_hits in root_counts.most_common():
        risk = clean(review_meta.get(root, {}).get("risk_level")) or "unknown"
        if risk not in risks:
            continue
        rec = v2_by_root[root]
        rows.append(
            {
                "root": root,
                "risk_level": risk,
                "wordHits": word_hits,
                "verseHits": len(root_verse_counts[root]),
                "short_tr": clean(rec.get("short_tr")),
                "summary_tr": clean(rec.get("summary_tr")),
                "sampleVerses": sorted(root_verse_counts[root], key=verse_sort_key)[:8],
            }
        )
        if len(rows) >= limit:
            break
    return rows


def analyze(limit, canonical, verse_keys, v2_by_root, review_meta):
    selected = verse_keys[:limit]
    scenarios = {
        "easyOnly": {"acceptedRisks": {"kolay"}},
        "easyMedium": {"acceptedRisks": {"kolay", "orta"}},
        "all": {"acceptedRisks": {"kolay", "orta", "zor"}},
    }
    scenario_hits = {
        name: {
            "affectedVerseKeys": set(),
            "wordHits": 0,
            "rootCounts": Counter(),
            "rootVerseCounts": defaultdict(set),
        }
        for name in scenarios
    }
    all_root_counts = Counter()
    all_root_verse_counts = defaultdict(set)
    risk_word_hits = Counter()
    risk_root_set = defaultdict(set)

    for verse_key in selected:
        for word in canonical[verse_key]:
            root = clean(word.get("root"))
            if root not in review_meta or root not in v2_by_root:
                continue
            risk = clean(review_meta[root].get("risk_level")) or "unknown"
            if risk not in {"kolay", "orta", "zor"}:
                continue
            all_root_counts[root] += 1
            all_root_verse_counts[root].add(verse_key)
            risk_word_hits[risk] += 1
            risk_root_set[risk].add(root)
            for name, scenario in scenarios.items():
                if risk not in scenario["acceptedRisks"]:
                    continue
                bucket = scenario_hits[name]
                bucket["affectedVerseKeys"].add(verse_key)
                bucket["wordHits"] += 1
                bucket["rootCounts"][root] += 1
                bucket["rootVerseCounts"][root].add(verse_key)

    scenario_summary = {}
    for name, bucket in scenario_hits.items():
        scenario_summary[name] = {
            "acceptedRisks": sorted(scenarios[name]["acceptedRisks"]),
            "affectedVerseCount": len(bucket["affectedVerseKeys"]),
            "affectedVerseKeys": sorted(bucket["affectedVerseKeys"], key=verse_sort_key),
            "wordHits": bucket["wordHits"],
            "uniqueRootCount": len(bucket["rootCounts"]),
            "topRoots": summarize_roots(
                bucket["rootCounts"],
                bucket["rootVerseCounts"],
                v2_by_root,
                review_meta,
                scenarios[name]["acceptedRisks"],
                30,
            ),
        }

    return {
        "limit": limit,
        "processedVerses": len(selected),
        "scenarios": scenario_summary,
        "riskWordHits": dict(risk_word_hits),
        "riskRootCounts": {risk: len(roots) for risk, roots in risk_root_set.items()},
        "topMediumRoots": summarize_roots(all_root_counts, all_root_verse_counts, v2_by_root, review_meta, {"orta"}, 30),
        "topHardRoots": summarize_roots(all_root_counts, all_root_verse_counts, v2_by_root, review_meta, {"zor"}, 30),
        "dropWhenHardExcluded": {
            "affectedVerseCount": scenario_summary["all"]["affectedVerseCount"]
            - scenario_summary["easyMedium"]["affectedVerseCount"],
            "wordHits": scenario_summary["all"]["wordHits"] - scenario_summary["easyMedium"]["wordHits"],
            "uniqueRootCount": scenario_summary["all"]["uniqueRootCount"]
            - scenario_summary["easyMedium"]["uniqueRootCount"],
        },
        "dropWhenMediumHardExcluded": {
            "affectedVerseCount": scenario_summary["all"]["affectedVerseCount"]
            - scenario_summary["easyOnly"]["affectedVerseCount"],
            "wordHits": scenario_summary["all"]["wordHits"] - scenario_summary["easyOnly"]["wordHits"],
            "uniqueRootCount": scenario_summary["all"]["uniqueRootCount"]
            - scenario_summary["easyOnly"]["uniqueRootCount"],
        },
    }


def main():
    v2_rows = json.loads(V2_PATH.read_text(encoding="utf-8"))
    v2_by_root = {clean(row.get("root")): row for row in v2_rows}
    review_meta = load_review_meta()
    canonical = json.loads(CANONICAL_PATH.read_text(encoding="utf-8"))
    verse_keys = sorted(canonical.keys(), key=verse_sort_key)
    previous = json.loads(PREVIOUS_AUDIT_PATH.read_text(encoding="utf-8")) if PREVIOUS_AUDIT_PATH.exists() else None

    result = {
        "source": {
            "v2": str(V2_PATH),
            "reviewCsv": str(REVIEW_CSV_PATH),
            "canonical": str(CANONICAL_PATH),
            "previousAudit": str(PREVIOUS_AUDIT_PATH) if previous else None,
        },
        "reviewRiskCounts": dict(Counter(clean(row.get("risk_level")) for row in review_meta.values())),
        "limits": {
            "100": analyze(100, canonical, verse_keys, v2_by_root, review_meta),
            "500": analyze(500, canonical, verse_keys, v2_by_root, review_meta),
        },
        "recommendation": {
            "safePreviewFilter": "Kullanıcı-facing preview için kolay kökler otomatik kabul edilebilir; orta kökler sourceStatus/debug veya review-gated kalmalı; zor kökler normal kullanıcıya gösterilmemeli.",
            "nextStep": "Orta risk kökler için manuel onay alanı eklenmeden kolay+orta runtime'a bağlanmamalı.",
        },
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"output: {OUT_PATH}")
    print(f"review risk counts: {result['reviewRiskCounts']}")
    for limit, data in result["limits"].items():
        print(f"\nlimit {limit}")
        for name, scenario in data["scenarios"].items():
            print(
                f"{name}: verses={scenario['affectedVerseCount']} "
                f"roots={scenario['uniqueRootCount']} wordHits={scenario['wordHits']}"
            )
        print(f"drop hard excluded: {data['dropWhenHardExcluded']}")
        print(f"drop medium+hard excluded: {data['dropWhenMediumHardExcluded']}")
        print("top orta:")
        for item in data["topMediumRoots"][:10]:
            print(f"- {item['root']} hits={item['wordHits']} verses={item['verseHits']} short={item['short_tr']}")
        print("top zor:")
        for item in data["topHardRoots"][:10]:
            print(f"- {item['root']} hits={item['wordHits']} verses={item['verseHits']} short={item['short_tr']}")


if __name__ == "__main__":
    main()
