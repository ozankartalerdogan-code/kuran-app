# Device test — phase A

> Not: Rapordaki diğer bağlantılar (xml/txt ve listede olmayan görüntüler) yalnız yerel çalışma klasöründeydi; depoya 10 temsilî görüntü kopyalandı.

- Device: Samsung Galaxy A03 / SM-A035F, R96T80012SY; Android debug dev client.
- Tested 2026-11-19, approximately 13:14–13:40, device time UTC+03:00.
- Repository: master, f6861a6c (release 1.2.2); installed versionName 1.2.1 intentionally ignored.
- Initial app state: Turkish, light theme. Language setting was **System**, not explicit Turkish.
- All artifact paths below are relative to this output directory. Source paths are relative to `apps/mobile/`.
- Screen: 720 px wide; density 300 dpi, so 1 dp = 1.875 px. Touch measurements below use UI hierarchy bounds and source touch padding.

## T1 — notification launch

| Case | Result | Evidence |
|---|---|---|
| Background notification tap | PASS, against current response-handler behavior | Existing prayer-channel notification “Öğle Vakti Girdi” tapped from SystemUI at matched bounds `[135,432][354,468]`. App returned to the home tab: [13-notification-open.png](cihaz-turu-2026-11-19/13-notification-open.jpg). |
| Process-dead notification tap | NOT TESTABLE | After HOME and the permitted `am kill`, `pidof` still returned **13088**. The process never became dead, so the notification tap above cannot establish cold-start behavior. No stronger kill method was used. |
| Alarm preservation around permitted kill | PASS | **52 before / 52 after / 52 at final check**. See [kill-evidence.json](kill-evidence.json), [alarms-before.txt](alarms-before.txt), [alarms-final.txt](alarms-final.txt). |

Source findings:

- `app/_layout.tsx:139–175` uses `Notifications.useLastNotificationResponse()` and pending navigation to send responses to `/(tabs)` (home), including deferral until onboarding/navigation are ready.
- `src/lib/namazNotifications.ts:301` puts `/namaz` in prayer notification payloads, but the response handler does not use that route. Home is therefore the observed and implemented destination; confirm the intended product contract before changing it.
- Prayer notifications use Expo scheduled date triggers. `NOTIFY_AFTER_MIN = 2` deliberately schedules them two minutes after the displayed prayer time; this is not an observed scheduling defect.
- No in-app test-notification control found in source or the notification settings screen. No notification was fabricated and no JS was injected.
- Next scheduled **app alarm: 2026-11-19 14:12:00 +03:00**; next prayer alarm matching the displayed Asr time plus the configured delay: **15:30:00 +03:00**. At final check, device time was 13:39:25, so even the earliest alarm was beyond the allowed 20-minute wait.
- App-PID-filtered `ReactNativeJS` / `AndroidRuntime` review found no app crash or JS error during the tested flow. [runtime-errors.txt](runtime-errors.txt) contains the retained, location-filtered runtime excerpt; it is not evidence of a successful cold launch.

Manual cold-start follow-up: keep Metro running and adb reverse active; put the app in background with HOME, allow it to become cached, use only `am kill com.kuranapp.mobile`, and confirm `pidof` is empty. Check alarms before/after. Tap the next real prayer notification at 15:30 and verify home opens without a runtime crash. If `pidof` remains nonempty, the process-dead precondition is still unmet; do not force-stop.

## T2 — UX findings, highest priority first

No P1 blocker was established in the completed app flows. Setup failures are listed separately below.

