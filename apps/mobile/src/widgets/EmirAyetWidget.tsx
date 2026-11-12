// Android ana ekran widget'ı — tek bir "emir ayeti" gösterir. FlexWidget/TextWidget
// react-native-android-widget'ın kendi native primitive seti — gerçek RN View/Text
// DEĞİL, bu yüzden useColors() gibi app hook'ları burada kullanılamaz; renkler
// uygulamanın krem/zümrüt paletiyle (bkz. src/hooks/useColors.ts) elle eşleştirildi.
//
// İki ayrı dokunma bölgesi var: gövde (OPEN_URI → uygulamada ayete gider) ve sağ
// üstteki "↻" (REFRESH_AYET → zamanlanmış dilimi beklemeden widget'ı yerinde
// yeniler). Android RemoteViews'ta iç içe PendingIntent'ler birbirine karışmaz —
// her tıklanabilir bölge kendi clickAction'ını bağımsız tetikler.
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { EmirAyet } from "./emirRotation";

type Theme = "light" | "dark";

// useColors.ts'teki light/dark paletle birebir eşleşir — widget ayrı süreçte
// render olduğu için hook değil, sabit palet kullanılıyor. `as const`: TextWidget/
// FlexWidget renk prop'ları `#${string}` literal tipini bekliyor (plain string olmaz).
const PALETTES = {
  light: {
    bg: "#fffdf6",
    border: "#e7dfcc",
    text: "#1c1917",
    textSecondary: "#44403c",
    textMuted: "#78716c",
    accent: "#059669",
  },
  dark: {
    bg: "#1c1917",
    border: "#44403c",
    text: "#fafaf9",
    textSecondary: "#d6d3d1",
    textMuted: "#a8a29e",
    accent: "#10b981",
  },
} as const satisfies Record<Theme, Record<string, `#${string}`>>;

// Arayüz dili İngilizceyse Pickthall meali. Widget headless JS görevinde çalışır;
// englishMeal → i18n → storage (MMKV/AsyncStorage) zinciri orada güvenli olmayabilir,
// bu yüzden tembel require + try/catch ile Türkçe metne düşülür.
function widgetSurahName(ayet: EmirAyet): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { localizedSurahName } = require("../lib/surahNames") as typeof import("../lib/surahNames");
    return localizedSurahName(ayet.surah_id, ayet.surah_name);
  } catch {
    return ayet.surah_name;
  }
}

function widgetMeal(ayet: EmirAyet): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { localizedMeal } = require("../lib/englishMeal") as typeof import("../lib/englishMeal");
    return localizedMeal({ surah: ayet.surah_id, ayah: ayet.ayah_number }, ayet.meal);
  } catch {
    return ayet.meal;
  }
}

// Widget metinleri (a11y + hata) — meal ile aynı gerekçeyle tembel require; olmazsa Türkçe.
type WidgetStr = {
  widgetOpenA11y: string; widgetRefreshA11y: string; widgetErrorA11y: string; widgetErrorText: string;
  fill: (tpl: string, p: Record<string, string>) => string;
};
function widgetStrings(): WidgetStr {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const i18n = require("../i18n") as typeof import("../i18n");
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const cs = (require("../i18n/strings/components") as typeof import("../i18n/strings/components")).default;
    return { ...i18n.getStrings(cs), fill: i18n.fmt };
  } catch {
    return {
      widgetOpenA11y: "{badge}. {meal}. Ayeti uygulamada açmak için dokun.",
      widgetRefreshA11y: "Başka bir emir ayeti göster",
      widgetErrorA11y: "İçerik yüklenemedi, Kuran Yolu uygulamasını açmak için dokun",
      widgetErrorText: "İçerik yüklenemedi. Açmak için dokunun.",
      fill: (tpl, p) => tpl.replace(/\{(\w+)\}/g, (_, k: string) => p[k] ?? ""),
    };
  }
}

