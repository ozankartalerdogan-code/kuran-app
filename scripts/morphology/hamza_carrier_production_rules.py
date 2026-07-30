"""Hamza-carrier rules for the ANALYSER INPUT only - production set.

Two rules, both accepted in the HC1 narrowing round and both confined to one
codepoint neighbourhood: a BARE HAMZA (U+0621) sitting on the line after an
unvowelled long alef and before a plural waw. Uthmani writes the hamza on the
line there (جَآءُو); MSA seats it on the waw (جاؤو), which is what the analyser's
lexicon knows.

    HC1a          U+0621 -> U+0624, only when the waw that follows is itself
                  followed by real affix material. A word-final waw - with or
                  without a trailing otiose alef - does not fire.

    HC1_PLUS_O4   the same site when the waw IS word-final: the carrier
                  substitution AND the otiose alef are issued as ONE edit
                  script. The alef edit has no trigger of its own: it is only
                  ever emitted next to the carrier edit produced by the very
                  same site, and it records `bound_to_carrier_at`. O4X is NOT
                  revived as a standalone rule and cannot be - `derive()` stops
                  if it ever sees an unbound alef edit.

The two conditions are mutually exclusive by construction (one demands real
affix material after the waw, the other demands the waw be word-final), so no
token can receive both.

Like `orthographic_production_rules`, these rules never touch the canonical
Tanzil text, never read teacher root/lemma/POS, and carry no token allowlist,
verse-key filter or surface list of any kind - a rule fires wherever its
codepoint condition holds and nowhere else. A rule returns an EDIT SCRIPT
(`{offset, delete, insert, role}` in input coordinates), `invert()` rebuilds the
input from the output, and three further conditions are asserted on every
variant handed out:

    * the carrier edit deletes a hamza-family codepoint and inserts one;
    * the alef edit carries `bound_to_carrier_at`;
    * `invert(apply(form)) == form`.

The frozen R1-R3 hamza rewrite is deliberately NOT chained onto these variants:
the narrowing measurement that produced the accepted 29-token closure scored the
carrier variants exactly as they come out of these rules, and chaining a further
rewrite here would make the production pools differ from what was measured.

Deliberately NOT here:
    HC1   the un-narrowed carrier rule. Superseded: it fires on all 29 tokens
          but reaches an exact lemma+root+POS on only 20 of them, because on the
          word-final surfaces جاؤو analyses as the adjective جَائِي rather than
          the verb جَاء. HC1a keeps the 20; HC1_PLUS_O4 recovers the other 9.
    HC2/HC3/HC4X/HC5X/HC6X   REJECTED in the carrier round: between 9 and 178
          tokens that the frozen selection already gets CORRECT would receive a
          competing lexical core from them.
    O4X   REJECTED standalone (0 closures on its own; see above for the only
          form in which the alef insertion survives).
"""

from __future__ import annotations

import re

from orthographic_production_rules import apply_edits, codepoints, invert

BARE = "ء"          # U+0621
WAW_HAMZA = "ؤ"     # U+0624
ALEF = "ا"          # U+0627
ALEF_MADDA = "آ"    # U+0622
WASLA = "ٱ"         # U+0671
WAW = "و"           # U+0648
ROUNDED_ZERO = "۟"  # U+06DF

LONG_ALEF = {ALEF, ALEF_MADDA, WASLA}
SHORT_VOWELS = set("ًٌٍَُِّ")
CARRIERS = set("ءأإؤئآ")
MARK_RE = re.compile("[ً-ْٰـٓ-ٕۖ-ۭ]")

RULE_DOC = {
    "HC1a_BARE_TO_WAW_SEAT_BEFORE_AFFIXED_WAW":
        "U+0621 -> U+0624 when the preceding letter is U+0627/U+0622/U+0671 "
        "carrying no short vowel, the following letter is U+0648, and that waw "
        "is followed by a letter which is not merely a word-final otiose alef.",
    "HC1_PLUS_O4_BARE_TO_WAW_SEAT_PLUS_OTIOSE_ALEF":
        "in the same site, when the waw IS word-final: U+0621 -> U+0624 and "
        "U+0627 inserted after the waw, as ONE edit script. The alef edit "
        "carries `bound_to_carrier_at` and is never emitted on its own.",
}

HC1A = "HC1a_BARE_TO_WAW_SEAT_BEFORE_AFFIXED_WAW"
HC1_PLUS_O4 = "HC1_PLUS_O4_BARE_TO_WAW_SEAT_PLUS_OTIOSE_ALEF"


# --------------------------------------------------------------------------
# Neighbourhood readers
# --------------------------------------------------------------------------
def _is_mark(ch: str) -> bool:
    return bool(MARK_RE.match(ch))


