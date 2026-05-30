import {
  View, Text, ScrollView, useColorScheme, StyleSheet, I18nManager,
} from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Statik veri (aynı içerik, mobile için kopya) ─────────────────────────────

interface DuaKarti {
  id: string;
  baslik: string;
  kaynak: string;
  guvenilirlik: "10/10" | "8/10";
  arapca: string;
  meal: string;
  transkripsiyon: string;
  uygulama: string;
}

interface KorunmaDuasi extends DuaKarti {
  kategori: "sabah-aksam" | "evden-cikarken" | "yatarken" | "genel-korunma";
}

const ismiAzamDualari: DuaKarti[] = [
  {
    id: "ismi-azam-1",
    baslik: "Büreyde b. Husayb (r.a.) Rivayeti",
    kaynak: "Tirmizî, Ebû Dâvûd · Sahih",
    guvenilirlik: "10/10",
    arapca:
      "اللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنِّي أَشْهَدُ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ الْأَحَدُ الصَّمَدُ الَّذِي لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
    meal: "Allah'ım! Senin tek (Ahad) ve hiçbir şeye muhtaç olmayan (Samed), doğurmamış, doğmamış ve hiçbir dengi bulunmayan mutlak Allah olduğuna şehadet ederek senden istiyorum.",
    transkripsiyon:
      "Allahümme innî es'elüke bi-ennî eşhedü enneke ente'llāhü lâ ilâhe illâ ente'l-ehadü's-samedü'l-lezî lem yelid ve lem yûled ve lem yekün lehû küfüven ehad",
    uygulama: "Bu duayı 3 defa oku, ardından isteklerini dile getir.",
  },
  {
    id: "ismi-azam-2",
    baslik: "Enes b. Malik (r.a.) Rivayeti",
    kaynak: "Nesâî, İbn Mâce · Sahih",
    guvenilirlik: "10/10",
    arapca:
      "اللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنَّ لَكَ الْحَمْدَ لَا إِلَهَ إِلَّا أَنْتَ الْمَنَّانُ بَدِيعُ السَّمَاوَاتِ وَالْأَرْضِ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
    meal: "Allah'ım! Hamd sanadır, senden başka ilah yoktur. Sen bol nimet veren (Mennân), gökleri ve yeri yoktan var eden (Bedî'), celal ve ikram sahibisin.",
    transkripsiyon:
      "Allahümme innî es'elüke bi-enne leke'l-hamdü lâ ilâhe illâ ente'l-mennânü bedîu's-semâvâti ve'l-ardı yâ ze'l-celâli ve'l-ikrâm",
    uygulama: "Bu duayı 3 defa oku, ardından isteklerini sırala.",
  },
];