// Meal satır sayısı widget yüksekliğinden (dp) hesaplanır — sabit 2 satır, büyütülmüş
// widget'ta altta boşluk bırakıp metni "…" ile kesiyordu. Sabit kısımlar: dış padding
// 24 + başlık satırı 36+4 + (varsa) Arapça 2 satır ~44+4. Meal satırı 12sp ≈ 18dp
// (sistem yazı boyutu büyükse taşmasın diye cömert). Yükseklik bilinmiyorsa 2 satır.
export function mealMaxLines(heightDp: number | undefined, hasArabic: boolean): number {
  if (!heightDp || !Number.isFinite(heightDp)) return 2;
  const free = heightDp - 24 - 40 - (hasArabic ? 48 : 0);
  return Math.max(2, Math.min(14, Math.floor(free / 18)));
}

export function EmirAyetWidget({ ayet, theme = "light", heightDp }: { ayet: EmirAyet; theme?: Theme; heightDp?: number }) {
  const c = PALETTES[theme];
  const ws = widgetStrings();
  const meal = widgetMeal(ayet);
  const deepLink = `kuranyolu://surah/${ayet.surah_id}/ayah/${ayet.ayah_number}`;
  const badge = ayet.surah_name
    ? `${widgetSurahName(ayet)} ${ayet.surah_id}:${ayet.ayah_number}`
    : `${ayet.surah_id}:${ayet.ayah_number}`;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: deepLink }}
      accessibilityLabel={ws.fill(ws.widgetOpenA11y, { badge, meal })}
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        backgroundColor: c.bg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 12,
      }}
    >
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <TextWidget
          text={badge}
          style={{ color: c.accent, fontSize: 11, fontWeight: "700" }}
          maxLines={1}
        />
        {/* Ayrı bir dokunma alanı olarak 36x36dp'lik kutuya alındı — yalnız "↻"
            glifinin kendisi (~14sp) dokunması zor bir hedef olurdu. */}
        <FlexWidget
          clickAction="REFRESH_AYET"
          accessibilityLabel={ws.widgetRefreshA11y}
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
        >
          <TextWidget text="↻" style={{ color: c.textMuted, fontSize: 16 }} />
        </FlexWidget>
      </FlexWidget>
      {ayet.arabic_text ? (
        <TextWidget
          text={ayet.arabic_text}
          style={{ color: c.text, fontSize: 15, textAlign: "right", marginBottom: 4 }}
          maxLines={2}
          truncate="END"
        />
      ) : null}
      <TextWidget
        text={meal}
        style={{ color: c.textSecondary, fontSize: 12 }}
        maxLines={mealMaxLines(heightDp, !!ayet.arabic_text)}
        truncate="END"
      />
    </FlexWidget>
  );
}

// Havuz boşsa (bozuk/boş emirAyetleri.json) widget'ın native varsayılan boş
// placeholder'da sonsuza dek takılı kalmaması için — dokununca yine de uygulamayı açar.
function EmirAyetWidgetFallback({ theme = "light" }: { theme?: Theme }) {
  const c = PALETTES[theme];
  const ws = widgetStrings();
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={ws.widgetErrorA11y}
      style={{
        height: "match_parent",
        width: "match_parent",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.bg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 12,
      }}
    >
      <TextWidget
        text={ws.widgetErrorText}
        style={{ color: c.textMuted, fontSize: 12, textAlign: "center" }}
        maxLines={3}
      />
    </FlexWidget>
  );
}

// Tek noktadan {light, dark} çifti üretir — widget-task-handler.tsx ve
// widgetRefresh.ts bu yardımcıyı ortak kullanır, aksiyon/render eşleştirmesi
// tekilleşir. ayet null ise (boş havuz) fallback görünümü döner.
export function buildEmirWidgetRepresentation(ayet: EmirAyet | null, heightDp?: number): {
  light: React.JSX.Element;
  dark: React.JSX.Element;
} {
  if (!ayet) {
    return {
      light: <EmirAyetWidgetFallback theme="light" />,
      dark: <EmirAyetWidgetFallback theme="dark" />,
    };
  }
  return {
    light: <EmirAyetWidget ayet={ayet} theme="light" heightDp={heightDp} />,
    dark: <EmirAyetWidget ayet={ayet} theme="dark" heightDp={heightDp} />,
  };
}