| Priority | Screen / issue | Evidence | Suggested fix | Source file |
|---|---|---|---|---|
| P2 | Quiz results: correct-answer text is very pale green on cream. `#4ade80` on `#fffdf6` is approximately **1.71:1** contrast, making the answer explanations harder to scan. | [30-quiz-result.png](cihaz-turu-2026-11-19/30-quiz-result.jpg) | Use a darker theme-aware success text color with at least 4.5:1 contrast for this text size. | `app/dersler/[dersId].tsx:717`, `src/hooks/useColors.ts` |
| P2 | Lesson header: “Tümünü Oku / Kart Modu” has bounds `[555,73][690,105]`, approximately **72 × 17 dp**, without additional hitSlop. Back text is also a shallow target. | [25-lesson.png](cihaz-turu-2026-11-19/25-lesson.jpg), [lesson.xml](lesson.xml) | Give header buttons a minimum 44 dp height while retaining compact text. | `app/dersler/[dersId].tsx:559–565`, `headerSide` style |
| P2 | Word gloss: root links are small. The first link has bounds `[594,570][642,611]`, about **26 × 22 dp**; even 8 dp hitSlop per side gives only about **42 × 38 dp**. Narrower roots are smaller still. | [19-word-gloss.png](cihaz-turu-2026-11-19/19-word-gloss.jpg), [words.xml](words.xml) | Place each root in a minimum 44 × 44 dp touch container. | `app/ayah/[surahId]/[ayahNumber].tsx:1044–1053` |
| P2 | Elif-Ba letter navigation uses **10 × 10 dp** clickable dots, with no extra hitSlop. Wrapping puts the second row very close to the Android navigation area. Previous/Next remains usable, but jumping directly to a letter is difficult. | [35-letters.png](cihaz-turu-2026-11-19/35-letters.jpg), [letters.xml](letters.xml) | Use larger letter chips or a separate letter picker with 44 dp targets. | `app/elifba/[dersId].tsx:809–829`, dot styles at 871–875 |
| P3 | Elif-Ba listening: button remains “Sesi çal” after pressing it; no visible playing/completed state was captured. Android confirms playback started and stopped, so this is feedback polish rather than an audio failure. | [37-audio-playing.png](cihaz-turu-2026-11-19/37-audio-playing.jpg), [audio-evidence.txt](audio-evidence.txt), events at 13:31:04 and 13:31:14 | Expose a brief playing state and accessible playback announcement. | `src/components/ElifbaQuizView.tsx`, `src/lib/elifbaAudio.ts` |
| P3 | Alphabet naming is inconsistent: navigation header “Elifba”, inner tab and lesson tile “Elif-Ba”. | [33-elifba.png](cihaz-turu-2026-11-19/33-elifba.jpg) | Standardize the spelling throughout navigation and labels. | `app/_layout.tsx`, `app/elifba/index.tsx`, `src/data/Dersler/dersler_registry.ts` |
| P3 | English Fatiha dua translation starts a sentence with lowercase “guide us” after “help and support.” | [57-english-dua-scroll.png](cihaz-turu-2026-11-19/57-english-dua-scroll.jpg) | Capitalize “Guide”. | `src/data/dualar.en.json:13`, rendered by `app/dualar.tsx` |

Screen coverage and working behavior:

