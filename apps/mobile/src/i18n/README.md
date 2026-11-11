# Arayüz çevirisi (tr / en)

Cihaz dili Türkçe değilse arayüz İngilizce açılır (`src/i18n/index.ts`).
Örnek uygulama: `app/(tabs)/_layout.tsx` + `src/i18n/strings/tabs.ts`.

## Kurallar

1. **Yalnız arayüz metni çevrilir:** başlık, buton, sekme, etiket, boş durum,
   hata, onay/Alert, toast, placeholder, accessibilityLabel, onboarding, tur,
   ayar metinleri.
2. **Çevrilmez, Türkçe kalır:** Arapça metin, meal, ayet, dua, hadis, esma
   anlamları, ders/quiz içeriği, tefsir, siyer, kıssalar, namaz rehberi
   içerik paragrafları, `src/data/**` altındaki JSON/TS veri dosyaları,
   gizlilik politikası (`app/gizlilik.tsx`) gövde metni.
   Dini terimler (Hatim, Elifba, Esma-ül Hüsna, Siyer, tecvid, Kıble) İngilizce
   metinde de tanınır kalmalı: örn. "Hatim Tracker", "Qibla Compass",
   "99 Names of Allah (Esma-ül Hüsna)".
3. Her ekran/bileşen için `src/i18n/strings/<dosya-adı>.ts` oluştur:
   ```ts
   import { defineStrings } from "../index";
   export default defineStrings({
     tr: { title: "Namaz Vakitleri", next: "Sonraki vakit: {name}" },
     en: { title: "Prayer Times", next: "Next prayer: {name}" },
   });
   ```
   - `tr` metinleri dosyadaki mevcut metinle **birebir aynı** olmalı.
   - Değişken içeren metinlerde `{ad}` yer tutucusu ve `fmt(s.key, { ad })` kullan.
   - Liste gerekiyorsa değer `["...", "..."]` olabilir.
4. Bileşende: `const s = useStrings(strings);` → `{s.title}`.
   Hook kullanılamayan yerde (modül seviyesi sabit, bildirim, widget, util):
   ya anahtarı sakla ve render'da `s[key]` ile çöz (bkz. tabs örneği) ya da
   fonksiyon içinde `getStrings(strings)` çağır. Modül seviyesinde
   `getStrings` sonucunu sabite ATAMA (dil değişince güncellenmez).
5. Tarih/saat biçimlendirmede `"tr-TR"` sabitleri yerine `localeTag()` kullan.
6. Mantığı, stilleri, veri akışını değiştirme. Sadece metinleri taşı.
7. Her dosyadan sonra: `npm run typecheck -w @quran-app/mobile` hatasız olmalı.
