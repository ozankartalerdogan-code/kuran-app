import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

// ── Tipler ──────────────────────────────────────────────

type TabKey = "iman" | "ibadetler" | "abdest";

interface AccordionItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  details: string[];
}

interface RekatRow {
  vakit: string;
  sunnet: string;
  farz: string;
  sonSunnet: string;
  vitir: string;
  toplam: number;
}

interface NisapItem {
  varlik: string;
  nisap: string;
  oran: string;
}

interface HacAdim {
  adim: number;
  baslik: string;
  aciklama: string;
  hukum: "Farz" | "Vacip" | "Sünnet";
}

interface AbdestKategori {
  id: string;
  baslik: string;
  icon: keyof typeof Ionicons.glyphMap;
  farzlar: string[];
  sunnetler: string[];
}

interface GuideCard {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  content: string[];
}

// ── Statik Veriler ─────────────────────────────────────

const islamSartlari: AccordionItem[] = [
  {
    id: "kelime-i-sehadet",
    title: "1. Kelime-i Şehadet",
    icon: "chatbubble-ellipses",
    details: [
      "Eşhedü en lâ ilâhe illallah ve eşhedü enne Muhammeden abdühû ve resûlühû.",
      "Allah'tan başka ilah olmadığına ve Hz. Muhammed'in (s.a.v.) O'nun kulu ve elçisi olduğuna şahitlik etmektir.",
      "İslam'a girişin ilk adımıdır.",
    ],
  },
  {
    id: "namaz",
    title: "2. Namaz Kılmak",
    icon: "time",
    details: [
      "Günde 5 vakit namaz kılmak, akıllı ve ergenlik çağına gelmiş her Müslümana farzdır.",
      "Namaz, dinin direğidir (Tirmizi).",
      "Sabah, Öğle, İkindi, Akşam, Yatsı olmak üzere 5 vakit kılınır.",
    ],
  },
  {
    id: "oruc",
    title: "3. Oruç Tutmak",
    icon: "moon",
    details: [
      "Ramazan ayında oruç tutmak farzdır.",
      "Tan yerinin ağarmasından (imsak) güneşin batmasına (iftar) kadar yemekten, içmekten ve şehevi arzulardan uzak durmaktır.",
      "Oruç, sabrı ve Allah'a yakınlığı pekiştirir.",
    ],
  },
  {
    id: "zekat",
    title: "4. Zekât Vermek",
    icon: "cash",
    details: [
      "Dinen zengin sayılan Müslümanların, malının belirli bir kısmını (genelde 1/40) yılda bir kez ihtiyaç sahiplerine vermesidir.",
      "Zekât, malı temizler ve toplumsal dayanışmayı sağlar.",
      "Nisap miktarı 80.18 gr altın veya 561 gr gümüş karşılığıdır.",
    ],
  },
  {
    id: "hac",
    title: "5. Hacca Gitmek",
    icon: "airplane",
    details: [
      "Gücü yeten, maddi ve bedeni imkanı olan her Müslümanın ömründe bir kez Kabe'yi ziyaret etmesi farzdır.",
      "Hac, Zilhicce ayının 9-13. günleri arasında Mekke'de yapılır.",
      "Dünya Müslümanlarının birlik ve beraberliğini simgeler.",
    ],
  },
];