| Screen | Evidence | Observed behavior |
|---|---|---|
| Home / prayer card / Hijri date | [12](cihaz-turu-2026-11-19/12-home-ready.jpg), [64](cihaz-turu-2026-11-19/64-final-home.jpg) | Daily verse, Gregorian/Hijri date, current-city prayer times, countdown, mood shortcuts, and main tabs rendered. No location name is transcribed in this report. |
| Quran tab | [14](cihaz-turu-2026-11-19/14-quran.jpg) | Continue-reading card, mushaf entry, and surah-list entry available. |
| Surah list | [15](cihaz-turu-2026-11-19/15-surah-list.jpg), [16](cihaz-turu-2026-11-19/16-list-scroll.jpg) | List scrolled; Fatiha opened; Arabic names and verse counts displayed. |
| Fatiha verse list | [17](cihaz-turu-2026-11-19/17-fatiha.jpg) | Arabic, transliteration, translation, and tafsir entry rendered; verse opened. |
| Verse / word gloss | [18](cihaz-turu-2026-11-19/18-verse.jpg), [19](cihaz-turu-2026-11-19/19-word-gloss.jpg) | Tabs, Arabic, meanings, morphology, and root navigation worked. Small root targets noted above. |
| Turkish literal / analysis | [63](cihaz-turu-2026-11-19/63-turkish-literal.jpg) | Literal Translation, Difference Analysis, and Raw Meaning Summary rendered. |
| Tafsir | [21](cihaz-turu-2026-11-19/21-tafsir.jpg) | Long Turkish commentary rendered; original/simplified controls available. |
| Root map / list | [23](cihaz-turu-2026-11-19/23-root-map.jpg) | Root meanings, frequencies, search, and sorting controls rendered. Root-detail entry showed a spinner; completion of that detail request was not verified. |
| Learn tab | [22](cihaz-turu-2026-11-19/22-learn.jpg) | Lessons, hadith, and root-analysis entries navigated successfully. |
| Lessons / reading mode | [24](cihaz-turu-2026-11-19/24-lessons.jpg), [25](cihaz-turu-2026-11-19/25-lesson.jpg), [26](cihaz-turu-2026-11-19/26-lesson-all.jpg), [27](cihaz-turu-2026-11-19/27-lesson-end.jpg) | Lesson cards and all-text mode opened; long lesson scrolled to its quiz entry. |
| One complete quiz | [28](cihaz-turu-2026-11-19/28-quiz.jpg), [29](cihaz-turu-2026-11-19/29-quiz-feedback.jpg), [30](cihaz-turu-2026-11-19/30-quiz-result.jpg) | Ten questions completed; correct-answer feedback, progression, result, and wrong-answer explanations worked. Test selections produced 4/10; this was a UI exercise, not a content-accuracy audit. |
| Elif-Ba / letters / listening | [33](cihaz-turu-2026-11-19/33-elifba.jpg), [34](cihaz-turu-2026-11-19/34-letters-start.jpg), [35](cihaz-turu-2026-11-19/35-letters.jpg), [36](cihaz-turu-2026-11-19/36-listen.jpg), [37](cihaz-turu-2026-11-19/37-audio-playing.jpg) | Letter lesson and flashcard opened. One letter sound confirmed through app-UID playback state; no acoustic quality check. |
| Worship tab | [38](cihaz-turu-2026-11-19/38-worship.jpg) | Dua and qibla entries opened. |
| Duas | [39](cihaz-turu-2026-11-19/39-duas.jpg), [40](cihaz-turu-2026-11-19/40-dua-expanded.jpg) | Categories expanded; Arabic, transliteration, translation, and explanation entry rendered; long content scrolled. |
| Hadith | [31](cihaz-turu-2026-11-19/31-hadith.jpg), [32](cihaz-turu-2026-11-19/32-hadith-expanded.jpg), [60](cihaz-turu-2026-11-19/60-hadith-content.jpg), [61](cihaz-turu-2026-11-19/61-hadith-detail.jpg) | Topic/subtopic expansion and individual hadith expansion worked; source labels displayed. External source links were not opened. |
| Prayer times | [12](cihaz-turu-2026-11-19/12-home-ready.jpg), [49](cihaz-turu-2026-11-19/49-english-home.jpg) | Times are on the home card in this build. `/namaz` is **About Prayer**, not a dedicated times screen; [47](cihaz-turu-2026-11-19/47-prayer-screen.jpg) records that educational page, reached by normal deep link. |
| Qibla | [41](cihaz-turu-2026-11-19/41-qibla.jpg), [58](cihaz-turu-2026-11-19/58-qibla-scroll.jpg) | Direction/distance rendered. Turkish view warned that compass data was unavailable. Refresh was reachable after scrolling; initial bottom clipping was not counted as a blocked control. No physical compass accuracy test. |
| More / notification settings | [43](cihaz-turu-2026-11-19/43-more.jpg), [44](cihaz-turu-2026-11-19/44-notification-settings.jpg), [45](cihaz-turu-2026-11-19/45-more-language.jpg) | Main settings and language controls rendered; original System selection recorded. Notification toggles were not changed. |
| Dark theme | [46](cihaz-turu-2026-11-19/46-dark-home.jpg), [64](cihaz-turu-2026-11-19/64-final-home.jpg) | Home theme toggle changed the visible palette; returned to original light appearance. |

