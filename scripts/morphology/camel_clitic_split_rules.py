#!/usr/bin/env python3
"""Deterministic clitic-split rules derived from the CAMeL database itself.

Purpose
-------
A Quranic surface such as `يُمِيتُكُمْ` or `فَٱتَّقُونِ` is a single Tanzil token, but
CAMeL's MSA analyzer only knows the *stem* (`يُمِيت`, `ٱتَّقُونِ`) plus a separately
declared clitic. When the fused surface is out of vocabulary the analyzer
returns nothing at all, which shows up downstream as a pure recall gap.

This module reconstructs the missing analysis WITHOUT inventing anything:

  * the split point is read off the surface only;
  * the material removed must be an attested CAMeL **prefix / suffix entry** -
    matched both on its undiacritized key and on its vocalized `diac` spelling;
  * the clitic tag written back into `prc*` / `enc0` is the tag CAMeL's own
    table assigns to that entry;
  * the entry must spend ALL of its letters on the clitics it declares - see
    `_keep_pure_clitic_entries`. CAMeL's inventory fuses some clitics with
    inflectional letters (`لَتَ`, `لَيَ`, `وَتُؤْ`), and stripping one of those
    leaves a mutilated stem that still analyzes as an unrelated word;
  * the stem analysis must be entirely clitic-free - every `prc*` and `enc0` is
    `0` - so a clitic is never stacked on an analysis that already peeled one,
    and no slot is ever claimed twice;
  * re-attaching the clitic must stay consistent with the full surface.

A note on CAMeL's compatibility tables (AB / BC / AC). They are parsed here and
every accepted split records whether the table certifies it, but they are NOT a
hard gate. Measured against this corpus they reject the whole phenomenon: the
MSA database carries no enclitic-bearing suffix category for verb stems at all
(`يُمِيت` + `ـكُمْ`), and no emphatic-lam prefix for the imperfect (`لَ` +
`يَعْلَمُونَ`). That is a coverage limit of the MSA lexicon, not evidence that the
Quranic surface is wrong, and gating on it would close nothing. The
`camel_table_licensed` flag on every injected candidate keeps the distinction
visible instead of hiding it.

Nothing here reads the teacher corpus, a verse key, a lemma list or a root
list. The only inputs are the surface string and the CAMeL DB.

Determinism: every table is built from a sorted parse of the DB text file, and
every enumeration below yields splits in a fixed left-to-right order.
"""

from __future__ import annotations

from pathlib import Path

PRC_SLOTS = ("prc3", "prc2", "prc1", "prc1.5", "prc0")
ENC_SLOT = "enc0"
_ZERO = ("0", "", None)
SUKUN = "ْ"

# Sections of the CAMeL DB text format that this module reads.
_SEC_PREFIXES = "###PREFIXES###"
_SEC_SUFFIXES = "###SUFFIXES###"
_SEC_AB = "###TABLE AB###"
_SEC_BC = "###TABLE BC###"
_SEC_AC = "###TABLE AC###"


# CAMeL writes morpheme boundaries inside `diac` (the article is `ال#`). They
# are notation, not letters, and must not reach a surface comparison.
_BOUNDARY_MARKERS = "#+"


def _strip_boundaries(text: str) -> str:
    return "".join(ch for ch in text if ch not in _BOUNDARY_MARKERS)


def _feats(field_blob: str) -> dict:
    out = {}
    for item in field_blob.split():
        if ":" in item:
            name, value = item.split(":", 1)
            out[name] = value
    return out


