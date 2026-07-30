"""Closed, notation-licensed orthographic rules for the ANALYSER INPUT only.

These four rules decode an explicit Uthmani notation codepoint into the letter
it stands for. They exist for one purpose: to build an additional analyzer input
string for a Quranic token. They never touch the canonical Tanzil text, never
read teacher root/lemma/POS, and carry no token allowlist, verse-key filter or
surface list of any kind - a rule fires wherever its codepoint condition holds
and nowhere else.

A rule does not return a string, it returns an EDIT SCRIPT: a list of
`{offset, delete, insert}` in input coordinates. The output string is derived
from the edit script and `invert()` rebuilds the input from the output, so
"reverse-verifiable at codepoint level" is a machine condition, checked on every
variant this module hands out.

    O1a U+06E5 -> U+0648, when the preceding LETTER is not U+0647
    O2a U+06E6 -> U+064A, when the preceding LETTER is not U+0647
    O5  U+0635 (+harakat) U+06DC   -> U+0633 (+harakat)

The U+0647 guard on O1a/O2a is a single neighbouring codepoint, not a list of
tokens. It exists because U+06E5/U+06E6 notate two different things and the
repo already says so: over a stem letter the small waw/yeh spells a consonant
the line omits (يَسْتَوُۥنَ = يستوون), but on the 3sg enclitic pronoun هُۥ / هِۦ it
spells the LENGTH of the pronoun vowel - there is no omitted consonant, and
writing one produces وليهو for وَلِيُّهُۥ. Measured unguarded over the whole corpus,
that second class cost 17 previously CORRECT selections and gained nothing.

Deliberately NOT here:
    O3  [ا و ي ى] U+06DF -> (nothing)  WITHDRAWN FROM PRODUCTION. Measured over
                                       the whole corpus it moved 5 tokens
                                       RECALL_GAP->CORRECT but also cost 5
                                       CORRECT selections and created 5 new
                                       INCORRECT ones. Gain and regression share
                                       an identical codepoint structure -
                                       نَدْعُوا۟ (gain) against كَاشِفُوا۟ (new
                                       INCORRECT) differ only morphologically -
                                       so no narrower general condition
                                       separates them, and a token allowlist is
                                       not an option. The one structural
                                       narrowing available (keep the alef that
                                       follows U+0648) deletes every gain along
                                       with every regression.
    O4X word-final U+0648 -> +U+0627   REJECTED (0 closures; what the جَآءُو family
                                       actually needs is a hamza carrier change)
    O6X word-final U+0627 -> U+0649    DEFERRED (no source notation licenses it)
"""

from __future__ import annotations

import re

ALEF = "ا"            # U+0627
WAW = "و"             # U+0648
YEH = "ي"             # U+064A
MAQSURA = "ى"         # U+0649
SEEN = "س"            # U+0633
HEH = "ه"             # U+0647
SAD = "ص"             # U+0635
SMALL_WAW = "ۥ"       # U+06E5
SMALL_YEH = "ۦ"       # U+06E6
ROUNDED_ZERO = "۟"    # U+06DF
SMALL_SEEN = "ۜ"      # U+06DC
HARAKAT = "ًٌٍَُِّْٰ"

QURAN_MARKS = re.compile("[ۖ-ۭ]")

SILENT_CARRIERS = ALEF + WAW + YEH + MAQSURA
_SILENT_LETTER_RE = re.compile(f"([{SILENT_CARRIERS}]){ROUNDED_ZERO}")
_SMALL_SEEN_RE = re.compile(f"{SAD}([{HARAKAT}]*){SMALL_SEEN}")

RULE_DOC = {
    "O1a_SMALL_WAW_TO_WAW_NOT_AFTER_HEH":
        "U+06E5 -> U+0648, only where the preceding letter is not U+0647. Over a "
        "stem letter the Uthmani small waw notates a waw the line omits; on the "
        "3sg enclitic pronoun هُۥ it notates the pronoun vowel's length instead.",
    "O2a_SMALL_YEH_TO_YEH_NOT_AFTER_HEH":
        "U+06E6 -> U+064A, under the same U+0647 guard, for the same reason (هِۦ).",
    "O5_SMALL_SEEN_SAD_TO_SEEN":
        "U+0635 (+harakat) U+06DC -> U+0633 (+harakat). U+06DC over a sad "
        "notates a sad recited as a seen.",
}


# --------------------------------------------------------------------------
# Edit-script machinery
# --------------------------------------------------------------------------
def apply_edits(text: str, edits) -> str:
    out, cursor = [], 0
    for edit in edits:
        offset = edit["offset"]
        if offset < cursor:
            raise ValueError("overlapping edits")
        out.append(text[cursor:offset])
        if text[offset:offset + len(edit["delete"])] != edit["delete"]:
            raise ValueError("edit does not match its input")
        out.append(edit["insert"])
        cursor = offset + len(edit["delete"])
    out.append(text[cursor:])
    return "".join(out)