const imanSartlari: AccordionItem[] = [
  {
    id: "iman-allah",
    title: "1. Allah'a İman",
    icon: "sunny",
    details: [
      "Allah'ın varlığına, birliğine, eşi ve benzeri olmadığına inanmak.",
      "Allah Teâlâ her şeyi yaratan, yaşatan, rızık veren ve yönetendir.",
      "Esma-ül Hüsna (99 güzel isim) O'nundur.",
    ],
  },
  {
    id: "iman-melekler",
    title: "2. Meleklere İman",
    icon: "cloud",
    details: [
      "Melekler nurdan yaratılmış, Allah'ın emirlerini yerine getiren varlıklardır.",
      "Büyük melekler: Cebrail (vahiy), Mikail (rızık), İsrafil (Sur), Azrail (ölüm).",
      "Melekler insanlara görünmez, cinsiyetleri yoktur, günah işlemezler.",
    ],
  },
  {
    id: "iman-kitaplar",
    title: "3. Kitaplara İman",
    icon: "book",
    details: [
      "Allah'ın peygamberlere vahiy yoluyla gönderdiği kitaplara inanmak.",
      "Büyük kitaplar: Tevrat (Musa), Zebur (Davud), İncil (İsa), Kur'an (Muhammed s.a.v.).",
      "Kur'an-ı Kerim son ilahi kitaptır ve kıyamete kadar korunacaktır.",
    ],
  },
  {
    id: "iman-peygamberler",
    title: "4. Peygamberlere İman",
    icon: "people",
    details: [
      "Allah'ın insanlığa rehber olarak gönderdiği elçilere inanmak.",
      "İlk peygamber Hz. Adem, son peygamber Hz. Muhammed'dir (s.a.v.).",
      "Peygamberler günahsızdır (ismet sıfatı) ve vahyi eksiksiz tebliğ ederler.",
    ],
  },
  {
    id: "iman-ahiret",
    title: "5. Ahiret Gününe İman",
    icon: "infinite",
    details: [
      "Bu dünya hayatından sonra ölüm, kabir, kıyamet, mahşer, hesap, mizan, sırat, cennet ve cehennem hakikattır.",
      "Herkes yaptıklarının karşılığını eksiksiz alacaktır.",
      "Ahiret inancı, insanın sorumluluk bilincini güçlendirir.",
    ],
  },
  {
    id: "iman-kader",
    title: "6. Kader ve Kazaya İman",
    icon: "git-branch",
    details: [
      "Kader: Allah'ın ezelden ebede her şeyi bilmesi ve takdir etmesidir.",
      "Kaza: Takdir edilenin zamanı geldiğinde gerçekleşmesidir.",
      "Hayır ve şer Allah'tandır; kul iradesiyle sorumludur.",
    ],
  },
];

const rekatTablosu: RekatRow[] = [
  { vakit: "Sabah", sunnet: "2", farz: "2", sonSunnet: "—", vitir: "—", toplam: 4 },
  { vakit: "Öğle", sunnet: "4", farz: "4", sonSunnet: "2", vitir: "—", toplam: 10 },
  { vakit: "İkindi", sunnet: "4", farz: "4", sonSunnet: "—", vitir: "—", toplam: 8 },
  { vakit: "Akşam", sunnet: "—", farz: "3", sonSunnet: "2", vitir: "—", toplam: 5 },
  { vakit: "Yatsı", sunnet: "4", farz: "4", sonSunnet: "2", vitir: "3", toplam: 13 },
];

const rekatKolonlar = ["Vakit", "Sünnet", "Farz", "S. Sünnet", "Vitir", "Toplam"];

const nisapTablosu: NisapItem[] = [
  { varlik: "Altın", nisap: "80.18 gr", oran: "%2.5 (1/40)" },
  { varlik: "Gümüş", nisap: "561 gr", oran: "%2.5 (1/40)" },
  { varlik: "Para / Ticari Mal", nisap: "80.18 gr altın karşılığı", oran: "%2.5 (1/40)" },
  { varlik: "Koyun / Keçi", nisap: "40 adet", oran: "1 koyun (40-120 arası)" },
  { varlik: "Sığır / Manda", nisap: "30 adet", oran: "1 erkek buzağı (30-40 arası)" },
  { varlik: "Deve", nisap: "5 adet", oran: "Detaylı fıkıh kitabına bakınız" },
  { varlik: "Toprak Ürünleri", nisap: "653 kg", oran: "%10 (yağmur) / %5 (sulama)" },
];

const zekatSiniflari = [
  "1. Fakirler (Hiçbir malı olmayanlar)",
  "2. Miskinler (Geliri giderini karşılamayanlar)",
  "3. Zekât memurları",
  "4. Müellefe-i Kulûb (Kalpleri İslam'a ısındırılacaklar)",
  "5. Köleler / Esirler",
  "6. Borçlular",
  "7. Allah yolunda olanlar (Fi sebilillah)",
  "8. Yolda kalmışlar (İbnü's-sebil)",
];

