#!/usr/bin/env python3
"""Create or verify the final morphology provenance freeze manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "docs/provenance/morphology-final-freeze-v1_10-token-map-v1_1.json"
CAND = REPO / "data/candidates/morphology"
TOKEN_SHA256 = "03961d28a23d68abaa617ef3d531cce32d4525ea9d9bf1ff4fd2c4363b3228eb"
SUPERSEDED_TOKEN_SHA256 = "2f56784c102bec10a6ed58a54cc099631fa740c782c47d9b42a3d77e78348329"
EXPECTED_COUNTS = {"words": 77_433, "verses": 6_236, "root_meanings": 1_703}

VERSION_ROOTS = {
    "v1_8": CAND / "final-v1_8",
    "v1_9": CAND / "token-realign-v1_9",
    "v1_10": CAND / "surgical-v1_10",
    "token_map_v1_1": CAND / "camel-token-map-v1_1-fatiha",
}

BACKUPS = [
    "data/app.db.yedek_20260724_134257_premerge_v1_8",
    "backups/app-before-buckwalter-cleanup-v1_8-2026-07-24T18-17-57-246Z.db",
    "backups/app-before-aad-homograph-v1_8-2026-07-24T17-48-25-391Z.db",
    "backups/app-before-certain-rollback-v1_8-2026-07-24T14-38-32-016Z.db",
    "backups/app-before-meaning-corrections-v1_8-2026-07-24T16-16-16-705Z.db",
    "backups/app-before-proper-name-root-null-v1_8-2026-07-24T16-28-46-541Z.db",
    "data/app.db.yedek_20260725_010115_pre_token_realign_v1_9",
    "data/app.db.yedek_20260725_014713_pre_batch_a_37_130",
    "data/app.db.yedek_20260727_013427_pre_batch_a_37_130_lemma_normalization",
    "data/app.db.yedek_20260726_142652_pre_batch_bc_meaning_tr",
]

APPLIED_SQL = [
    "data/candidates/morphology/final-v1_8/merge-forward.sql",
    "data/candidates/morphology/final-v1_8/buckwalter-cleanup-v1_8/forward.sql",
    "data/candidates/morphology/final-v1_8/surgical-v1_8/certain-rollback.sql",
    "data/candidates/morphology/final-v1_8/turso-sync/sync-forward.sql",
    "data/candidates/morphology/token-realign-v1_9/forward.sql",
    "data/candidates/morphology/surgical-v1_10/batch-a-37-130/forward.sql",
    "data/candidates/morphology/surgical-v1_10/batch-a-37-130-lemma-normalization/forward.sql",
    "data/candidates/morphology/surgical-v1_10/batch-bc-meaning-tr/forward.sql",
]

CODE_PATHS = [
    "scripts/morphology/build-final-morphology-artifact-v1_8.py",
    "scripts/morphology/verify-final-artifact-determinism-v1_8.py",
    "scripts/morphology/merge-additive-v1_8.py",
    "scripts/morphology/verify-additive-merge-v1_8.py",
    "scripts/morphology/apply-additive-merge-to-prod-v1_8.py",
    "scripts/morphology/sync-additive-v1_8-to-turso.mjs",
    "scripts/morphology/prepare-buckwalter-cleanup-v1_8.mjs",
    "scripts/morphology/apply-aad-homograph-fix-v1_8.mjs",
    "scripts/morphology/apply-certain-rollback-v1_8.mjs",
    "scripts/morphology/apply-meaning-corrections-v1_8.mjs",
    "scripts/morphology/apply-proper-name-root-null-v1_8.mjs",
    "scripts/morphology/freeze-hc1-production-v1_8.py",
    "scripts/morphology/verify-hc1-determinism-v1_8.py",
    "scripts/morphology/build-hc1-token-map-v1_8.py",
    "scripts/morphology/select-camel-candidate-v1_8.py",
    "scripts/morphology/plan-token-realign-v1_9.py",
    "scripts/morphology/adjudicate-token-realign-v1_9-meanings.py",
    "scripts/morphology/preflight-token-realign-v1_9.mjs",
    "scripts/morphology/apply-token-realign-v1_9-local.py",
    "scripts/morphology/apply-token-realign-v1_9-turso.mjs",
    "scripts/morphology/verify-token-realign-v1_9-live-api.mjs",
    "scripts/morphology/verify-token-realign-v1_9-rerun-and-reverse.py",
    "scripts/morphology/verify-token-realign-v1_9-sandbox.py",
    "scripts/morphology/surgical/build_guarded_meaning_patch.py",
    "scripts/morphology/surgical/apply_local.py",
    "scripts/morphology/surgical/apply_turso.mjs",
    "scripts/morphology/surgical/preflight.mjs",
    "scripts/morphology/surgical/verify_37_130_lemma_regression.mjs",
    "scripts/morphology/camel-poc/build-token-map.py",
    "scripts/morphology/camel-poc/validate-token-map.py",
    "scripts/morphology/camel-poc/test-token-map.py",
    "scripts/morphology/camel-poc/freeze-token-map-v1_1.py",
    "scripts/morphology/camel-poc/verify-token-map-production-v1_1.py",
    "scripts/morphology/freeze-final-provenance.py",
]

DOC_PATHS = [
    "docs/morfoloji-final-artefakt-v1_8-entegrasyon-oncesi.md",
    "docs/morfoloji-hc1-production-v1_8.md",
    "docs/token-realign-v1_9-blockers.md",
    "docs/token-realign-v1_9-dry-run.md",
    "docs/token-realign-v1_9-uygulama-raporu.md",
    "docs/yayin-oncesi-final-denetim-raporu.md",
    "docs/provenance/camel-token-policy.md",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rel(path: Path) -> str:
    return path.resolve().relative_to(REPO.resolve()).as_posix()


def add(catalog: dict[str, dict], path_value: str | Path) -> str:
    path = (REPO / path_value).resolve() if isinstance(path_value, str) else path_value.resolve()
    if REPO.resolve() not in path.parents or not path.is_file():
        raise FileNotFoundError(f"Required provenance artifact missing or outside repo: {path}")
    key = rel(path)
    if key not in catalog:
        catalog[key] = {"bytes": path.stat().st_size, "sha256": sha256(path)}
    return key


def all_files(root: Path) -> list[Path]:
    if not root.is_dir():
        raise FileNotFoundError(root)
    return sorted((path for path in root.rglob("*") if path.is_file()), key=lambda path: rel(path))


def db_snapshot() -> dict:
    db = REPO / "data/app.db"
    connection = sqlite3.connect(f"file:{db.resolve().as_posix()}?mode=ro&immutable=1", uri=True)
    try:
        counts = {
            table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in EXPECTED_COUNTS
        }
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        connection.close()
    if counts != EXPECTED_COUNTS or integrity != "ok":
        raise RuntimeError(f"Production invariant failure: counts={counts}, integrity={integrity}")
    return {"counts": counts, "integrity_check": integrity, "sha256": sha256(db)}


def build_manifest() -> dict:
    catalog: dict[str, dict] = {}
    versions = {
        name: [add(catalog, path) for path in all_files(root)]
        for name, root in VERSION_ROOTS.items()
    }
    old_map = add(catalog, CAND / "camel-morph-msa-v1.0/token-map.jsonl")
    old_policy = add(catalog, CAND / "reports/camel-token-policy.json")
    backups = [add(catalog, path) for path in BACKUPS]
    code = [add(catalog, path) for path in CODE_PATHS]
    docs = [add(catalog, path) for path in DOC_PATHS]

    version_files = sorted({path for paths in versions.values() for path in paths})
    sql_files = [path for path in version_files if path.endswith(".sql")]
    applied_sql = [add(catalog, path) for path in APPLIED_SQL]
    rollback_sql = sorted(set(sql_files) - set(applied_sql))
    preimages = [
        path for path in version_files
        if any(marker in Path(path).name.lower() for marker in ("preimage", "pre-image", "backup"))
    ]
    regression_reports = [
        path for path in version_files
        if any(marker in Path(path).name.lower() for marker in (
            "report", "verification", "determinism", "integrity", "postflight", "dry-run"
        ))
    ]

    token_manifest_path = CAND / "camel-token-map-v1_1-fatiha/manifest.json"
    token_manifest = json.loads(token_manifest_path.read_text(encoding="utf-8"))
    if token_manifest["current_freeze"]["sha256"] != TOKEN_SHA256:
        raise RuntimeError("token-map v1.1 hash mismatch")
    if token_manifest["previous_freeze"]["sha256"] != SUPERSEDED_TOKEN_SHA256:
        raise RuntimeError("superseded token-map hash mismatch")

    regression_path = CAND / "surgical-v1_10/batch-a-37-130-lemma-normalization/full-regression-report.json"
    regression = json.loads(regression_path.read_text(encoding="utf-8"))
    if (
        regression.get("status") != "PASS"
        or regression.get("corpus_counts") != EXPECTED_COUNTS
        or regression.get("new_regressions") != 0
        or regression.get("local_turso_differences") != []
        or any(regression.get("errors", {}).values())
    ):
        raise RuntimeError("Final read-only regression is not PASS")

    invalidation_path = CAND / "surgical-v1_10/batch-bc-meaning-tr/sql-invalidation.json"
    invalidation = json.loads(invalidation_path.read_text(encoding="utf-8"))
    snapshot = db_snapshot()
    if catalog[versions["token_map_v1_1"][2]]["sha256"] != TOKEN_SHA256:
        token_path = add(catalog, CAND / "camel-token-map-v1_1-fatiha/token-map.jsonl")
        if catalog[token_path]["sha256"] != TOKEN_SHA256:
            raise RuntimeError("Catalog token map hash mismatch")

    return {
        "artifact_catalog": dict(sorted(catalog.items())),
        "final_regression": {
            "checked": regression["checked"],
            "errors": regression["errors"],
            "local_turso_differences": 0,
            "new_regressions": regression["new_regressions"],
            "report_path": rel(regression_path),
            "report_sha256": sha256(regression_path),
            "ran_at": regression["ranAt"],
            "status": regression["status"],
        },
        "groups": {
            "applied_sql": applied_sql,
            "backups": backups,
            "code": code,
            "documentation": docs,
            "preimages": sorted(preimages),
            "regression_reports": sorted(regression_reports),
            "rollback_sql": rollback_sql,
            "versions": versions,
        },
        "production_invariants": {
            **EXPECTED_COUNTS,
            "local_db_integrity_check": snapshot["integrity_check"],
            "local_db_sha256_at_freeze": snapshot["sha256"],
            "token_map_sha256": TOKEN_SHA256,
        },
        "schema_version": "morphology-final-provenance-freeze-v1",
        "sql_history": {
            "invalidated_v1_10_meaning_sql": invalidation["invalidated_sql_sha256"],
            "replacement_v1_10_meaning_sql": invalidation["replacement_sql_sha256"],
        },
        "status": "PASS",
        "token_map_history": {
            "current": {"path": "data/candidates/morphology/camel-token-map-v1_1-fatiha/token-map.jsonl", "sha256": TOKEN_SHA256, "tokens": 77_433},
            "superseded_retained": {"path": old_map, "policy_path": old_policy, "sha256": SUPERSEDED_TOKEN_SHA256, "tokens": 77_429},
        },
        "write_scope": {"local_db_modified": False, "turso_modified": False},
    }


def write_new(path: Path, value: object) -> None:
    if path.exists():
        raise FileExistsError(f"Refusing to overwrite existing final freeze: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(mode="wb", prefix=f".{path.name}.", suffix=".tmp", dir=path.parent, delete=False)
    temp_path = Path(handle.name)
    try:
        with handle:
            handle.write((json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8"))
        os.rename(temp_path, path)
    except BaseException:
        temp_path.unlink(missing_ok=True)
        raise


def verify(path: Path) -> dict:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    failures = []
    for relative, expected in manifest["artifact_catalog"].items():
        artifact = REPO / relative
        if not artifact.is_file() or artifact.stat().st_size != expected["bytes"] or sha256(artifact) != expected["sha256"]:
            failures.append(relative)
    snapshot = db_snapshot()
    if snapshot["sha256"] != manifest["production_invariants"]["local_db_sha256_at_freeze"]:
        failures.append("data/app.db")
    if manifest["production_invariants"]["token_map_sha256"] != TOKEN_SHA256:
        failures.append("token-map-sha256")
    if failures:
        raise RuntimeError(f"Final provenance verification failed: {failures[:20]}")
    return {"artifacts": len(manifest["artifact_catalog"]), "status": "PASS"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.verify:
        result = verify(OUT)
    else:
        manifest = build_manifest()
        write_new(OUT, manifest)
        result = {"artifacts": len(manifest["artifact_catalog"]), "status": manifest["status"]}
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
