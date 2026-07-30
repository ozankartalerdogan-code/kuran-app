"""Closed, surface-only hamza/madda orthography rescue rules.

These rules exist for ONE purpose: to build an alternative *analyzer input*
string for a Quranic token whose Uthmani hamza spelling is not the MSA lexicon
spelling. They never touch the canonical Tanzil text, never touch the exported
`arabic` field, and never look at teacher root/lemma/POS.

The rule set is deliberately closed. It only rewrites hamza-family orthography
(U+0621 hamza, U+0654 combining hamza-above on a kashida carrier). It performs
NO general alif folding (أ/إ/آ/ٱ -> ا), NO ta-marbuta folding and NO
ya-maqsura folding.

Every produced variant carries (original_form, analyzer_form, rescue_rule).
"""

from __future__ import annotations

import re

HAMZA = "ء"          # ء
ALEF_MADDA = "آ"     # آ
ALEF_HAMZA_ABOVE = "أ"  # أ
WAW_HAMZA = "ؤ"      # ؤ
ALEF_HAMZA_BELOW = "إ"  # إ
YEH_HAMZA = "ئ"      # ئ
ALEF = "ا"
WAW = "و"
YEH = "ي"
ALEF_MAQSURA = "ى"
ALEF_WASLA = "ٱ"
TATWEEL = "ـ"
HAMZA_ABOVE = "ٔ"    # combining ٔ
HAMZA_BELOW = "ٕ"

FATHA = "َ"
DAMMA = "ُ"
KASRA = "ِ"
SUKUN = "ْ"
FATHATAN = "ً"
DAMMATAN = "ٌ"
KASRATAN = "ٍ"
SHADDA = "ّ"
DAGGER_ALEF = "ٰ"

HARAKAT = {FATHA, DAMMA, KASRA, SUKUN, FATHATAN, DAMMATAN, KASRATAN, SHADDA}
# Marks that may sit between a hamza and its neighbour without breaking the
# orthographic context (Quranic annotation marks, tatweel, dagger alif).
TRANSPARENT = set(HARAKAT) | {DAGGER_ALEF, TATWEEL} | {
    chr(c) for c in range(0x06D6, 0x06EE)
} | {chr(c) for c in range(0x0653, 0x0656)}

LONG_VOWELS = {ALEF, WAW, YEH, ALEF_MAQSURA, ALEF_WASLA, ALEF_MADDA}

RULE_MADDA = "R1_HAMZA_ALEF_TO_MADDA"
RULE_CARRIER = "R2_HAMZA_CARRIER_BY_VOWEL_STRENGTH"
RULE_KASHIDA = "R3_KASHIDA_HAMZA_TO_YEH_HAMZA"

RULE_DOC = {
    RULE_MADDA: "ء + (fatha) + ا  ->  آ   (Uthmani decomposed madda; not applied after a long vowel)",
    RULE_CARRIER: "bare ء -> ئ/ؤ/أ by classical carrier strength kasra>damma>fatha>sukun; hamza after a long vowel stays on the line",
    RULE_KASHIDA: "ـ + U+0654 (hamza above a kashida carrier) -> bare ء, then R2 picks the carrier",
}

# Surface motifs used for clustering. Detection is purely orthographic.
MOTIF_MADDA_SEQ = "HAMZA_ALEF_SEQUENCE"
MOTIF_HAMZA_WAW_SEQ = "HAMZA_WAW_SEQUENCE"
MOTIF_HAMZA_YEH_SEQ = "HAMZA_YEH_SEQUENCE"
MOTIF_HAMZA_AFTER_LONG = "HAMZA_AFTER_LONG_VOWEL"
MOTIF_HAMZA_BARE_OTHER = "HAMZA_BARE_OTHER"
MOTIF_KASHIDA_HAMZA = "KASHIDA_HAMZA_ABOVE"
MOTIF_NO_HAMZA_FAMILY = "NO_BARE_HAMZA"


_KASHIDA_RE = re.compile(f"{TATWEEL}([{''.join(sorted(HARAKAT))}]*){HAMZA_ABOVE}")


def _strip_transparent(text: str) -> str:
    return "".join(ch for ch in text if ch not in TRANSPARENT)


def _prev_significant(text: str, index: int):
    """Return (char, harakat_set, position) for the letter preceding `index`."""
    marks = set()
    i = index - 1
    while i >= 0 and text[i] in TRANSPARENT:
        marks.add(text[i])
        i -= 1
    return (text[i] if i >= 0 else None, marks, i)


def _own_marks(text: str, index: int) -> set:
    marks = set()
    i = index + 1
    while i < len(text) and text[i] in TRANSPARENT:
        marks.add(text[i])
        i += 1
    return marks


def _next_significant(text: str, index: int):
    i = index + 1
    while i < len(text) and text[i] in TRANSPARENT:
        i += 1
    return text[i] if i < len(text) else None