const hacAdimlari: HacAdim[] = [
  { adim: 1, baslik: "İhrama Girmek", aciklama: "Mikat sınırında ihram niyetiyle telbiye getirilir ve ihram yasakları başlar.", hukum: "Farz" },
  { adim: 2, baslik: "Arafat Vakfesi", aciklama: "Zilhicce 9 (Arefe) öğle ile akşam arası Arafat'ta bulunmak; haccın rüknüdür.", hukum: "Farz" },
  { adim: 3, baslik: "Ziyaret Tavafı", aciklama: "Arafat'tan sonra Kabe etrafında 7 şavt tavaf yapılır (İfaza Tavafı).", hukum: "Farz" },
  { adim: 4, baslik: "Sa'y", aciklama: "Safa ile Merve tepeleri arasında 4 gidiş + 3 dönüş olmak üzere 7 şavt yürümek.", hukum: "Vacip" },
  { adim: 5, baslik: "Müzdelife Vakfesi", aciklama: "Arefe gecesi Müzdelife'de vakfe yapmak ve şeytan taşlama taşlarını toplamak.", hukum: "Vacip" },
  { adim: 6, baslik: "Şeytan Taşlama (Cemerat)", aciklama: "Bayram günleri Mina'da büyük, orta ve küçük cemrelere 7'şer taş atmak.", hukum: "Vacip" },
  { adim: 7, baslik: "Kurban Kesmek (Hedy)", aciklama: "Temettü ve Kıran haccı yapanların şükür kurbanı kesmesi.", hukum: "Vacip" },
  { adim: 8, baslik: "Saç Tıraşı (Halk/Taksir)", aciklama: "Saçları tamamen tıraş etmek (halk) veya kısaltmak (taksir) ile ihramdan çıkmak.", hukum: "Vacip" },
  { adim: 9, baslik: "Veda Tavafı", aciklama: "Mekke'den ayrılmadan önce Kabe'yi son kez tavaf etmek.", hukum: "Vacip" },
  { adim: 10, baslik: "İhram Namazı ve Telbiye", aciklama: "İhrama girerken 2 rekat namaz kılmak ve sık sık telbiye getirmek.", hukum: "Sünnet" },
];

const orucKart: GuideCard = {
  id: "oruc",
  title: "Oruç Rehberi",
  icon: "moon-outline",
  content: [
    "📅 Ramazan ayı boyunca imsaktan iftara kadar yemek, içmek ve cinsel ilişkiden uzak durulur.",
    "🕌 Farz Oruç: Ramazan orucu, kaza ve keffaret oruçları.",
    "☀️ Sünnet Oruçlar: Aşure (Muharrem 10), Arefe, Pazartesi-Perşembe, Şevval 6 gün.",
    "🌙 Sahur: İmsaktan önce yenilen yemek sünnettir, bereketlidir.",
    "🍽️ İftar: Akşam ezanıyla oruç açılır; acele etmek sünnettir.",
    "🤲 Fitre (Fıtır Sadakası): Ramazan sonunda verilen vacip sadakadır.",
    "💚 Teravih: Ramazan gecelerinde kılınan 20 rekat sünnet namazdır.",
  ],
};

const kurbanKart: GuideCard = {
  id: "kurban",
  title: "Kurban Rehberi",
  icon: "leaf-outline",
  content: [
    "🐑 Kurban Bayramı'nda (Zilhicce 10-13) Allah rızası için hayvan kesmek vaciptir.",
    "📋 Şartlar: Müslüman, akıllı, ergen, mukim ve nisap miktarı mala sahip olmak.",
    "🐄 Kesilebilen hayvanlar: Koyun, keçi (1 kişi); sığır, manda, deve (1-7 kişi).",
    "📏 Yaş şartı: Koyun/keçi 1 yaş, sığır 2 yaş, deve 5 yaşını doldurmalı.",
    "🍖 Etin paylaşımı: 3 eşit parçaya ayrılıp 1/3 ev halkına, 1/3 akrabaya, 1/3 fakirlere.",
    "🤲 Tekbir-i Teşrik: Arefe sabahından bayramın 4. günü ikindiye kadar farz namazlardan sonra söylenir.",
  ],
};