def invert(result: str, edits) -> str:
    out, cursor, shift = [], 0, 0
    for edit in edits:
        offset = edit["offset"] + shift
        out.append(result[cursor:offset])
        if result[offset:offset + len(edit["insert"])] != edit["insert"]:
            raise ValueError("inverse does not match its input")
        out.append(edit["delete"])
        cursor = offset + len(edit["insert"])
        shift += len(edit["insert"]) - len(edit["delete"])
    out.append(result[cursor:])
    return "".join(out)


def codepoints(text: str) -> str:
    return " ".join(f"U+{ord(ch):04X}" for ch in text)


# --------------------------------------------------------------------------
# The rules
# --------------------------------------------------------------------------
MARKS = set(HARAKAT) | {"ـ"} | {chr(c) for c in range(0x0653, 0x0656)} | {
    chr(c) for c in range(0x06D6, 0x06EE)}


def _preceding_letter(text: str, index: int):
    """The letter before `index`, skipping every combining/annotation mark."""
    cursor = index - 1
    while cursor >= 0 and text[cursor] in MARKS:
        cursor -= 1
    return text[cursor] if cursor >= 0 else None


def r_small_waw_not_after_heh(text: str):
    return [{"offset": i, "delete": SMALL_WAW, "insert": WAW}
            for i, ch in enumerate(text)
            if ch == SMALL_WAW and _preceding_letter(text, i) != HEH]


def r_small_yeh_not_after_heh(text: str):
    return [{"offset": i, "delete": SMALL_YEH, "insert": YEH}
            for i, ch in enumerate(text)
            if ch == SMALL_YEH and _preceding_letter(text, i) != HEH]


def r_silent_letter(text: str):
    """WITHDRAWN from production - kept only so the withdrawal is reproducible."""
    return [{"offset": m.start(), "delete": m.group(0), "insert": ""}
            for m in _SILENT_LETTER_RE.finditer(text)]


def r_small_seen(text: str):
    return [{"offset": m.start(),
             "delete": SAD + m.group(1) + SMALL_SEEN,
             "insert": SEEN + m.group(1)}
            for m in _SMALL_SEEN_RE.finditer(text)]


RULES = {
    "O1a_SMALL_WAW_TO_WAW_NOT_AFTER_HEH": r_small_waw_not_after_heh,
    "O2a_SMALL_YEH_TO_YEH_NOT_AFTER_HEH": r_small_yeh_not_after_heh,
    "O5_SMALL_SEEN_SAD_TO_SEEN": r_small_seen,
}
WITHDRAWN_RULES = {"O3_SILENT_LETTER_DROP": r_silent_letter}
RULE_ORDER = tuple(sorted(RULES))


def derive(form: str, rule_id: str):
    """(variant, edits) or (None, []). The inverse is checked before returning."""
    edits = RULES[rule_id](form)
    if not edits:
        return None, []
    variant = apply_edits(form, edits)
    if variant == form:
        return None, []
    if invert(variant, edits) != form:
        raise ValueError(f"{rule_id} is not reverse-verifiable on {form!r}")
    return variant, edits


def extra_forms(analysis_forms, hamza_pass=None, enabled=RULE_ORDER):
    """Every new analyzer input the enabled rules produce for one token.

    Deterministic order: rule id, then the position of the source form, then the
    seed (the form itself before its mark-stripped twin). `hamza_pass` is the
    FROZEN R1-R3 rewrite; when supplied it is applied to each derived variant so
    the same rules that already run on every other analyzer input also run on
    these. It is never modified here.

    Returns a list of dicts, each carrying its rule, its source form and its
    edit script, so nothing in the output is unattributable.
    """
    known = set(analysis_forms)
    produced, seen = [], set()
    for rule_id in enabled:
        for form in analysis_forms:
            for seed in dict.fromkeys((form, QURAN_MARKS.sub("", form))):
                variant, edits = derive(seed, rule_id)
                if variant is None:
                    continue
                chain = [(variant, [rule_id])]
                if hamza_pass is not None:
                    hamza_variant, hamza_rules = hamza_pass(variant)
                    if hamza_rules and hamza_variant != variant:
                        chain.append((hamza_variant, [rule_id, *hamza_rules]))
                for text, rule_chain in chain:
                    if not text or text in known or text in seen:
                        continue
                    seen.add(text)
                    produced.append({
                        "analyzer_form": text,
                        "from_form": seed,
                        "rule": rule_id,
                        "rule_chain": rule_chain,
                        "edits": edits,
                        "edit_codepoints": [
                            {"offset": e["offset"],
                             "delete": codepoints(e["delete"]),
                             "insert": codepoints(e["insert"])} for e in edits],
                    })
    return produced
