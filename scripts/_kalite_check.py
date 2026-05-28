import json, re, sys
sys.stdout.reconfigure(encoding="utf-8")

with open("data/normalized/translations.json", encoding="utf-8") as f:
    data = json.load(f)

ENC_RE = re.compile(r"[&]|(?:Ã|�|Ù|Ø)")
DIG_RE = re.compile(r"[A-Za-zÇĞİÖŞÜçğıöşü]['’ʼ]?[01][A-Za-z]")

def kalite(text):
    if not text or not text.strip(): return "empty"
    if re.search(r"allah.{0,5}adiyl[ae]", text, re.I): return "ascii_turkish_loss"
    if DIG_RE.search(text): return "digit_substitution"
    if re.search(r"\[\d+\]", text): return "footnote_residue"
    if ENC_RE.search(text): return "encoding_residue"
    return None

aktif = {"diyanet", "yazir", "bulac", "ozturk", "vakfi"}
for surah, ayah in [(1, 7), (112, 1)]:
    r = next(r for r in data if r["surahId"] == surah and r["ayahNumber"] == ayah)
    print(f"{surah}:{ayah}")
    for t in r["translations"]:
        if t["source"] in aktif:
            sorun = kalite(t.get("text", ""))
            txt = (t.get("text") or "")[:70]
            print(f"  {t['source']:<10} status={t['status']:<12} kalite={sorun or 'OK':<20} {txt}")
    print()
