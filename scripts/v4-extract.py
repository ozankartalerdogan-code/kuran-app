"""Adim 1: v4 JSON -> updates.csv"""
import json, csv, sys
sys.stdout.reconfigure(encoding="utf-8")

V4 = r"C:\Users\jalek\OneDrive\Masaüstü\kuran_app\data2\processed\canonical_word_analysis_v4.json"
OUT = r"C:\Users\jalek\OneDrive\Masaüstü\kuran_app\scripts\v4-updates.csv"

print("JSON yukleniyor...")
with open(V4, "r", encoding="utf-8") as f:
    v4 = json.load(f)

rows = []
for vk, words in v4.items():
    for w in words:
        m = (w.get("meaning_tr") or "").strip()
        p = w.get("position")
        if m and p is not None:
            rows.append((m, vk, int(p)))

with open(OUT, "w", newline="", encoding="utf-8") as f:
    csv.writer(f).writerows(rows)

print(f"CSV yazildi: {len(rows):,} satir -> {OUT}")