class CliticTables:
    """CAMeL's prefix/suffix inventory, indexed for surface-driven splitting."""

    def __init__(self, db_path: Path, skeleton, normalize_vocalized):
        self._skeleton = skeleton
        self._normalize = normalize_vocalized
        self.prefixes = {}          # undiacritized key -> [entry, ...]
        self.suffixes = {}          # undiacritized key -> [entry, ...]
        self.table_ab = set()       # (prefix_id, stem_category)
        self.table_bc = set()       # (stem_category, suffix_id)
        self.table_ac = set()       # (prefix_id, suffix_id)

        section = None
        for raw in Path(db_path).open(encoding="utf-8"):
            if raw.startswith("###"):
                section = raw.strip()
                continue
            line = raw.rstrip("\n")
            if not line or section is None:
                continue
            if section == _SEC_PREFIXES:
                self._add_prefix(line)
            elif section == _SEC_SUFFIXES:
                self._add_suffix(line)
            elif section in (_SEC_AB, _SEC_BC, _SEC_AC):
                parts = line.split()
                if len(parts) != 2:
                    continue
                target = (self.table_ab if section == _SEC_AB else
                          self.table_bc if section == _SEC_BC else self.table_ac)
                target.add((parts[0], parts[1]))

        self.pruned = {}
        self.tag_letters = {}
        self._keep_pure_clitic_entries()

        for bucket in (self.prefixes, self.suffixes):
            for key in bucket:
                bucket[key] = sorted(
                    bucket[key],
                    key=lambda e: (e["id"], e["vkey"], sorted(e["slots"].items())),
                )

        self.max_prefix_len = max((len(k) for k in self.prefixes), default=0)
        self.max_suffix_len = max((len(k) for k in self.suffixes), default=0)

    # -- the entry must spend all its letters on the clitics it declares ----
    def _minimal_letters(self, entries) -> dict:
        """For every clitic tag, the shortest spelling of an entry that declares
        that tag ALONE. Derived from the DB, never hand-authored."""
        best = {}
        for entry in entries:
            if len(entry["slots"]) != 1:
                continue
            (tag,) = entry["slots"].values()
            letters = self.surface_key(entry["diac"])
            if not letters:
                continue
            current = best.get(tag)
            if current is None or (len(letters), letters) < (len(current), current):
                best[tag] = letters
        return best

    def _keep_pure_clitic_entries(self) -> None:
        """Drop entries whose spelling carries more than their declared clitics.

        CAMeL's prefix inventory contains complex entries that fuse a clitic
        with an inflectional letter: `لَتَ` and `لَيَ` declare `la_emph` alone but
        also spell the imperfect subject prefix, and `وَتُؤْ` declares `wa_conj`
        alone while eating two stem letters. Stripping such an entry leaves a
        mutilated stem that the analyzer will still happily read as some
        unrelated word (`قُولُونَ`, `تُوهَا`), which is a fabricated analysis, not a
        recovered one.

        The test is deterministic and uses only CAMeL's own fields: an entry is
        kept when its consonant skeleton is exactly the concatenation of the
        minimal spellings of the clitic tags it declares, in surface slot order.
        """
        for bucket, slot_order in ((self.prefixes, PRC_SLOTS), (self.suffixes, (ENC_SLOT,))):
            entries = [e for group in bucket.values() for e in group]
            letters = self._minimal_letters(entries)
            self.tag_letters.update(letters)
            kept_total = dropped_total = 0
            for key in list(bucket):
                kept = []
                for entry in bucket[key]:
                    expected = ""
                    ok = True
                    for slot in slot_order:
                        tag = entry["slots"].get(slot)
                        if tag is None:
                            continue
                        if tag not in letters:
                            ok = False       # tag never occurs alone: unverifiable
                            break
                        expected += letters[tag]
                    if ok and self.surface_key(entry["diac"]) == expected:
                        kept.append(entry)
                    else:
                        dropped_total += 1
                kept_total += len(kept)
                if kept:
                    bucket[key] = kept
                else:
                    del bucket[key]
            name = "prefixes" if bucket is self.prefixes else "suffixes"
            self.pruned[name] = {"kept": kept_total, "dropped": dropped_total}

    # -- table construction ------------------------------------------------
    def _add_prefix(self, line: str) -> None:
        parts = line.split("\t")
        if len(parts) < 3:
            return
        feats = _feats(parts[2])
        slots = {slot: feats[slot] for slot in PRC_SLOTS
                 if feats.get(slot) not in _ZERO}
        if not slots:
            return                      # carries no proclitic: not a split
        diac = _strip_boundaries(feats.get("diac") or "")
        if not diac:
            return
        entry = {"id": parts[1], "diac": diac, "vkey": self.clitic_key(diac),
                 "slots": slots}
        self.prefixes.setdefault(self.surface_key(diac), []).append(entry)

    def _add_suffix(self, line: str) -> None:
        parts = line.split("\t")
        if len(parts) < 3:
            return
        feats = _feats(parts[2])
        enc = feats.get(ENC_SLOT)
        if enc in _ZERO:
            return                      # carries no enclitic pronoun
        diac = _strip_boundaries(feats.get("diac") or "")
        if not diac:
            return
        entry = {"id": parts[1], "diac": diac, "vkey": self.clitic_key(diac),
                 "slots": {ENC_SLOT: enc}}
        self.suffixes.setdefault(self.surface_key(diac), []).append(entry)

    # -- surface keys ------------------------------------------------------
    def surface_key(self, text: str) -> str:
        """Letters only, alif family folded - CAMeL's own lookup key."""
        return self._skeleton(text)

    def clitic_key(self, text: str) -> str:
        """Vocalized comparison key.

        A word-final sukun is dropped on BOTH sides: Uthmani writes the pausal
        sukun of `كُمْ` / `هُمْ`, CAMeL's entry does not. That is the single
        orthographic tolerance in this module, and it is symmetric.
        """
        norm = self._normalize(text)
        return norm[:-1] if norm.endswith(SUKUN) else norm

    # -- lookup ------------------------------------------------------------
    def match_prefix(self, text: str):
        return [e for e in self.prefixes.get(self.surface_key(text), [])
                if e["vkey"] == self.clitic_key(text)]

    def match_suffix(self, text: str):
        return [e for e in self.suffixes.get(self.surface_key(text), [])
                if e["vkey"] == self.clitic_key(text)]

    def licenses_prefix(self, prefix_entry, stem_category) -> bool:
        return (prefix_entry["id"], stem_category) in self.table_ab

    def licenses_suffix(self, suffix_entry, stem_category) -> bool:
        return (stem_category, suffix_entry["id"]) in self.table_bc

    def licenses_pair(self, prefix_entry, suffix_entry) -> bool:
        return (prefix_entry["id"], suffix_entry["id"]) in self.table_ac