const korunmaDualari: KorunmaDuasi[] = [
  {
    id: "korunma-sabah-aksam",
    baslik: "Sabah-Akşam Korunma Duası",
    kaynak: "Ebû Dâvûd, Tirmizî, İbn Mâce · Sahih",
    guvenilirlik: "10/10",
    kategori: "sabah-aksam",
    arapca:
      "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    meal: "Yerde ve gökte hiçbir şeyin O'nun adıyla zarar veremeyeceği Allah'ın adıyla. O her şeyi işiten ve bilendir.",
    transkripsiyon:
      "Bismillâhillezî lâ yedurru me'asmihi şey'ün fil erdı ve lâ fissemâi ve hüves-semî'ul alîm",
    uygulama: "Sabah ve akşam 3'er defa oku. Hiçbir şey sana zarar veremez.",
  },
  {
    id: "korunma-evden-cikarken",
    baslik: "Evden Çıkarken Okunacak Dua",
    kaynak: "Ebû Dâvûd, Tirmizî · Sahih",
    guvenilirlik: "10/10",
    kategori: "evden-cikarken",
    arapca:
      "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    meal: "Allah'ın adıyla. Allah'a tevekkül ettim. Günahlardan kaçacak ve ibadet edecek güç, ancak Allah'ın yardımıyladır.",
    transkripsiyon:
      "Bismillâhi tevekkeltü alallâh, lâ havle ve lâ kuvvete illâ billâh",
    uygulama: "Evden çıkarken oku. Şeytandan, kötülüklerden korunur ve doğru yola iletilirsin.",
  },
  {
    id: "korunma-yatarken",
    baslik: "Yatarken Okunacak Dua",
    kaynak: "Buhârî, Müslim · Sahih",
    guvenilirlik: "10/10",
    kategori: "yatarken",
    arapca:
      "بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي وَبِكَ أَرْفَعُهُ إِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ",
    meal: "Rabbim! Senin adınla yanımı yatağa koydum ve yine senin adınla kaldırırım. Eğer nefsimi tutarsan ona merhamet et; şayet salıverirsen salih kullarını koruduğun şeyle onu koru.",
    transkripsiyon:
      "Bismike Rabbî vada'tü cenbî ve bike erfe'uhû, in emsekte nefsî ferhamhâ ve in erseltehâ fahfazhâ bimâ tahfazu bihî ibâdekessâlihîn",
    uygulama: "Yatmadan önce oku. Sağ tarafına yatarak, sağ elini yanağının altına koy.",
  },
  {
    id: "korunma-genel-siginma",
    baslik: "Genel Sığınma Duası (Seyyidü'l-İstiğfar)",
    kaynak: "Buhârî · Sahih",
    guvenilirlik: "10/10",
    kategori: "genel-korunma",
    arapca:
      "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    meal: "Allah'ım! Sen benim Rabbimsin. Senden başka ilah yoktur. Beni sen yarattın. Ben senin kulunum. Gücüm yettiğince sana verdiğim söz ve ahid üzereyim. Yaptıklarımın şerrinden sana sığınırım. Bana verdiğin nimetleri itiraf ederim, günahımı da itiraf ederim. Beni bağışla, çünkü günahları ancak sen bağışlarsın.",
    transkripsiyon:
      "Allahümme ente Rabbî lâ ilâhe illâ ente halaktenî ve ene abdüke ve ene alâ ahdike ve va'dike m'steta'tü, eûzü bike min şerri mâ sana'tü, ebûü leke bi ni'metike aleyye ve ebûü bi zenbî fağfirlî feinnehû lâ yağfiruz-zünûbe illâ ente",
    uygulama: "Sabah ve akşam oku. Fazileti: Kim bu duayı gündüz inanarak okur da akşam olmadan ölürse cennetlik; gece inanarak okur da sabah olmadan ölürse cennetlik olur (Buhârî).",
  },
];

const sekineDuasi = {
  id: "sekine",
  baslik: "Tabut-u Sekine ve Huzur Duası",
  arapca:
    "إِنَّ آيَةَ مُلْكِهِ أَنْ يَأْتِيَكُمُ التَّابُوتُ فِيهِ سَكِينَةٌ مِنْ رَبِّكُمْ وَبَقِيَّةٌ مِمَّا تَرَكَ آلُ مُوسَى وَآلُ هَارُونَ تَحْمِلُهُ الْمَلَائِكَةُ ۚ إِنَّ فِي ذَٰلِكَ لَآيَةً لَكُمْ إِنْ كُنْتُمْ مُؤْمِنِينَ",
  meal: "Onun hükümdarlığının alameti, size o sandığın (Tabut) gelmesidir. Onda Rabbinizden bir sekinet (huzur ve güven), Musa ve Harun ailelerinin bıraktıklarından bir kalıntı vardır. Onu melekler taşımaktadır. Eğer inananlardan iseniz, bunda sizin için kesin bir alamet vardır.",
  aciklama:
    "Sekine, Allah'ın mümin kullarının kalbine indirdiği huzur, sükunet ve manevi güçtür. Tabut-u Sekine, bu ilahi huzurun sembolüdür.",
};

const bakara250: DuaKarti = {
  id: "bakara-250",
  baslik: "Talut ve Askerlerinin Duası (Bakara 250)",
  kaynak: "Kur'ân-ı Kerîm · Bakara 250",
  guvenilirlik: "10/10",
  arapca:
    "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
  meal: "Rabbimiz! Üzerimize sabır yağdır, ayaklarımızı sabit kıl ve kâfirler topluluğuna karşı bize yardım et.",
  transkripsiyon:
    "Rabbenâ efrîğ aleynâ sabran ve sebbit akdâmenâ vensurnâ alel-kavmil-kâfirîn",
  uygulama:
    "Zorluk ve sıkıntı anlarında, düşman ve zalim karşısında metanet için 3 defa oku.",
};