def _prev_letter(text: str, index: int):
    """(letter before `index`, marks skipped on the way there)."""
    cursor, marks = index - 1, set()
    while cursor >= 0 and _is_mark(text[cursor]):
        marks.add(text[cursor])
        cursor -= 1
    return (text[cursor] if cursor >= 0 else None), marks


def _next_letter_index(text: str, index: int):
    cursor = index + 1
    while cursor < len(text) and _is_mark(text[cursor]):
        cursor += 1
    return cursor if cursor < len(text) else None


def _sites(text: str):
    """(hamza_index, waw_index) wherever the shared precondition holds."""
    sites = []
    for index, ch in enumerate(text):
        if ch != BARE:
            continue
        previous, marks = _prev_letter(text, index)
        if previous not in LONG_ALEF or (marks & SHORT_VOWELS):
            continue
        waw_index = _next_letter_index(text, index)
        if waw_index is None or text[waw_index] != WAW:
            continue
        sites.append((index, waw_index))
    return sites


def _after_waw(text: str, waw_index: int) -> str:
    """What follows the plural waw: WORD_FINAL, OTIOSE_ALEF_ONLY or REAL_AFFIX."""
    nxt = _next_letter_index(text, waw_index)
    if nxt is None:
        return "WORD_FINAL"
    if text[nxt] == ALEF:
        after_alef = _next_letter_index(text, nxt)
        if after_alef is None or text[after_alef] == ROUNDED_ZERO:
            return "OTIOSE_ALEF_ONLY"
    return "REAL_AFFIX"


# --------------------------------------------------------------------------
# The rules
# --------------------------------------------------------------------------
def r_hc1a(text: str):
    return [{"offset": hamza_index, "delete": BARE, "insert": WAW_HAMZA,
             "role": "HAMZA_CARRIER"}
            for hamza_index, waw_index in _sites(text)
            if _after_waw(text, waw_index) == "REAL_AFFIX"]


def r_hc1_plus_o4(text: str):
    edits = []
    for hamza_index, waw_index in _sites(text):
        if _after_waw(text, waw_index) != "WORD_FINAL":
            continue
        insert_at = waw_index + 1
        while insert_at < len(text) and _is_mark(text[insert_at]):
            insert_at += 1
        edits.append({"offset": hamza_index, "delete": BARE,
                      "insert": WAW_HAMZA, "role": "HAMZA_CARRIER"})
        edits.append({"offset": insert_at, "delete": "", "insert": ALEF,
                      "role": "OTIOSE_ALEF", "bound_to_carrier_at": hamza_index})
    return sorted(edits, key=lambda e: e["offset"])


RULES = {HC1A: r_hc1a, HC1_PLUS_O4: r_hc1_plus_o4}
RULE_ORDER = tuple(sorted(RULES))


def derive(form: str, rule_id: str):
    """(variant, edits) or (None, []). Every condition is checked before return."""
    edits = RULES[rule_id](form)
    if not edits:
        return None, []
    variant = apply_edits(form, edits)
    if variant == form:
        return None, []
    if invert(variant, edits) != form:
        raise ValueError(f"{rule_id} is not reverse-verifiable on {form!r}")
    for edit in edits:
        if edit["role"] == "HAMZA_CARRIER" and not (
                edit["delete"] in CARRIERS and edit["insert"] in CARRIERS):
            raise ValueError(f"{rule_id} carrier edit left the carrier set")
        if edit["role"] == "OTIOSE_ALEF" and "bound_to_carrier_at" not in edit:
            raise ValueError(f"{rule_id} emitted an unbound alef edit")
    return variant, edits


def extra_forms(analysis_forms, enabled=RULE_ORDER):
    """Every new analyzer input the enabled rules produce for one token.

    Deterministic order: rule id, then the position of the source form. Each
    entry carries its rule, its source form and its edit script, so nothing in
    the output is unattributable.
    """
    known = set(analysis_forms)
    produced, seen = [], set()
    for rule_id in enabled:
        for form in analysis_forms:
            variant, edits = derive(form, rule_id)
            if variant is None or variant in known or variant in seen:
                continue
            seen.add(variant)
            produced.append({
                "analyzer_form": variant,
                "from_form": form,
                "rule": rule_id,
                "rule_chain": [rule_id],
                "edits": edits,
                "edit_codepoints": [
                    {"offset": e["offset"], "role": e["role"],
                     "delete": codepoints(e["delete"]) if e["delete"] else "",
                     "insert": codepoints(e["insert"]),
                     **({"bound_to_carrier_at": e["bound_to_carrier_at"]}
                        if "bound_to_carrier_at" in e else {})}
                    for e in edits],
            })
    return produced