const abdestVerileri: AbdestKategori[] = [
  {
    id: "abdest",
    baslik: "Abdest",
    icon: "water-outline",
    farzlar: [
      "1. Yüzü bir kere yıkamak",
      "2. İki eli dirseklerle beraber bir kere yıkamak",
      "3. Başın dörtte birini mesh etmek",
      "4. İki ayağı topuklarla beraber bir kere yıkamak",
    ],
    sunnetler: [
      "Niyet etmek",
      "Besmele çekmek",
      "Elleri önce bileklere kadar yıkamak",
      "Ağıza ve burna su vermek (mazmaza ve istinşak)",
      "Misvak kullanmak veya diş fırçalamak",
      "Sıraya uymak (tertip)",
      "Azaları peş peşe yıkamak (muvalat)",
      "Her azayı üçer kere yıkamak",
      "Başın tamamını mesh etmek",
      "Kulakları ve boynu mesh etmek",
    ],
  },
  {
    id: "gusul",
    baslik: "Gusül (Boy Abdesti)",
    icon: "water",
    farzlar: [
      "1. Ağza su vermek (mazmaza)",
      "2. Burna su vermek (istinşak)",
      "3. Bütün bedeni kuru yer kalmayacak şekilde yıkamak",
    ],
    sunnetler: [
      "Niyet etmek",
      "Besmele çekmek",
      "Önce elleri, avret yerlerini ve necaset bulaşmış yerleri yıkamak",
      "Abdest almak",
      "Önce başa, sonra sağ omuza, sonra sol omuza su dökmek",
      "Üçer kere yıkanmak",
      "Ayakları en son yıkamak",
    ],
  },
  {
    id: "teyemmum",
    baslik: "Teyemmüm",
    icon: "earth",
    farzlar: [
      "1. Niyet etmek",
      "2. Temiz toprak cinsinden bir şeye ellerle iki kere vurmak",
      "3. Birinci vuruşta yüzü mesh etmek",
      "4. İkinci vuruşta kolları dirseklerle beraber mesh etmek",
    ],
    sunnetler: [
      "Besmele çekmek",
      "Sıraya uymak",
      "Aralıksız yapmak",
      "Parmakların arasını hilallemek",
      "Mümkünse toprak/toprak cinsi şeyi silkmeden mesh etmek",
    ],
  },
];

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "iman", label: "İnanç", icon: "star" },
  { key: "ibadetler", label: "İbadetler", icon: "book" },
  { key: "abdest", label: "Abdest", icon: "water" },
];

// ── Yardımcı Bileşenler ────────────────────────────────