def _is_long_vowel(char, marks, position: int) -> bool:
    """A waw/yeh/alef is a long vowel only when it carries no short vowel and is
    not word-initial.

    وَءَامِنُوا has a *consonantal* waw (fatha on it) and وءامنوا has the same waw
    in word-initial position, where no long vowel can stand - in both spellings
    the hamza that follows is still a carrier position. جَآءَ / جاءه has a bare
    non-initial alef, so its hamza stays on the line.
    """
    if char not in LONG_VOWELS or position <= 0:
        return False
    return not (set(marks) & {FATHA, DAMMA, KASRA, FATHATAN, DAMMATAN, KASRATAN, SHADDA})


def motifs(form: str) -> list[str]:
    """Surface-only clustering of a token. No lexicon, no teacher data."""
    found = set()
    bare = _strip_transparent(form)
    if TATWEEL + HAMZA_ABOVE in form or (HAMZA_ABOVE in form and TATWEEL in form):
        found.add(MOTIF_KASHIDA_HAMZA)
    for index, ch in enumerate(form):
        if ch != HAMZA:
            continue
        prev_char, prev_marks, prev_pos = _prev_significant(form, index)
        nxt = _next_significant(form, index)
        if _is_long_vowel(prev_char, prev_marks, prev_pos):
            found.add(MOTIF_HAMZA_AFTER_LONG)
        elif nxt == ALEF:
            found.add(MOTIF_MADDA_SEQ)
        elif nxt == WAW:
            found.add(MOTIF_HAMZA_WAW_SEQ)
        elif nxt in (YEH, ALEF_MAQSURA):
            found.add(MOTIF_HAMZA_YEH_SEQ)
        else:
            found.add(MOTIF_HAMZA_BARE_OTHER)
    if not found:
        found.add(MOTIF_NO_HAMZA_FAMILY)
    del bare
    return sorted(found)


def _carrier_for(prev_marks: set, own_marks: set) -> str:
    """Classical carrier choice: kasra > damma > fatha > sukun."""
    pool = set(prev_marks) | set(own_marks)
    if KASRA in pool or KASRATAN in pool:
        return YEH_HAMZA
    if DAMMA in pool or DAMMATAN in pool:
        return WAW_HAMZA
    if FATHA in pool or FATHATAN in pool:
        return ALEF_HAMZA_ABOVE
    return HAMZA


def apply_rules(form: str) -> tuple[str, list[str]]:
    """Rewrite hamza orthography. Returns (variant, applied_rule_ids)."""
    applied: list[str] = []
    text = form

    # R3 first: the kashida is a carrier-neutral seat, decomposed to a bare hamza so
    # that R2 chooses the MSA carrier from the surrounding vowels instead of
    # hard-coding one (تَسْـَٔلُوا -> تسأل, أَنۢبِـُٔونِى -> أنبئون).
    def _kashida(match: re.Match) -> str:
        return HAMZA + match.group(1)

    rewritten = _KASHIDA_RE.sub(_kashida, text)
    if rewritten != text:
        text = rewritten
        applied.append(RULE_KASHIDA)

    out: list[str] = []
    index = 0
    while index < len(text):
        ch = text[index]
        if ch != HAMZA:
            out.append(ch)
            index += 1
            continue

        prev_char, prev_marks, prev_pos = _prev_significant(text, index)
        own = _own_marks(text, index)
        nxt = _next_significant(text, index)

        if _is_long_vowel(prev_char, prev_marks, prev_pos):
            # جاء / تساءل: hamza after a long vowel stays on the line.
            out.append(ch)
            index += 1
            continue

        if nxt == ALEF and (FATHA in own or not own):
            # R1: ءَا -> آ. The alif and the marks between are consumed.
            out.append(ALEF_MADDA)
            applied.append(RULE_MADDA)
            index += 1
            while index < len(text) and text[index] in TRANSPARENT:
                index += 1
            if index < len(text) and text[index] == ALEF:
                index += 1
            continue

        if nxt is None and not (KASRA in own or DAMMA in own) and (
            SUKUN in prev_marks or not (prev_marks & HARAKAT)
        ):
            # Word-final hamza after a sukun-bearing consonant stays on the line
            # (الخبْء, الدفْء). The case mark on the hamza is not a carrier cue.
            out.append(ch)
            index += 1
            continue

        carrier = _carrier_for(prev_marks, own)
        if carrier != HAMZA:
            out.append(carrier)
            applied.append(RULE_CARRIER)
        else:
            out.append(ch)
        index += 1

    variant = "".join(out)
    if variant == form:
        return form, []
    # Deduplicate rule ids while keeping a deterministic order.
    ordered = [r for r in (RULE_MADDA, RULE_CARRIER, RULE_KASHIDA) if r in applied]
    return variant, ordered


def triggers(form: str) -> bool:
    variant, rules = apply_rules(form)
    return bool(rules) and variant != form