_MARKS = "ًٌٍَُِّْٰـ"


def _starts_with_letter(text: str) -> bool:
    return bool(text) and text[0] not in _MARKS


def enumerate_splits(tables: CliticTables, form: str, min_stem_letters: int = 2):
    """Every (prefix_entries, prefix_text, stem, suffix_entries, suffix_text)
    the surface admits, in a fixed order.

    A split is emitted only when the removed material is an attested CAMeL
    clitic entry. The stem must start on a letter (never mid-cluster) and keep
    at least `min_stem_letters` consonants, so a bare vowel or a single letter
    is never treated as a word.
    """
    if not form:
        return
    prefix_options = [("", None)]
    for cut in range(1, len(form)):
        candidate = form[:cut]
        if len(tables.surface_key(candidate)) > tables.max_prefix_len:
            break
        matches = tables.match_prefix(candidate)
        if matches:
            prefix_options.append((candidate, matches))

    for prefix_text, prefix_entries in prefix_options:
        rest = form[len(prefix_text):]
        if not _starts_with_letter(rest):
            continue
        suffix_options = [("", None)]
        for cut in range(len(rest) - 1, 0, -1):
            candidate = rest[cut:]
            if len(tables.surface_key(candidate)) > tables.max_suffix_len:
                break
            matches = tables.match_suffix(candidate)
            if matches:
                suffix_options.append((candidate, matches))
        for suffix_text, suffix_entries in suffix_options:
            if not prefix_entries and not suffix_entries:
                continue            # nothing removed: not a split
            stem = rest[:len(rest) - len(suffix_text)] if suffix_text else rest
            if not _starts_with_letter(stem):
                continue
            if len(tables.surface_key(stem)) < min_stem_letters:
                continue
            yield prefix_text, prefix_entries, stem, suffix_text, suffix_entries


def reattach(candidate: dict, prefix_entry, prefix_text: str,
             suffix_entry, suffix_text: str) -> dict:
    """The stem analysis with the stripped clitics written back.

    `diac` is the stem's own CAMeL vocalization framed by the clitic material
    exactly as the surface spells it - the surface is never echoed back as a
    whole, so an exact-diacritics match downstream still means the analyzer
    really predicted the stem's vowels.
    """
    out = dict(candidate)
    if prefix_entry:
        for slot, tag in prefix_entry["slots"].items():
            out[slot] = tag
    if suffix_entry:
        out[ENC_SLOT] = suffix_entry["slots"][ENC_SLOT]
    out["diac"] = f"{prefix_text}{candidate.get('diac') or ''}{suffix_text}"
    return out


def is_cliticless(candidate: dict) -> bool:
    """The stem analysis must claim no clitic of its own, in any slot.

    Stricter than checking only the slots being filled: it refuses to stack a
    clitic on an analysis that already peeled a different one, which is where
    a split would otherwise start explaining the same letters twice.
    """
    return all(candidate.get(slot) in _ZERO for slot in PRC_SLOTS + (ENC_SLOT,))