// ── Renk paleti (dark mode uyumlu) ──────────────────────────────────────────

function useColors() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  return {
    bg:            dark ? "#1c1917" : "#f7f1e4",
    cardBg:        dark ? "#292524" : "#ffffff",
    cardBorder:    dark ? "#44403c" : "#e7e5e4",
    text:          dark ? "#f5f5f4" : "#1c1917",
    textSecondary: dark ? "#a8a29e" : "#78716c",
    textMuted:     dark ? "#78716c" : "#a8a29e",
    amberBg:       dark ? "#451a03" : "#fffbeb",
    amberBorder:   dark ? "#78350f" : "#fde68a",
    amberText:     dark ? "#fcd34d" : "#92400e",
    emeraldBg:     dark ? "#052e16" : "#ecfdf5",
    emeraldBorder: dark ? "#065f46" : "#a7f3d0",
    emeraldText:   dark ? "#6ee7b7" : "#065f46",
    violetBg:      dark ? "#3b0764" : "#f5f3ff",
    violetBorder:  dark ? "#6b21a8" : "#ddd6fe",
    violetText:    dark ? "#c4b5fd" : "#6d28d9",
    blueBg:        dark ? "#172554" : "#eff6ff",
    blueBorder:    dark ? "#1e40af" : "#bfdbfe",
    blueText:      dark ? "#93c5fd" : "#1e40af",
    stepBg:        dark ? "#44403c" : "#e7e5e4",
    stepText:      dark ? "#d6d3d1" : "#57534e",
    bulletDot:     dark ? "#78716c" : "#a8a29e",
  };
}

// ── Bileşenler ──────────────────────────────────────────────────────────────

function StepList({ steps, colors }: { steps: string[]; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ gap: 8 }}>
      {steps.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View style={[styles.stepCircle, { backgroundColor: colors.stepBg }]}>
            <Text style={[styles.stepCircleText, { color: colors.stepText }]}>{i + 1}</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary, flex: 1 }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