function AccordionCard({
  item,
  expanded,
  onToggle,
  isDark,
}: {
  item: AccordionItem;
  expanded: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.accordionCard, isDark && styles.accordionCardDark]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.accordionHeader}>
        <View style={styles.accordionTitleRow}>
          <Ionicons
            name={item.icon}
            size={20}
            color={isDark ? "#6ee7b7" : "#059669"}
          />
          <Text style={[styles.accordionTitle, isDark && styles.textDarkPrimary]}>
            {item.title}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={isDark ? "#a1a1aa" : "#78716c"}
        />
      </View>
      {expanded && (
        <View style={[styles.accordionBody, isDark && styles.accordionBodyDark]}>
          {item.details.map((d, i) => (
            <Text key={i} style={[styles.accordionDetail, isDark && styles.textDarkSecondary]}>
              • {d}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function GuideCardView({
  card,
  isDark,
}: {
  card: GuideCard;
  isDark: boolean;
}) {
  return (
    <View style={[styles.guideCard, isDark && styles.guideCardDark]}>
      <View style={styles.guideCardHeader}>
        <Ionicons
          name={card.icon}
          size={28}
          color={isDark ? "#6ee7b7" : "#059669"}
        />
        <Text style={[styles.guideCardTitle, isDark && styles.textDarkPrimary]}>
          {card.title}
        </Text>
      </View>
      <View style={styles.guideCardContent}>
        {card.content.map((line, i) => (
          <Text key={i} style={[styles.guideCardText, isDark && styles.textDarkSecondary]}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Badge({ label, type }: { label: string; type: "Farz" | "Vacip" | "Sünnet" }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Farz: { bg: "#fef2f2", text: "#b91c1c" },
    Vacip: { bg: "#fef9c3", text: "#a16207" },
    "Sünnet": { bg: "#ecfdf5", text: "#047857" },
  };
  const c = colors[type];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// ── Ana Bileşen ────────────────────────────────────────

export default function IbadetRehberiScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [activeTab, setActiveTab] = useState<TabKey>("iman");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  function toggleExpand(id: string) {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ── İnanç Sekmesi ──────────────────────────────────
  function renderImanTab() {
    return (
      <View style={styles.tabContent}>
        {/* İslam'ın 5 Şartı */}
        <Text style={[styles.sectionTitle, isDark && styles.textDarkPrimary]}>
          <Ionicons name="star" size={18} color={isDark ? "#6ee7b7" : "#059669"} /> İslam'ın 5 Şartı
        </Text>
        {islamSartlari.map((item) => (
          <AccordionCard
            key={item.id}
            item={item}
            expanded={!!expandedItems[item.id]}
            onToggle={() => toggleExpand(item.id)}
            isDark={isDark}
          />
        ))}

        {/* İman'ın 6 Şartı */}
        <Text style={[styles.sectionTitle, isDark && styles.textDarkPrimary, { marginTop: 32 }]}>
          <Ionicons name="heart" size={18} color={isDark ? "#6ee7b7" : "#059669"} /> İman'ın 6 Şartı
        </Text>
        {imanSartlari.map((item) => (
          <AccordionCard
            key={item.id}
            item={item}
            expanded={!!expandedItems[item.id]}
            onToggle={() => toggleExpand(item.id)}
            isDark={isDark}
          />
        ))}
      </View>
    );
  }

  // ── İbadetler Sekmesi ──────────────────────────────
  function renderIbadetlerTab() {
    return (
      <View style={styles.tabContent}>
        {/* Namaz Rekat Tablosu */}
        <Text style={[styles.sectionTitle, isDark && styles.textDarkPrimary]}>
          <Ionicons name="time-outline" size={18} color={isDark ? "#6ee7b7" : "#059669"} /> Namaz Rekat Tablosu
        </Text>
        <View style={[styles.tableCard, isDark && styles.tableCardDark]}>
          {/* Tablo Başlık */}
          <View style={styles.tableHeaderRow}>
            {rekatKolonlar.map((k) => (
              <Text key={k} style={[styles.tableHeaderCell, isDark && styles.textDarkPrimary]}>
                {k}
              </Text>
            ))}
          </View>
          {/* Tablo Satırlar */}
          {rekatTablosu.map((row) => (
            <View
              key={row.vakit}
              style={[styles.tableRow, isDark && styles.tableRowDark]}
            >
              <Text style={[styles.tableCell, styles.tableCellVakit, isDark && styles.textDarkPrimary]}>
                {row.vakit}
              </Text>
              <Text style={[styles.tableCell, isDark && styles.textDarkSecondary]}>{row.sunnet}</Text>
              <Text style={[styles.tableCell, styles.tableCellFarz, isDark && styles.textEmphasis]}>
                {row.farz}
              </Text>
              <Text style={[styles.tableCell, isDark && styles.textDarkSecondary]}>{row.sonSunnet}</Text>
              <Text style={[styles.tableCell, isDark && styles.textDarkSecondary]}>{row.vitir}</Text>
              <Text style={[styles.tableCell, styles.tableCellToplam, isDark && styles.textDarkPrimary]}>
                {row.toplam}
              </Text>
            </View>
          ))}
        </View>

        {/* Zekat */}
        <Text style={[styles.sectionTitle, isDark && styles.textDarkPrimary, { marginTop: 32 }]}>
          <Ionicons name="cash-outline" size={18} color={isDark ? "#6ee7b7" : "#059669"} /> Zekât Rehberi
        </Text>
        <View style={[styles.tableCard, isDark && styles.tableCardDark]}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }, isDark && styles.textDarkPrimary]}>
              Varlık
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }, isDark && styles.textDarkPrimary]}>
              Nisap
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }, isDark && styles.textDarkPrimary]}>
              Oran
            </Text>
          </View>
          {nisapTablosu.map((n, i) => (
            <View key={i} style={[styles.tableRow, isDark && styles.tableRowDark]}>
              <Text style={[styles.tableCell, { flex: 2 }, isDark && styles.textDarkPrimary]}>
                {n.varlik}
              </Text>
              <Text style={[styles.tableCell, { flex: 2 }, isDark && styles.textDarkSecondary]}>
                {n.nisap}
              </Text>
              <Text style={[styles.tableCell, { flex: 2 }, isDark && styles.textDarkSecondary]}>
                {n.oran}
              </Text>
            </View>
          ))}
        </View>
        {/* Zekat 8 Sınıf */}
        <View style={[styles.guideCard, styles.zekatSinifCard, isDark && styles.guideCardDark]}>
          <Text style={[styles.guideCardTitle, isDark && styles.textDarkPrimary]}>
            <Ionicons name="people-outline" size={20} color={isDark ? "#6ee7b7" : "#059669"} /> Zekât Verilecek 8 Sınıf
          </Text>
          {zekatSiniflari.map((s, i) => (
            <Text key={i} style={[styles.guideCardText, isDark && styles.textDarkSecondary]}>
              {s}
            </Text>
          ))}
        </View>

        {/* Hac */}
        <Text style={[styles.sectionTitle, isDark && styles.textDarkPrimary, { marginTop: 32 }]}>
          <Ionicons name="airplane-outline" size={18} color={isDark ? "#6ee7b7" : "#059669"} /> 10 Adımda Hac İbadeti
        </Text>
        {hacAdimlari.map((adim) => (
          <View key={adim.adim} style={[styles.hacCard, isDark && styles.hacCardDark]}>
            <View style={styles.hacCardLeft}>
              <View style={[styles.hacAdimBadge, isDark && styles.hacAdimBadgeDark]}>
                <Text style={[styles.hacAdimNumber, isDark && styles.textDarkPrimary]}>
                  {adim.adim}
                </Text>
              </View>
            </View>
            <View style={styles.hacCardRight}>
              <View style={styles.hacCardTop}>
                <Text style={[styles.hacBaslik, isDark && styles.textDarkPrimary]}>
                  {adim.baslik}
                </Text>
                <Badge label={adim.hukum} type={adim.hukum} />
              </View>
              <Text style={[styles.hacAciklama, isDark && styles.textDarkSecondary]}>
                {adim.aciklama}
              </Text>
            </View>
          </View>
        ))}

        {/* Oruç */}
        <Text style={[styles.sectionTitle, isDark && styles.textDarkPrimary, { marginTop: 32 }]}>
          <Ionicons name="moon-outline" size={18} color={isDark ? "#6ee7b7" : "#059669"} /> Oruç & Kurban
        </Text>
        <GuideCardView card={orucKart} isDark={isDark} />

        {/* Kurban */}
        <GuideCardView card={kurbanKart} isDark={isDark} />
      </View>
    );
  }

  // ── Abdest Sekmesi ─────────────────────────────────
  function renderAbdestTab() {
    return (
      <View style={styles.tabContent}>
        {abdestVerileri.map((kategori) => (
          <View key={kategori.id} style={styles.abdestGroup}>
            <TouchableOpacity
              style={[styles.abdestHeader, isDark && styles.abdestHeaderDark]}
              onPress={() => toggleExpand(kategori.id)}
              activeOpacity={0.7}
            >
              <View style={styles.abdestTitleRow}>
                <Ionicons
                  name={kategori.icon}
                  size={24}
                  color={isDark ? "#6ee7b7" : "#059669"}
                />
                <Text style={[styles.abdestBaslik, isDark && styles.textDarkPrimary]}>
                  {kategori.baslik}
                </Text>
              </View>
              <Ionicons
                name={expandedItems[kategori.id] ? "chevron-up" : "chevron-down"}
                size={20}
                color={isDark ? "#a1a1aa" : "#78716c"}
              />
            </TouchableOpacity>
            {expandedItems[kategori.id] && (
              <View style={[styles.abdestBody, isDark && styles.abdestBodyDark]}>
                {/* Farzlar */}
                <Text style={[styles.abdestSubTitle, isDark && styles.textDarkPrimary]}>
                  <MaterialIcons
                    name="priority-high"
                    size={16}
                    color={isDark ? "#f87171" : "#b91c1c"}
                  />{" "}
                  Farzlar
                </Text>
                {kategori.farzlar.map((f, i) => (
                  <Text key={i} style={[styles.abdestItem, styles.abdestFarz, isDark && styles.textDarkSecondary]}>
                    {f}
                  </Text>
                ))}
                {/* Sünnetler */}
                <Text style={[styles.abdestSubTitle, isDark && styles.textDarkPrimary, { marginTop: 12 }]}>
                  <MaterialIcons
                    name="star-outline"
                    size={16}
                    color={isDark ? "#6ee7b7" : "#059669"}
                  />{" "}
                  Sünnetler
                </Text>
                {kategori.sunnetler.map((s, i) => (
                  <Text key={i} style={[styles.abdestItem, styles.abdestSunnet, isDark && styles.textDarkSecondary]}>
                    {s}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  }

  // ── Ana Render ─────────────────────────────────────
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Sekme Çubuğu */}
      <View style={[styles.tabBar, isDark && styles.tabBarDark]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={isActive ? "#059669" : isDark ? "#a1a1aa" : "#78716c"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                  isDark && !isActive && styles.tabLabelDark,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* İçerik */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "iman" && renderImanTab()}
        {activeTab === "ibadetler" && renderIbadetlerTab()}
        {activeTab === "abdest" && renderAbdestTab()}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ── Stiller ────────────────────────────────────────────

const styles = StyleSheet.create({
  // Ana Konteyner
  container: {
    flex: 1,
    backgroundColor: "#fafaf9",
  },
  containerDark: {
    backgroundColor: "#18181b",
  },

  // Sekme Çubuğu
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabBarDark: {
    backgroundColor: "#27272a",
    borderColor: "#3f3f46",
    elevation: 0,
    shadowOpacity: 0,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: "#ecfdf5",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#78716c",
  },
  tabLabelActive: {
    color: "#059669",
    fontWeight: "700",
  },
  tabLabelDark: {
    color: "#a1a1aa",
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  tabContent: {
    gap: 8,
  },

  // Bölüm Başlığı
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1917",
    marginBottom: 4,
    gap: 8,
  },

  // Accordion Kartlar
  accordionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  accordionCardDark: {
    backgroundColor: "#27272a",
    borderColor: "#3f3f46",
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accordionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1c1917",
  },
  accordionBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f4",
    gap: 8,
  },
  accordionBodyDark: {
    borderTopColor: "#3f3f46",
  },
  accordionDetail: {
    fontSize: 13,
    lineHeight: 20,
    color: "#57534e",
  },

  // Genel Metin (dark mode)
  textDarkPrimary: {
    color: "#fafaf9",
  },
  textDarkSecondary: {
    color: "#a1a1aa",
  },
  textEmphasis: {
    color: "#6ee7b7",
    fontWeight: "700",
  },

  // Rehber Kartlar
  guideCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    marginTop: 12,
  },
  guideCardDark: {
    backgroundColor: "#27272a",
    borderColor: "#3f3f46",
  },
  guideCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  guideCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1917",
  },
  guideCardContent: {
    gap: 6,
  },
  guideCardText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#57534e",
  },

  // Namaz Tablo
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e7e5e4",
    marginTop: 4,
  },
  tableCardDark: {
    backgroundColor: "#27272a",
    borderColor: "#3f3f46",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f4",
  },
  tableRowDark: {
    borderBottomColor: "#3f3f46",
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    textAlign: "center",
    color: "#44403c",
  },
  tableCellVakit: {
    fontWeight: "600",
    color: "#292524",
    textAlign: "left",
    paddingLeft: 4,
  },
  tableCellFarz: {
    fontWeight: "700",
    color: "#065f46",
  },
  tableCellToplam: {
    fontWeight: "700",
    color: "#1c1917",
  },

  // Zekat 8 Sınıf
  zekatSinifCard: {
    marginTop: 12,
  },

  // Hac Adımları
  hacCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    gap: 12,
  },
  hacCardDark: {
    backgroundColor: "#27272a",
    borderColor: "#3f3f46",
  },
  hacCardLeft: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  hacAdimBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  hacAdimBadgeDark: {
    backgroundColor: "#064e3b",
  },
  hacAdimNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#059669",
  },
  hacCardRight: {
    flex: 1,
    gap: 6,
  },
  hacCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hacBaslik: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1c1917",
    flex: 1,
  },
  hacAciklama: {
    fontSize: 13,
    lineHeight: 19,
    color: "#57534e",
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Abdest
  abdestGroup: {
    borderRadius: 14,
    overflow: "hidden",
  },
  abdestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  abdestHeaderDark: {
    backgroundColor: "#27272a",
    borderColor: "#3f3f46",
  },
  abdestTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  abdestBaslik: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1917",
  },
  abdestBody: {
    backgroundColor: "#fafaf9",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#e7e5e4",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    padding: 16,
    marginTop: -1,
  },
  abdestBodyDark: {
    backgroundColor: "#18181b",
    borderColor: "#3f3f46",
  },
  abdestSubTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1c1917",
    marginBottom: 4,
  },
  abdestItem: {
    fontSize: 13,
    lineHeight: 22,
    paddingLeft: 6,
  },
  abdestFarz: {
    color: "#b91c1c",
  },
  abdestSunnet: {
    color: "#047857",
  },
});