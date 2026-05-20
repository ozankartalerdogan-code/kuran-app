# vNext Conflict Resolution Matrix Audit

Bu audit, guncel full global snapshot sonrasi kalan `needsManualReview` conflict'lerini termClass + conflictType + resolutionCandidate matrisiyle siniflandirir. Runtime, UI, default source, v4 default, kaynak veri ve classifier kodu degistirilmedi.

## Kapsam

- Islenen ayet: 6236
- Hata: 0
- NeedsManualReview conflict: 6139
- Unique matrix grup: 3492
- Global snapshot reported needsManualReview: 6139

## TermClass Dagilimi

- `unknown`: 4461
- `content`: 793
- `profile_bound`: 514
- `generic`: 322
- `proper_noun`: 49

## ConflictType Dagilimi

- `unresolved`: 4461
- `source_gap`: 641
- `profile_mismatch`: 514
- `noise_collision`: 322
- `term_overlap`: 201

## ResolutionCandidate Dagilimi

- `keep_manual`: 4461
- `useful_addition_candidate`: 641
- `profile_dependent_manual`: 514
- `drop_debug`: 322
- `risky_drop_candidate`: 201

## Matrix Hucreleri

| termClass | conflictType | resolutionCandidate | count |
|---|---|---|---:|
| unknown | unresolved | keep_manual | 4461 |
| content | source_gap | useful_addition_candidate | 600 |
| profile_bound | profile_mismatch | profile_dependent_manual | 514 |
| generic | noise_collision | drop_debug | 322 |
| content | term_overlap | risky_drop_candidate | 193 |
| proper_noun | source_gap | useful_addition_candidate | 41 |
| proper_noun | term_overlap | risky_drop_candidate | 8 |

## Batch 2 Uyumluluk

- Batch 2 karar sayisi: 30
- Matrix ile uyumlu: 28
- Uymayan/riskli: 2

| Rank | Term | Batch2 Decision | Matrix TermClass | Matrix ConflictType | Matrix Resolution | Match | Count |
|---:|---|---|---|---|---|---|---:|
| 4 | `gündüz` | `likelyUsefulV4Addition` | `profile_bound` | `profile_mismatch` | `profile_dependent_manual` | no | 22 |
| 8 | `ümmet, topluluk` | `likelyRiskyDrop` | `content` | `term_overlap` | `risky_drop_candidate` | yes | 12 |
| 9 | `güzel` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 12 |
| 11 | `Büyük` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 12 |
| 14 | `gündüz` | `likelyUsefulV4Addition` | `profile_bound` | `profile_mismatch` | `profile_dependent_manual` | no | 11 |
| 17 | `Mümin` | `likelyRiskyDrop` | `content` | `term_overlap` | `risky_drop_candidate` | yes | 10 |
| 20 | `sahipler, arkadaşlar` | `likelyRiskyDrop` | `content` | `term_overlap` | `risky_drop_candidate` | yes | 10 |
| 27 | `süslemek` | `likelyUsefulV4Addition` | `content` | `source_gap` | `useful_addition_candidate` | yes | 10 |
| 30 | `Mümin` | `likelyRiskyDrop` | `content` | `term_overlap` | `risky_drop_candidate` | yes | 10 |
| 31 | `geçici fayda` | `likelyRiskyDrop` | `content` | `term_overlap` | `risky_drop_candidate` | yes | 10 |
| 32 | `Mümin` | `likelyRiskyDrop` | `content` | `term_overlap` | `risky_drop_candidate` | yes | 10 |
| 33 | `uyarıcı` | `likelyRiskyDrop` | `content` | `term_overlap` | `risky_drop_candidate` | yes | 10 |
| 34 | `vaat etti` | `likelyRiskyDrop` | `content` | `term_overlap` | `risky_drop_candidate` | yes | 10 |
| 35 | `yüksek` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 8 |
| 40 | `şehir` | `likelyUsefulV4Addition` | `content` | `source_gap` | `useful_addition_candidate` | yes | 8 |
| 41 | `daha güzel` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 8 |
| 44 | `yemin etmek` | `likelyUsefulV4Addition` | `content` | `source_gap` | `useful_addition_candidate` | yes | 8 |
| 47 | `altında` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 8 |
| 49 | `tadın` | `likelyUsefulV4Addition` | `content` | `source_gap` | `useful_addition_candidate` | yes | 8 |
| 52 | `büyük` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 8 |
| 54 | `gibi, benzer` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 8 |
| 60 | `teslim olmak` | `likelyUsefulV4Addition` | `content` | `source_gap` | `useful_addition_candidate` | yes | 7 |
| 64 | `arkalarından` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 7 |
| 65 | `yıllar` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 7 |
| 66 | `şüphe` | `likelyUsefulV4Addition` | `content` | `source_gap` | `useful_addition_candidate` | yes | 7 |
| 67 | `kaldım` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 7 |
| 143 | `yakın` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 5 |
| 144 | `sana yeter` | `genericNeutral` | `generic` | `noise_collision` | `drop_debug` | yes | 5 |
| 148 | `İsmail` | `likelyUsefulV4Addition` | `proper_noun` | `source_gap` | `useful_addition_candidate` | yes | 5 |
| 150 | `alıkoymak` | `likelyUsefulV4Addition` | `content` | `source_gap` | `useful_addition_candidate` | yes | 5 |

## Batch 2'den Cikarilmasi Gerekenler

- Rank 4: `gündüz` -> decision `likelyUsefulV4Addition`, matrix `profile_dependent_manual`
- Rank 14: `gündüz` -> decision `likelyUsefulV4Addition`, matrix `profile_dependent_manual`

## Yorum

- `profile_bound` terimler profil bagimli oldugu icin otomatik classifier'a alinmamali.
- `generic/drop_debug` adaylari teknik veya dusuk analiz degeri olan terimlerdir.
- `content/source_gap` adaylari v4 kaynakli faydali ekleme olabilir.
- `content/term_overlap` adaylari v4 tarafinda kaybolan content sinyali oldugu icin risky-drop olarak izlenmeli.

## Sonraki Onerilen Adim

Batch 2, bu matrix'e gore guvenli gorunurse classifier'a exact-match olarak uygulanabilir. Eger riskli satir cikarsa once Batch 2 karar tablosundan cikarilmali.