function BulletList({ items, colors }: { items: string[]; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ gap: 6 }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <View style={[styles.bulletDot, { backgroundColor: colors.bulletDot }]} />
          <Text style={[styles.bodyText, { color: colors.textSecondary, flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Kutu({
  baslik, children, colors, renk,
}: {
  baslik: string; children: React.ReactNode; colors: ReturnType<typeof useColors>;
  renk?: "stone" | "amber" | "violet";
}) {
  const isAmber  = renk === "amber";
  const isViolet = renk === "violet";
  const labelColor = isAmber ? colors.amberText : isViolet ? colors.violetText : colors.textMuted;
  const boxBg       = isAmber ? colors.amberBg   : isViolet ? colors.violetBg   : colors.cardBg;
  const boxBorder   = isAmber ? colors.amberBorder : isViolet ? colors.violetBorder : colors.cardBorder;
  return (
    <View style={[styles.kutu, { backgroundColor: boxBg, borderColor: boxBorder }]}>
      {baslik ? (
        <Text style={[styles.kutuBaslik, { color: labelColor }]}>{baslik}</Text>
      ) : null}
      {children}
    </View>
  );
}

// ── Arapça RTL destekli Dua Kartı ───────────────────────────────────────────

function DuaKartiFull({ dua, colors }: { dua: DuaKarti; colors: ReturnType<typeof useColors> }) {
  const is10 = dua.guvenilirlik === "10/10";
  const emoji = is10 ? "🟢" : "🟡";
  const scoreColor = is10 ? "#065f46" : "#92400e";
  const scoreBg    = is10 ? "#d1fae5" : "#fef3c7";

  return (
    <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
      {/* Başlık */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <Text>{emoji}</Text>
        <Text style={[styles.duaBaslik, { color: colors.amberText, flex: 1 }]}>{dua.baslik}</Text>
        <View style={[styles.badge, { backgroundColor: scoreBg }]}>
          <Text style={[styles.badgeText, { color: scoreColor }]}>{dua.guvenilirlik}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
          <Text style={[styles.badgeText, { color: colors.amberText }]}>{dua.kaynak}</Text>
        </View>
      </View>

      {/* Arapça RTL */}
      <View style={[styles.arabicBox, { borderColor: colors.amberBorder }]}>
        <Text
          style={[styles.arabicText, { color: colors.text, writingDirection: "rtl" as const }]}
        >
          {dua.arapca}
        </Text>
      </View>

      {/* Meal */}
      <Text style={[styles.duaAnlam, { color: colors.textSecondary }]}>
        <Text style={{ fontWeight: "700" }}>Anlamı: </Text>{dua.meal}
      </Text>

      {/* Transkripsiyon */}
      <Text style={[styles.duaOkunus, { color: colors.textMuted }]}>
        <Text style={{ fontWeight: "700" }}>Okunuşu: </Text>{dua.transkripsiyon}
      </Text>

      {/* Uygulama */}
      <Text style={[styles.duaUygulama, { color: colors.amberText }]}>
        <Text style={{ fontWeight: "700" }}>Uygulama: </Text>{dua.uygulama}
      </Text>
    </View>
  );
}

// ── Korunma Duası Kartı (Arapça RTL + Kategori) ─────────────────────────────

const korunmaKategoriLabel: Record<KorunmaDuasi["kategori"], string> = {
  "sabah-aksam": "☀️ Sabah-Akşam",
  "evden-cikarken": "🚪 Evden Çıkarken",
  "yatarken": "🌙 Yatarken",
  "genel-korunma": "🛡️ Genel Korunma",
};

function KorunmaKarti({ dua, colors }: { dua: KorunmaDuasi; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.kutu, { backgroundColor: colors.emeraldBg, borderColor: colors.emeraldBorder }]}>
      {/* Başlık */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <Text>🟢</Text>
        <Text style={[styles.duaBaslik, { color: colors.emeraldText, flex: 1 }]}>{dua.baslik}</Text>
        <View style={[styles.badge, { backgroundColor: "#d1fae5" }]}>
          <Text style={[styles.badgeText, { color: "#065f46" }]}>10/10</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.blueBg, borderColor: colors.blueBorder }]}>
          <Text style={[styles.badgeText, { color: colors.blueText }]}>
            {korunmaKategoriLabel[dua.kategori]}
          </Text>
        </View>
      </View>

      {/* Arapça RTL */}
      <View style={[styles.arabicBox, { borderColor: colors.emeraldBorder }]}>
        <Text
          style={[styles.arabicText, { color: colors.text, writingDirection: "rtl" as const }]}
        >
          {dua.arapca}
        </Text>
      </View>

      {/* Meal */}
      <Text style={[styles.duaAnlam, { color: colors.textSecondary }]}>
        <Text style={{ fontWeight: "700" }}>Anlamı: </Text>{dua.meal}
      </Text>

      {/* Transkripsiyon */}
      <Text style={[styles.duaOkunus, { color: colors.textMuted }]}>
        <Text style={{ fontWeight: "700" }}>Okunuşu: </Text>{dua.transkripsiyon}
      </Text>

      {/* Uygulama */}
      <Text style={[styles.duaUygulama, { color: colors.emeraldText }]}>
        <Text style={{ fontWeight: "700" }}>Uygulama: </Text>{dua.uygulama}
      </Text>
    </View>
  );
}

// ── Metot Kutusu (Hadis metodları için, Arapça yoksa) ───────────────────────

function MetotKutusu({
  baslik, kaynak, aciklama, uygulama, colors, puan,
}: {
  baslik: string; kaynak: string; aciklama: string; uygulama: string;
  colors: ReturnType<typeof useColors>; puan?: "10/10" | "8/10";
}) {
  const isSekiz    = puan === "8/10";
  const bg         = isSekiz ? colors.violetBg      : colors.amberBg;
  const border     = isSekiz ? colors.violetBorder  : colors.amberBorder;
  const labelColor = isSekiz ? colors.violetText    : colors.amberText;
  const emoji      = isSekiz ? "🟡" : "🟢";

  return (
    <View style={[styles.kutu, { backgroundColor: bg, borderColor: border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <Text>{emoji}</Text>
        <Text style={[styles.duaBaslik, { color: labelColor }]}>{baslik}</Text>
        <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
          <Text style={[styles.badgeText, { color: labelColor }]}>{kaynak}</Text>
        </View>
      </View>
      <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 6 }]}>{aciklama}</Text>
      <Text style={[styles.bodyText, { color: labelColor }]}>
        <Text style={{ fontWeight: "700" }}>Uygulama: </Text>{uygulama}
      </Text>
    </View>
  );
}

function VerseSubHeader({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.subHeader, { color: colors.textMuted }]}>{label}</Text>
  );
}

