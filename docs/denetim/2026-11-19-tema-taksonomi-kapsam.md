# Theme Taxonomy & Migration Coverage Report

## 1. Taxonomy Counts
- **Groups (`A`–`G`):** 7
- **Level 1 (`ana_tema`):** 24 (merged `B1→B2`, `D2→D1`, `F3→F1`, `G3→G1`; fixed `C4_ILIM_AKIL_TEFEKKÜR` → `C4_ILIM_AKIL_TEFEKKUR`)
- **Level 2 (`alt_taglar`):** 258 total (157 general learner topics + 101 curated `namaz-*`/`korunma-*`/`ismiazam-*`/`dua-*` tags)

## 2. Migration Coverage
- **Distinct `alt_taglar` in `verse_tags`:** 3,158 (total assignments: 20,340)
- **Distinct `tag` in `verse_tag_items`:** 3,255 (total rows: 21,045)
- **Union of distinct tags mapped in `migration.level2`:** 3,267
- **Mapped to kept `level2` code (`alt_taglar`):** 15,134 / 20,340 (**74.41%**)
- **Mapped to kept `level2` code (`verse_tag_items`):** 15,839 / 21,045 (**75.26%**)
- **Distinct tags mapped to `null` (dropped):** 2,534

## 3. Top 30 Merged Groups
| # | Target `level2` Code | Total Assignments | Source Tags Merged |
|---:|---|---:|---|
| 1 | `cehennem` | 1,013 | `azap` (467), `cehennem` (240), `ceza` (95), `ateş` (71), `lanet` (36), +7 more |
| 2 | `kafirler` | 513 | `inkar` (326), `kâfir` (73), `kafir` (73), `küfür` (24), `inkarcı` (10), +2 more |
| 3 | `ilahi-kitap` | 438 | `ayet` (196), `kitap` (153), `öğüt` (85), `zebur` (2), `ayetler` (2) |
| 4 | `allahin-rahmeti` | 411 | `nimet` (115), `rahmet` (109), `yardım` (52), `lütuf` (32), `yardımcı` (25), +8 more |
| 5 | `gokler-yer` | 381 | `yer` (125), `gök` (97), `yeryüzü` (31), `dağ` (27), `gok` (25), +8 more |
| 6 | `peygamberlik` | 377 | `peygamber` (214), `elçi` (65), `peygamberlik` (37), `elci` (26), `risalet` (14), +4 more |
| 7 | `cennet` | 375 | `cennet` (206), `mükafat` (32), `selam` (29), `meyve` (19), `bahçe` (16), +10 more |
| 8 | `iman` | 342 | `iman` (249), `mümin` (45), `müslüman` (19), `mumin` (18), `tasdik` (9), +1 more |
| 9 | `yalan-iftira` | 334 | `yalanlama` (96), `yalan` (62), `iftira` (53), `tuzak` (32), `yalanlamak` (22), +6 more |
| 10 | `hesap` | 282 | `hesap` (92), `ecir` (57), `toplanma` (25), `sorgu` (22), `karşılık` (21), +11 more |
| 11 | `kiyamet` | 266 | `kıyamet` (195), `kaçış` (15), `sur` (12), `din_günü` (12), `kıyamet_saati` (10), +7 more |
| 12 | `gunah-isyan` | 254 | `günah` (75), `kötülük` (46), `isyan` (28), `suçlu` (23), `fasık` (22), +5 more |
| 13 | `hz-musa` | 253 | `musa` (194), `harun` (35), `hızır` (11), `asa` (10), `tur` (3) |
| 14 | `yaratilis` | 252 | `yaratılış` (162), `yaratma` (46), `yaratıcı` (22), `çift` (7), `yaratmak` (7), +3 more |
| 15 | `ahiret` | 245 | `ahiret` (123), `vaat` (45), `dönüş` (45), `ebedi` (15), `donus` (13), +2 more |
| 16 | `tovbe-istigfar` | 240 | `bağışlama` (58), `tevbe` (49), `tövbe` (36), `mağfiret` (23), `pişmanlık` (19), +6 more |
| 17 | `hidayet` | 225 | `hidayet` (190), `doğru_yol` (26), `dogru_yol` (5), `rehber` (4) |
| 18 | `dua` | 207 | `dua` (118), `rabbena` (29), `sığınma` (22), `korunma` (22), `yalvarma` (10), +1 more |
| 19 | `zulm` | 205 | `zulüm` (90), `zalim` (90), `haksızlık` (22), `haksizlik` (3) |
| 20 | `rizik` | 199 | `rızık` (111), `mal` (55), `rizik` (33) |
| 21 | `kuran` | 187 | `kuran` (151), `nur` (23), `furkan` (6), `açıklama` (6), `aciklama` (1) |
| 22 | `sirk` | 185 | `şirk` (73), `put` (51), `ortak` (24), `ortak_koşma` (15), `ortak_kosma` (12), +3 more |
| 23 | `tevhid` | 183 | `allah` (93), `tevhit` (83), `birlik` (4), `tek_ilah` (3) |
| 24 | `savas-baris` | 180 | `savaş` (71), `cihad` (22), `ordu` (18), `allah_yolu` (17), `cihat` (15), +5 more |
| 25 | `ilim` | 179 | `ilim` (144), `bilgi` (35) |
| 26 | `teblig` | 177 | `uyarıcı` (46), `uyarı` (46), `müjde` (25), `davet` (18), `tebliğ` (12), +4 more |
| 27 | `dalalet` | 173 | `sapıklık` (57), `saptırma` (23), `batıl` (19), `dalalet` (18), `sapma` (17), +4 more |
| 28 | `ahde-vefa` | 171 | `yemin` (103), `söz` (19), `ahit` (15), `emanet` (11), `ahd` (11), +3 more |
| 29 | `rabb` | 170 | `rab` (145), `alemlerin_rabbi` (25) |
| 30 | `takva` | 170 | `takva` (159), `sakınma` (10), `muttaki` (1) |

