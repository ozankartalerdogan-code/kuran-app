import os, sys
sys.stdout.reconfigure(encoding='utf-8')
root = 'C:/Users/jalek/OneDrive/Masaüstü/kuran_app'

RUNTIME_READ = {
    'data/app.db','data/kuran.db','data/kuran_core.db',
    'data/normalized/arabic.json','data/normalized/surah-meta.json',
    'data/normalized/translations.json','data/normalized/tafsir.json',
    'data/tafsir/surah/index.json','data/tafsir/ayah-ranges/index.json',
    'data/revelation-context/surah/index.json',
    'data/revelation-context/tdv-methodology.json',
    'data/word-analysis/quran-morphology.txt',
    'data/word-analysis/word-translations-tr.json',
    'data/word-analysis/extended-roots.json',
    'data/word-analysis/reports/coverage-by-ayah.json',
    'data/word-analysis/reports/missing-meanings.json',
    'data/source-metadata/github-sources.json',
    'data/context/normalized/surah-context.json',
    'data2/processed/canonical_word_analysis.json',
    'data2/processed/canonical_word_analysis_v2.json',
    'data2/processed/canonical_word_analysis_v3.json',
    'data2/processed/canonical_word_analysis_v4.json',
    'data2/processed/root_explanations_tr_v2_easy_only.json',
}

PIPELINE_READ = {
    'data/fidelity/by-surah/index.json',
    'data/quran/transliteration.json',
    'data/word-analysis/reports/root-explanations.json',
}

SCRIPT_SNAPSHOT_REFS = {
    'data/analysis-snapshots/meal-comparison-encoding-audit.json',
    'data/analysis-snapshots/root-explanations-v2-impact-audit.json',
    'data/analysis-snapshots/root-explanations-v2-risk-gated-audit.json',
    'data/analysis-snapshots/v4-keyterms-visibility-drift-audit.temp.json',
    'data/analysis-snapshots/verse-analysis-json-audit-1000.json',
    'data/analysis-snapshots/verse-analysis-v3-audit-1000.json',
    'data/analysis-snapshots/verse-analysis-v4-audit-1000.json',
    'data/analysis-snapshots/vnext-conflict-resolution-matrix-audit.json',
    'data/analysis-snapshots/vnext-evidence-layer-global-audit.json',
    'data/analysis-snapshots/vnext-structured-classifier-audit.json',
    'data/analysis-snapshots/vnext-structured-term-parse-pilot.json',
}

SCRIPT_DATA_REFS = {
    'data2/processed/root_explanations_review_batch_733_FINAL.csv',
    'data2/processed/root_explanations_tr_enriched.json',
    'data2/processed/root_explanations_tr_v2.json',
}

all_files = []
for base in ['data', 'data2']:
    base_path = os.path.join(root, base)
    if not os.path.exists(base_path):
        continue
    for dirpath, dirs, files in os.walk(base_path):
        dirs[:] = [d for d in dirs if d not in ('data_backup','node_modules','.next','external')]
        for f in sorted(files):
            fp = os.path.join(dirpath, f)
            rel = os.path.relpath(fp, root).replace('\\', '/')
            size = os.path.getsize(fp)
            all_files.append((rel, size))

print(f'Toplam dosya: {len(all_files)}')
print()

safe_delete = []
risky       = []
keep        = []

def mb(s):
    if s >= 1024*1024:
        return f'{s/1024/1024:.1f} MB'
    return f'{s/1024:.0f} KB'