What worked well: consistent primary navigation, readable Arabic and verse metadata, working hardware-back navigation, useful quiz explanations, localized prayer names, and a clear compass-unavailable warning. No text overlap or P1 failure was established in these completed screens.

## T3 — English mode

- Revisited home/prayer card, More, Fatiha list/detail, Words, Literal Translation, tafsir, and expanded duas.
- Home and prayer labels translated (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha), with English date/countdown: [49](cihaz-turu-2026-11-19/49-english-home.jpg).
- More translated and English selected: [48](cihaz-turu-2026-11-19/48-english-more.jpg). No untranslated Turkish UI strings or blocking truncation found in the inspected English views; Turkish author names and the language name “Türkçe” are intentional.
- **PASS:** 1:1 Words has `ar-Rahman` / `ar-Rahim`: [51](cihaz-turu-2026-11-19/51-english-words1.jpg).
- **PASS:** 1:2 Words has `the Rabb` / `of the worlds`: [52](cihaz-turu-2026-11-19/52-english-words2.jpg).
- **PASS:** 1:1 Literal has “With the name of Allah, ar-Rahman, ar-Rahim.”: [54](cihaz-turu-2026-11-19/54-english-literal1.jpg).
- **PASS:** 1:2 Literal has “Praise belongs to Allah, the Rabb of the worlds.”: [53](cihaz-turu-2026-11-19/53-english-literal2.jpg).
- The distinct attributed **Pickthall Translation** and surah-list preview use “Lord of the Worlds”: [50](cihaz-turu-2026-11-19/50-english-fatiha.jpg). The requested gloss/literal checks pass; this is not treated as a failure of those layers.
- English tafsir paragraphs rendered: [55](cihaz-turu-2026-11-19/55-english-tafsir.jpg). Dua title, transliteration, translation, and explanation labels rendered in English: [56](cihaz-turu-2026-11-19/56-english-dua.jpg), [57](cihaz-turu-2026-11-19/57-english-dua-scroll.jpg). Lowercase “guide” is the P3 issue above.
- Restored **System** language selection, with Turkish visible: [59](cihaz-turu-2026-11-19/59-restored-language.jpg), [restored-language.xml](restored-language.xml).

## Limits, setup, and cleanup

- Git Bash could not launch (`CreateFileMapping ... Win32 error 5`). Used Python subprocesses with 20-second adb timeouts and binary screenshot writes as the fallback.
- Initial uncompressed `uiautomator dump` exceeded 20 seconds; reported and stopped that attempt. Later compressed dumps succeeded; no repeated hanging-command loop.
- Initial dev-client load failed because a proxy pointed at unreachable localhost port 9: [01](cihaz-turu-2026-11-19/01-start.jpg). Metro was restarted without those proxy variables and in offline mode; the Android platform URL then loaded. Android bundling took **85.7 seconds** for 3331 modules. This dev setup timing is not a release-transition benchmark.
- Metro ran from the mobile project using the local Expo CLI. An output-folder-only Node preload redirected `.expo` state to this folder and guarded other writes under `C:\Projects`; temp files/logs also stayed in this output folder. No repository file was edited and no commit was made. Final Git status matched the initial pre-existing untracked `app.json`.
- The dev-client Tools overlay appears in screenshots and briefly intercepted an Analysis-tab tap; dismissed with Back. It is not scored as a production UX defect.
- Root-detail load completion, true process-dead notification routing, physical compass accuracy, acoustic audio quality, and release-build transition performance remain unverified.
- **Confirmed:** app never force-stopped, cleared, or uninstalled; Fake GPS untouched; no system/security/permission settings changed; no review, share, email, purchase, or external-link action invoked.
- **Confirmed:** original System/Turkish language restored; visible light theme restored. Normal lesson/quiz usage updated learning state; no app-data reset was used.
- **Confirmed:** Metro stopped; local port 8082 no longer listening. App left on Turkish home. Scheduled alarms still present: **52**.