## 4. Dropped High-Frequency Tags (>=10 verses: 35 tags)
| Tag | Verses | Drop Reason |
|---|---:|---|
| `kurtuluş` | 68 | Mixed across worldly deliverance in prophet stories and hereafter salvation; relabel will assign specific topic |
| `fayda` | 37 | Overly generic relational word ('benefit/avail'), not a browsable learner topic |
| `din` | 35 | Overly broad ('religion/judgment/way') without specific subject |
| `üzüntü` | 21 | Generic emotional state across diverse contexts, not a standalone topic |
| `göz` | 20 | Anatomical/literal word match, not a theme |
| `işitme` | 18 | Generic sensory verb/noun, not a standalone theme |
| `haber` | 18 | Generic narrative word ('news/report'), not a theme |
| `görme` | 18 | Generic sensory verb/noun, not a standalone theme |
| `kurtulus` | 17 | Mixed across worldly deliverance in prophet stories and hereafter salvation; relabel will assign specific topic |
| `emir` | 17 | Overly generic ('command'), too broad without subject |
| `sıkıntı` | 15 | Generic emotional/situational state across diverse contexts |
| `zarar` | 14 | Overly generic relational word ('harm'), not a browsable learner topic |
| `açık` | 14 | Generic adjective ('clear/manifest'), not a theme |
| `ücret` | 13 | Ambiguous polysemy (prophet's refusal of wage vs. worldly wage; prompt-specified null) |
| `yol` | 13 | Ambiguous polysemy (physical path/mountain pass vs. spiritual guidance; prompt-specified null) |
| `koruma` | 13 | Ambiguous; curated protection topics are under korunma-* |
| `intikam` | 13 | Context-dependent (divine retribution vs. retaliation), relabel will assign specific topic |
| `ihtilaf` | 13 | Generic relational term ('disagreement/dispute') across many topics |
| `zaman` | 12 | Generic temporal word, not a theme |
| `yorum` | 12 | Generic meta-word ('interpretation'), not a theme |
| `topluluk` | 12 | Generic noun ('group/community'), not a theme |
| `bulut` | 12 | Literal/imagery detail ('cloud'), not a standalone topic |
| `çığlık` | 11 | Narrative detail in destruction stories, covered by helak-kavimler |
| `uyku` | 11 | Generic physiological/metaphorical word |
| `süre` | 11 | Generic temporal word ('term/period'), not a theme |
| `meydan_okuma` | 11 | Rhetorical device rather than a learner topic |
| `kulak` | 11 | Anatomical/literal word match, not a theme |
| `derece` | 11 | Generic noun ('rank/degree'), not a theme |
| `can` | 11 | Generic noun ('soul/life'), too broad |
| `şer` | 10 | Generic abstract noun ('evil/harm'), too broad |
| `yolculuk` | 10 | Generic situational noun, not a standalone theme |
| `sarsıntı` | 10 | Narrative/apocalyptic detail, covered by kiyamet or helak-kavimler |
| `hazine` | 10 | Rare/literal noun ('treasure'), not a core learner topic |
| `gölge` | 10 | Literal/imagery detail ('shade'), not a standalone topic |
| `erkek` | 10 | Generic demographic noun, not a standalone theme |

## 5. Open Questions for Human Reviewer
1. **Non-ASCII curated `dua-*` tags (5 items):** `verse_tag_items` contains `dua-bağışlanma`, `dua-rızık`, `dua-tövbe`, `dua-şifa`, and `dua-şükür` with Turkish characters. To satisfy the contract regex `^[a-z0-9]+(-[a-z0-9]+)*$`, `level2` uses ASCII codes (`dua-bagislanma`, `dua-rizik`, `dua-tovbe`, `dua-sifa`, `dua-sukur`) and `migration.level2` maps the original keys to them. Confirm this is acceptable for DB cleanup.
2. **`dua-tevekkul` command verses:** Per plan section 3A & `samples.csv` (where 5/8 sampled `dua-tevekkul` rows were `WEAK` command verses rather than duas), should `scripts/themes/` move non-dua command verses from `dua-tevekkul` to `tevekkul` during migration?
3. **Prophet naming in EN:** Applied `Moses (Musa)` convention consistently across all prophets (`Abraham (Ibrahim)`, `Noah (Nuh)`, etc.), with `Prophet Muhammad` for `hz-muhammed` and `Mary (Maryam)` for `hz-meryem`. Confirm preference.
4. **Merged prophet pair `hz-ishak-yakup` & `hz-musa` (includes Harun):** Should `hz-harun` or `hz-ishak` / `hz-yakup` be split into separate `level2` entries if learners search for them individually?
5. **Curated `dua-*` granularity:** 85 `dua-*` tags are preserved per contract, many with 1 verse. Should the UI group them under a single `Dua` filter or display all 85?
6. **Sensitivity flags on `F1_PEYGAMBER_KISSALARI` and `G2_DINLER_MENSUPLARI`:** Both are marked `sensitive: true` per contract (`peygamberler`, `din mensupları`). Confirm `F2_HELAK_KAVIMLER` (`sensitive: false`) is appropriate.
