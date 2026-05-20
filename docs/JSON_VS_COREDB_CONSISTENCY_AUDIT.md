# JSON vs coreDb Consistency Audit

- Compared verses: 28
- Same selected profile: 28/28
- Meaningful main axis differences: 0
- Overall same: 0
- Overall minor difference: 19
- Overall meaningful difference: 3
- Overall missing in one source: 0
- Overall preview risk: 6
- coreDb richer visible key terms: 0
- coreDb noisier term signal count: 6

## Summary

This audit compares the 28-verse Kanitli Analiz quality set across `json` and `coreDb` sources.
The current checkpoint suggests that profile selection is stable across sources, while most remaining differences come from source availability labels, supporting-term richness, and occasional preview noisiness rather than category drift.

## Verses With Non-Same Results

- `1:5` (dua_kulluk): meaningful_difference
  Notes: source_availability_differs_between_json_and_coredb
- `1:7` (yol_hidayet): preview_risk
  Notes: coreDb_supporting_terms_look_noisier; source_availability_differs_between_json_and_coredb
- `2:2` (yol_hidayet): meaningful_difference
  Notes: source_availability_differs_between_json_and_coredb
- `2:6` (uyari_inkar): meaningful_difference
  Notes: source_availability_differs_between_json_and_coredb
- `2:7` (uyari_inkar): preview_risk
  Notes: coreDb_supporting_terms_look_noisier; source_availability_differs_between_json_and_coredb
- `39:53` (rahmet_magfiret): preview_risk
  Notes: coreDb_supporting_terms_look_noisier; source_availability_differs_between_json_and_coredb
- `6:54` (rahmet_magfiret): preview_risk
  Notes: coreDb_supporting_terms_look_noisier; source_availability_differs_between_json_and_coredb
- `12:100` (kissa): preview_risk
  Notes: coreDb_supporting_terms_look_noisier; source_availability_differs_between_json_and_coredb
- `49:12` (emir_yasak): preview_risk
  Notes: coreDb_supporting_terms_look_noisier; source_availability_differs_between_json_and_coredb

## Recommendation

coreDb looks safe for broader audit use and side-by-side preview generation, but it is still early to make it the default source.
The next step should be a broader consistency audit and a targeted review of the verses that show preview-risk or source-status divergence.