// ── Ana sayfa ───────────────────────────────────────────────────────────────

export default function IsmiAzamScreen() {
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "İsmi Azam & Korunma" }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 28 }}>✨</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              İsmi Azam ve Korunma Duaları
            </Text>
          </View>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Allah'ın en büyük ismi, Sekine (huzur) duası ve sahih hadislerle sabit günlük korunma duaları.
          </Text>
        </View>

        {/* Kişisel not */}
        <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
          <Text style={[styles.bodyText, { color: colors.amberText }]}>
            <Text style={{ fontWeight: "700" }}>Not: </Text>
            İsmi Azam, harflerin sihirli kombinasyonu değil; kulun tam teslimiyetle Rabbine yöneldiği an'ın adıdır.
            Kelimeler değil, o kelimeleri taşıyan kalp hal'i konuşur.
          </Text>
        </View>

        {/* Ulema açıklaması */}
        <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
          <Text style={[styles.kutuBaslik, { color: colors.amberText }]}>Alimlerin Ortak Kanaati</Text>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            İslam alimlerinin ortak kanaatine göre İsmi Azam, belirli bir dua metni değil; kulun kalbini tamamen
            Allah'a teslim ettiği, O'ndan başka her şeyi zihninden sildiği bir teslimiyet ve odaklanma halidir.
            İbn Arabi, İmam Gazali ve Diyanet İşleri Başkanlığı dahil pek çok otorite, asıl olanın dudaktan dökülen
            kelimeler değil, kalbin ulaştığı o derin "an" olduğunu vurgular. Mesele, hangi ismi söylediğin
            değil; o ismi <Text style={{ fontWeight: "700" }}>hangi kalple söylediğin</Text>dir.
          </Text>
        </View>

        {/* Güvenilirlik Badgeleri */}
        <View style={styles.badgeGrid}>
          <View style={[styles.guvenCard, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text>🟢</Text>
              <Text style={[styles.badgeScore, { color: "#065f46" }]}>10/10</Text>
            </View>
            <Text style={[styles.guvenTitle, { color: colors.text }]}>Kesin Sünnet / Kur'an</Text>
            <Text style={[styles.guvenDesc, { color: colors.textMuted }]}>
              Hz. Peygamber'in bizzat "İsmi Azam" dediği, sahih hadislerle sabit ayet ve dualar.
            </Text>
          </View>
          <View style={[styles.guvenCard, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text>🟡</Text>
              <Text style={[styles.badgeScore, { color: "#92400e" }]}>8/10</Text>
            </View>
            <Text style={[styles.guvenTitle, { color: colors.text }]}>Meşru ve Makbul</Text>
            <Text style={[styles.guvenDesc, { color: colors.textMuted }]}>
              Sahabe ve ulema tertibi; sahih ayet ve esmalardan oluşan, alimlerce kabul görmüş uygulamalar.
            </Text>
          </View>
        </View>

        {/* ── Bölüm 1: Sahih İsmi Azam ──────────────────────────────── */}
        <Text style={[styles.bolumBaslik, { color: colors.text }]}>🟢 Sahih İsmi Azam — Rivayetler ve Metodlar</Text>

        <Kutu baslik="İrfani Şart — Nasıl Dua Edilir?" colors={colors}>
          <StepList steps={[
            "Abdest al, 2 rekat hacet namazı kıl.",
            "Kalbini dünyalıklardan arındır. İsmi Azam, ağızdan çıkan kelime değil, kalbin ulaştığı bir «hal»dir.",
            "Allah'tan başka hiçbir şeyi düşünme. O'nu görüyormuş gibi bir ihlas haline gir.",
            "Niyet et: «Allah'ım, senin yüce isimlerine sığındım. Acziyetimi itiraf ediyor, yalnız senden istiyorum.»",
          ]} colors={colors} />
        </Kutu>

        {ismiAzamDualari.map((dua) => (
          <DuaKartiFull key={dua.id} dua={dua} colors={colors} />
        ))}

        <MetotKutusu
          baslik="el-Hayyü'l-Kayyûm Sırrı — Übey b. Kâ'b Rivayeti"
          kaynak="Tirmizî · Sahih"
          aciklama="Hz. Peygamber, İsmi Azam'ın Bakara, Âl-i İmrân ve Tâhâ surelerinde olduğunu bildirmiştir. Bu üç surede ortak olan vasıf: «el-Hayyü'l-Kayyûm» — Ebedî diri, her şeyi ayakta tutan."
          uygulama="«Yâ Hayyü, Yâ Kayyûm» diyerek Allah'a yönel; Bakara 255, Âl-i İmrân 2 ve Tâhâ 111'i oku."
          colors={colors}
        />

        <MetotKutusu
          baslik="Esma binti Yezid (r.anha) Rivayeti"
          kaynak="İbn Mâce · Sahih"
          aciklama="Hz. Peygamber şöyle buyurdu: «Allah'ın İsmi Azam'ı şu iki ayettedir: Bakara 163 ve Âl-i İmrân 2.»"
          uygulama="Bu iki ayeti 3'er defa oku; «Yâ Rahmân, Yâ Rahîm, Yâ Hayy, Yâ Kayyûm» diyerek dua et."
          colors={colors}
        />

        <MetotKutusu
          baslik="Hz. Ali (r.a.) Tavsiyesi"
          kaynak="Sahih Sahabi Uygulaması"
          aciklama="Hz. Ali şöyle buyurdu: «Allah'a İsmi Azam'ı ile dua etmek istediğinde, Hadid Suresi'nin ilk on ayetini ve Haşr Suresi'nin son üç ayetini oku.»"
          uygulama="Önce Hadid 1–10, sonra Haşr 22–24 oku; secdede isteklerini dile getir."
          puan="8/10"
          colors={colors}
        />

        <VerseSubHeader label="İsmi Azam Ayetleri" colors={colors} />
        <View style={[styles.kutu, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[styles.bodyText, { color: colors.textSecondary, textAlign: "center" }]}>
            İsmi Azam ile ilişkili ayetleri görmek için web uygulamasını ziyaret edin.
          </Text>
        </View>

        {/* ── Bölüm 2: Sekine Duası ─────────────────────────────────── */}
        <Text style={[styles.bolumBaslik, { color: colors.text, marginTop: 8 }]}>🌀 Sekine Duası — 19 Ayet Protokolü</Text>

        {/* Tabut-u Sekine */}
        <View style={[styles.kutu, { backgroundColor: colors.violetBg, borderColor: colors.violetBorder }]}>
          <Text style={[styles.duaBaslik, { color: colors.violetText, marginBottom: 8 }]}>
            📦 Tabut-u Sekine Nedir?
          </Text>

          {/* Arapça RTL */}
          <View style={[styles.arabicBox, { borderColor: colors.violetBorder }]}>
            <Text
              style={[styles.arabicText, { color: colors.text, writingDirection: "rtl" as const }]}
            >
              {sekineDuasi.arapca}
            </Text>
          </View>

          <Text style={[styles.duaAnlam, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: "700" }}>Bakara 248 — Anlamı: </Text>{sekineDuasi.meal}
          </Text>
          <Text style={[styles.duaUygulama, { color: colors.violetText }]}>
            {sekineDuasi.aciklama}
          </Text>
        </View>

        {/* Bakara 250 */}
        <DuaKartiFull dua={bakara250} colors={colors} />

        <Kutu baslik="Hazırlık" colors={colors} renk="violet">
          <StepList steps={[
            "Zihnini dünya gailelerinden arındır, kalbini Allah'ın rızasına odakla.",
            "7 kez «Estağfirullah el-Azîm» oku.",
            "7 kez salavat getir.",
            "10 kez «Allahu Ekber» de.",
          ]} colors={colors} />
        </Kutu>

        <Kutu baslik="Dairesel Zikir Protokolü" colors={colors} renk="violet">
          <StepList steps={[
            "Besmele çek.",
            "Şu 6 esmayı oku: «Ferdün, Hayyün, Kayyûmün, Hakemün, Adlün, Kuddûsün».",
            "Hemen ardından listedeki ilk Sekine ayetini oku.",
            "Bu üçlüyü (Besmele + 6 Esma + Ayet) 19 defa tekrarla.",
            "Her ayet için aynı döngüyü uygula — toplam 19 ayet.",
            "İster 19 güne böl, ister tek oturuşta tamamla.",
          ]} colors={colors} />
        </Kutu>

        <View style={[styles.kutu, { backgroundColor: colors.violetBg, borderColor: colors.violetBorder }]}>
          <Text style={[styles.kutuBaslik, { color: colors.violetText }]}>Tevafuk Notu</Text>
          <BulletList items={[
            "Besmele 19 harftir.",
            "6 esma (Ferdün, Hayyün, Kayyûmün, Hakemün, Adlün, Kuddûsün) toplam 19 harftir.",
            "Sekine listesindeki ayet sayısı 19'dur.",
            "Bu tevafuk, manevi bir tamamlanmayı ve koruma halkasını simgeler.",
          ]} colors={colors} />
        </View>

        <VerseSubHeader label="Sekine Duası Ayetleri (Sırasıyla)" colors={colors} />
        <View style={[styles.kutu, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[styles.bodyText, { color: colors.textSecondary, textAlign: "center" }]}>
            Sekine ayetlerini görmek için web uygulamasını ziyaret edin.
          </Text>
        </View>

        {/* ── Bölüm 3: Günlük Korunma Duaları ────────────────────────── */}
        <Text style={[styles.bolumBaslik, { color: colors.text, marginTop: 8 }]}>🛡️ Günlük Korunma Duaları</Text>

        <Kutu baslik="Korunma Duaları Hakkında" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            Aşağıdaki dualar, Peygamber Efendimiz'in (s.a.v.) bizzat okuduğu ve ümmetine tavsiye ettiği,
            sahih hadislerle sabit günlük korunma dualarıdır. Her biri 10/10 güvenilirlik puanına sahiptir.
          </Text>
        </Kutu>

        {korunmaDualari.map((dua) => (
          <KorunmaKarti key={dua.id} dua={dua} colors={colors} />
        ))}

        {/* Tavsiye */}
        <View style={[styles.kutu, { backgroundColor: colors.amberBg, borderColor: colors.amberBorder }]}>
          <Text style={[styles.bodyText, { color: colors.amberText, textAlign: "center", fontWeight: "600" }]}>
            📿 Bu duaları günlük rutininize ekleyin. Allah'ın izniyle sizi görünmez kazalardan ve şerlerden muhafaza eder.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  hero:          { marginBottom: 20 },
  heroTitle:     { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, flex: 1 },
  heroSub:       { fontSize: 13, lineHeight: 20, marginTop: 6 },

  kutu: {
    borderRadius: 14, borderWidth: 1,
    padding: 14, marginBottom: 14,
  },
  kutuBaslik: {
    fontSize: 11, fontWeight: "800", textTransform: "uppercase",
    letterSpacing: 1.5, marginBottom: 10,
  },

  bodyText:     { fontSize: 13, lineHeight: 21 },
  stepCircle:   { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepCircleText: { fontSize: 11, fontWeight: "800" },
  bulletDot:    { width: 6, height: 6, borderRadius: 3, marginTop: 7 },

  // Arapça RTL
  arabicBox: {
    borderRadius: 10, borderWidth: 1,
    padding: 12, marginBottom: 10,
  },
  arabicText: {
    fontSize: 20, lineHeight: 38,
    textAlign: "right",
    fontFamily: "serif",
  },

  duaBaslik:   { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  duaOkunus:   { fontSize: 12, lineHeight: 19, fontStyle: "italic", marginBottom: 6, fontFamily: "monospace" },
  duaAnlam:    { fontSize: 12, lineHeight: 19, marginBottom: 4 },
  duaUygulama: { fontSize: 12, lineHeight: 19 },
  badge:       { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:   { fontSize: 10, fontWeight: "700" },

  subHeader: {
    fontSize: 11, fontWeight: "800", textTransform: "uppercase",
    letterSpacing: 1.5, marginBottom: 8, marginTop: 4,
  },

  bolumBaslik: {
    fontSize: 15, fontWeight: "700", marginTop: 8, marginBottom: 10,
  },

  badgeGrid:    { flexDirection: "row", gap: 10, marginBottom: 20 },
  guvenCard:    { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12 },
  badgeScore:   { fontSize: 12, fontWeight: "800" },
  guvenTitle:   { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  guvenDesc:    { fontSize: 10, lineHeight: 15 },
});