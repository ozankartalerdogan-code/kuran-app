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

// Widget tasarım ailesi: sıcak parşömen zemin + derin Kuran Yolu yeşili + ölçülü
// altın detay — namaz vakti widget'ının native paletiyle (modules/prayer-widget
// res/values/colors.xml) birebir aynı değerler. Parşömen kimlik gece modunda da
// korunur (iki tema aynı palet) — native taraf da values-night kullanmıyor.
// `as const`: TextWidget/FlexWidget renk prop'ları `#${string}` literal tipi bekler.
const PARCHMENT = {
  bgTop: "#F4EDDF",
  bgBottom: "#E8DDC7",
  border: "#D9C9A6",
  text: "#28241F",
  textSecondary: "#584E42",
  textMuted: "#9A8A74",
  accent: "#1E5343",
  gold: "#B08B44",
} as const satisfies Record<string, `#${string}`>;

const PALETTES = {
  light: PARCHMENT,
  dark: PARCHMENT,
} as const satisfies Record<Theme, Record<string, `#${string}`>>;

// İnce, düşük opaklıklı altın ayraçlar (mockup'taki zarif detay).
const GOLD_SOFT = "rgba(176, 139, 68, 0.35)" as const;

// Widget'ın gerçek yüksekliğine (dp, widgetInfo.height) göre Arapça/meal satır
// bütçesi. Eskiden sabit 2+2 satırdı: kullanıcı widget'ı büyüttüğünde meal 2
// satırda kesilip altında koca boşluk kalıyordu (cihaz ekran görüntüsüyle
// doğrulandı). Eşikler kabaca: başlık ~28dp + padding ~24dp düşüldükten sonra
// Arapça satırı ~24dp, meal satırı ~18dp yer kaplar.
function lineBudget(heightDp?: number): { arabic: number; meal: number } {
  const h = heightDp ?? 0;
  if (h >= 280) return { arabic: 4, meal: 9 };
  if (h >= 200) return { arabic: 3, meal: 6 };
  if (h >= 140) return { arabic: 2, meal: 4 };
  return { arabic: 2, meal: 2 }; // en küçük boy (ve yükseklik bilinmiyorsa) eski davranış
}

export function EmirAyetWidget({
  ayet,
  theme = "light",
  heightDp,
}: { ayet: EmirAyet; theme?: Theme; heightDp?: number }) {
  const c = PALETTES[theme];
  const lines = lineBudget(heightDp);
  const deepLink = `kuranyolu://surah/${ayet.surah_id}/ayah/${ayet.ayah_number}`;
  const badge = ayet.surah_name
    ? `${ayet.surah_name} ${ayet.surah_id}:${ayet.ayah_number}`
    : `${ayet.surah_id}:${ayet.ayah_number}`;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: deepLink }}
      accessibilityLabel={`${badge}. ${ayet.meal}. Ayeti uygulamada açmak için dokun.`}
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        backgroundGradient: { from: c.bgTop, to: c.bgBottom, orientation: "TOP_BOTTOM" },
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TextWidget
          text={badge}
          style={{ color: c.accent, fontSize: 11, fontWeight: "600", letterSpacing: 0.3 }}
          maxLines={1}
        />
        {/* Ayrı bir dokunma alanı olarak 36x36dp'lik kutuya alındı — yalnız "↻"
            glifinin kendisi (~14sp) dokunması zor bir hedef olurdu. */}
        <FlexWidget
          clickAction="REFRESH_AYET"
          accessibilityLabel="Başka bir emir ayeti göster"
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
        >
          <TextWidget text="↻" style={{ color: c.textMuted, fontSize: 15 }} />
        </FlexWidget>
      </FlexWidget>
      {/* Başlık ile içerik arasındaki ince, düşük opaklıklı altın ayraç. */}
      <FlexWidget style={{ width: 36, height: 1, backgroundColor: GOLD_SOFT, marginTop: 2, marginBottom: 6 }} />
      {/* İçerik bloğu kalan alanı doldurur (flex:1) ve dikeyde ortalanır —
          büyük widget boylarında metin üstte toplanıp altta boşluk kalmasın. */}
      <FlexWidget
        style={{
          width: "match_parent",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {ayet.arabic_text ? (
          <FlexWidget style={{ width: "match_parent", flexDirection: "column" }}>
            {/* lineHeight 24: hareke ve uzatmaların üst/alt kırpılmaması için. */}
            <TextWidget
              text={ayet.arabic_text}
              style={{ color: c.text, fontSize: 15, lineHeight: 24, textAlign: "right" }}
              maxLines={lines.arabic}
              truncate="END"
            />
            {/* Arapça ile meal arasındaki kısa altın detay (sağa hizalı, Arapça akış yönü). */}
            <FlexWidget
              style={{ width: "match_parent", flexDirection: "row", justifyContent: "flex-end", marginTop: 3, marginBottom: 3 }}
            >
              <FlexWidget style={{ width: 24, height: 1, backgroundColor: GOLD_SOFT }} />
            </FlexWidget>
          </FlexWidget>
        ) : null}
        <TextWidget
          text={ayet.meal}
          style={{ color: c.textSecondary, fontSize: 12, lineHeight: 18 }}
          maxLines={lines.meal}
          truncate="END"
        />
      </FlexWidget>
    </FlexWidget>
  );
}

// Havuz boşsa (bozuk/boş emirAyetleri.json) widget'ın native varsayılan boş
// placeholder'da sonsuza dek takılı kalmaması için — dokununca yine de uygulamayı açar.
function EmirAyetWidgetFallback({ theme = "light" }: { theme?: Theme }) {
  const c = PALETTES[theme];
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="İçerik yüklenemedi, Kuran Yolu uygulamasını açmak için dokun"
      style={{
        height: "match_parent",
        width: "match_parent",
        alignItems: "center",
        justifyContent: "center",
        backgroundGradient: { from: c.bgTop, to: c.bgBottom, orientation: "TOP_BOTTOM" },
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 12,
      }}
    >
      <TextWidget
        text="İçerik yüklenemedi. Açmak için dokunun."
        style={{ color: c.textSecondary, fontSize: 12, textAlign: "center" }}
        maxLines={3}
      />
    </FlexWidget>
  );
}

// Tek noktadan {light, dark} çifti üretir — widget-task-handler.tsx ve
// widgetRefresh.ts bu yardımcıyı ortak kullanır, aksiyon/render eşleştirmesi
// tekilleşir. ayet null ise (boş havuz) fallback görünümü döner.
// heightDp: widgetInfo.height — verilmezse en küçük boy varsayılır (2+2 satır).
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