for rel, size in all_files:
    # --- DB dosyaları ---
    if rel.endswith('.db'):
        if rel == 'data/kuran_sorgu.db' and size == 0:
            safe_delete.append((rel, size, 'sifir byte, hic referans yok'))
        elif rel in RUNTIME_READ:
            keep.append((rel, size, 'runtime okuma'))
        else:
            risky.append((rel, size, 'DB - referans belirsiz'))
        continue

    # --- meal-comparison/by-surah/*.json ---
    if rel.startswith('data/meal-comparison/by-surah/'):
        risky.append((rel, size, 'pipeline okuma + app.db meal_comparisons importu var — pipeline bozulur'))
        continue

    # --- Runtime okunan ---
    if rel in RUNTIME_READ:
        keep.append((rel, size, 'runtime adapter okuma'))
        continue

    # --- Pipeline okunan ---
    if rel in PIPELINE_READ:
        keep.append((rel, size, 'pipeline build-time okuma'))
        continue

    # --- analysis-audit ---
    if rel.startswith('data/analysis-audit/'):
        safe_delete.append((rel, size, 'script ciktisi, runtime referansi yok, yeniden uretilebilir'))
        continue

    # --- analysis-snapshots ---
    if rel.startswith('data/analysis-snapshots/'):
        if rel in SCRIPT_SNAPSHOT_REFS:
            risky.append((rel, size, 'audit scripti tarafindan input olarak okunuyor'))
        else:
            safe_delete.append((rel, size, 'script ciktisi snapshot, runtime referansi yok'))
        continue

    # --- data/quran/ ---
    if rel.startswith('data/quran/'):
        if 'transliteration' in rel:
            keep.append((rel, size, 'pipeline buildNormalizedCaches okuma'))
        elif 'surahs.json' in rel:
            risky.append((rel, size, 'quran/surahs.json - kullanimi dogrulanmadi'))
        else:
            risky.append((rel, size, 'data/quran/ - kullanimi dogrulanmadi'))
        continue

    # --- data2/processed/ ---
    if rel.startswith('data2/processed/'):
        if rel in RUNTIME_READ:
            keep.append((rel, size, 'runtime adapter okuma'))
        elif rel in SCRIPT_DATA_REFS:
            risky.append((rel, size, 'audit scripti tarafindan okunuyor'))
        else:
            safe_delete.append((rel, size, 'data2/processed - runtime referansi yok, yeniden uretilebilir'))
        continue

    # --- data/word-analysis/ ---
    if rel.startswith('data/word-analysis/'):
        if rel in RUNTIME_READ or rel in PIPELINE_READ:
            keep.append((rel, size, 'runtime/pipeline okuma'))
        else:
            risky.append((rel, size, 'word-analysis/ - kullanimi dogrulanmadi'))
        continue

    # --- fidelity/by-surah/ (index.json disindakiler) ---
    if rel.startswith('data/fidelity/'):
        if rel in PIPELINE_READ:
            keep.append((rel, size, 'pipeline okuma + fidelityAdapter runtime (DB\'e gecirildi ama pipeline hala okuyor)'))
        else:
            risky.append((rel, size, 'fidelity/ - tam referansi bilinmiyor'))
        continue

    # --- Diger ---
    risky.append((rel, size, 'kod referansi bulunamadi'))

# Ozet
total_safe = sum(s for _,s,_ in safe_delete)
total_risky = sum(s for _,s,_ in risky)
total_keep = sum(s for _,s,_ in keep)

print('='*72)
print(f'GUVENLE SILINEBILIR — {len(safe_delete)} dosya, {mb(total_safe)}')
print('='*72)
for rel, size, reason in sorted(safe_delete, key=lambda x: -x[1]):
    print(f'  {mb(size):>10}  {rel}')
    print(f'              {reason}')

print()
print('='*72)
print(f'RISKLI — {len(risky)} dosya, {mb(total_risky)}')
print('='*72)
# meal-comparison dosyalarini toplu goster
mc_files = [(r,s,rs) for r,s,rs in risky if r.startswith('data/meal-comparison/')]
other_risky = [(r,s,rs) for r,s,rs in risky if not r.startswith('data/meal-comparison/')]
if mc_files:
    mc_total = sum(s for _,s,_ in mc_files)
    print(f'  [data/meal-comparison/by-surah/*.json]  114 dosya, {mb(mc_total)}')
    print(f'              pipeline okuma + app.db meal_comparisons importu var')
for rel, size, reason in sorted(other_risky, key=lambda x: -x[1]):
    print(f'  {mb(size):>10}  {rel}')
    print(f'              {reason}')

print()
print('='*72)
print(f'KESINLIKLE KORUNACAK — {len(keep)} dosya, {mb(total_keep)}')
print('='*72)
for rel, size, reason in sorted(keep, key=lambda x: -x[1]):
    print(f'  {mb(size):>10}  {rel}')
    print(f'              {reason}')
