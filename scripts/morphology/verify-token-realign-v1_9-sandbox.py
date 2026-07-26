"""Apply the drafted migration to a THROWAWAY COPY of app.db and check the gates.

Nothing here touches data/app.db or Turso: the copy lives in the scratchpad and
is created fresh on every run.
"""
import hashlib
import json
import shutil
import sqlite3
import sys
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path('C:/Dev/kuran_app')
SCRATCH = Path(__file__).resolve().parent
SANDBOX = SCRATCH / 'sandbox-app.db'
OUT = REPO / 'data/candidates/morphology/token-realign-v1_9'

sys.path.insert(0, str(REPO / 'scripts/morphology'))
import importlib.util
spec = importlib.util.spec_from_file_location(
    'pl', REPO / 'scripts/morphology/plan-token-realign-v1_9.py')
pl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pl)

# ---- build a clean, WAL-free copy via sqlite's own backup API ---------------
if SANDBOX.exists():
    SANDBOX.unlink()
src = sqlite3.connect(f'file:{REPO}/data/app.db?mode=ro', uri=True)
dst = sqlite3.connect(SANDBOX)
src.backup(dst)
src.close()


def fingerprint(connection, exclude):
    """sha256 over every words row outside the target verses."""
    digest = hashlib.sha256()
    rows = connection.execute(
        'SELECT id, ' + ', '.join(pl.ALL_COLUMNS) + ' FROM words ORDER BY id')
    count = 0
    for row in rows:
        if row[1] in exclude:
            continue
        digest.update(repr(row).encode('utf-8'))
        count += 1
    return digest.hexdigest(), count


targets = set(pl.TARGET_VERSES)
before_fp, before_n = fingerprint(dst, targets)
before_total = dst.execute('SELECT COUNT(*) FROM words').fetchone()[0]

forward = (OUT / 'forward.sql').read_text(encoding='utf-8')
reverse = (OUT / 'reverse.sql').read_text(encoding='utf-8')

dst.executescript(forward)

after_fp, after_n = fingerprint(dst, targets)
after_total = dst.execute('SELECT COUNT(*) FROM words').fetchone()[0]

canonical = pl.load_token_map()
result = {
    'forward_applied': True,
    'rows_before': before_total,
    'rows_after': after_total,
    'untargeted_rows_before': before_n,
    'untargeted_rows_after': after_n,
    'untargeted_fingerprint_unchanged': before_fp == after_fp,
    'foreign_key_check': dst.execute('PRAGMA foreign_key_check').fetchall(),
    'integrity_check': dst.execute('PRAGMA integrity_check').fetchone()[0],
}

# per-verse token sequence must now equal canonical, boundary for boundary
mismatch, gaps = [], []
per_verse = defaultdict(list)
for vk, wi, ar in dst.execute('SELECT verse_key, word_index, arabic FROM words ORDER BY verse_key, word_index'):
    per_verse[vk].append((wi, ar))
for vk, rows in per_verse.items():
    indexes = [wi for wi, _ in rows]
    if indexes != list(range(1, len(indexes) + 1)):
        gaps.append(vk)
    if vk in canonical:
        want = [canonical[vk][i] for i in sorted(canonical[vk])]
        got = [ar for _, ar in rows]
        if len(want) != len(got):
            mismatch.append({'verse_key': vk, 'reason': 'count', 'want': len(want), 'got': len(got)})
        elif [pl.skeleton(x) for x in want] != [pl.skeleton(x) for x in got]:
            mismatch.append({'verse_key': vk, 'reason': 'boundary'})
result['verses_with_word_index_gap_or_duplicate'] = gaps
result['verses_whose_tokenisation_differs_from_canonical'] = mismatch
result['verse_count'] = len(per_verse)
result['verses_not_in_frozen_token_map'] = sorted(set(per_verse) - set(canonical))

ascii_rows = dst.execute(
    "SELECT verse_key, word_index, root, lemma FROM words "
    "WHERE (root GLOB '*[A-Za-z]*') OR (lemma GLOB '*[A-Za-z]*')").fetchall()
result['ascii_in_root_or_lemma'] = ascii_rows

# API shape: the ordered projection the app actually reads
sample = {}
for vk in pl.TARGET_VERSES:
    sample[vk] = dst.execute(
        'SELECT word_index, arabic, root, lemma, pos, meaning_tr FROM words '
        'WHERE verse_key = ? ORDER BY word_index ASC, segment_index ASC, id ASC',
        (vk,)).fetchall()
result['api_projection_indexes_are_dense'] = all(
    [r[0] for r in rows] == list(range(1, len(rows) + 1)) for rows in sample.values())

# ---- roll back and prove we land exactly where we started -------------------
dst.executescript(reverse)
rollback_fp, rollback_n = fingerprint(dst, set())
dst2 = sqlite3.connect(f'file:{REPO}/data/app.db?mode=ro', uri=True)
original_fp, original_n = fingerprint(dst2, set())
result['reverse_applied'] = True
result['reverse_restores_byte_identical_words_table'] = rollback_fp == original_fp
result['rows_after_reverse'] = dst.execute('SELECT COUNT(*) FROM words').fetchone()[0]

dst.close()
dst2.close()
SANDBOX.unlink(missing_ok=True)
for suffix in ('-wal', '-shm'):
    Path(str(SANDBOX) + suffix).unlink(missing_ok=True)

(OUT / 'dry-run-verification.json').write_text(
    json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2)[:4000])
