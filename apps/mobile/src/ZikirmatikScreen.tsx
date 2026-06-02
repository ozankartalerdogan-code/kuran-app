import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  // Platform, // Haptics için gerekirse aç
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ═══════════════════════════════════════════════════════════
// TİPLER
// ═══════════════════════════════════════════════════════════

interface EsmaItem {
  id: number;
  arapca: string;
  okunus: string;
  meal: string;
  zikirAdedi: number;
}

interface HedefOption {
  label: string;
  value: number;
}

// ═══════════════════════════════════════════════════════════
// STATİK VERİLER – 99 ESMAÜL HÜSNA
// ═══════════════════════════════════════════════════════════

const ESMALAR: EsmaItem[] = [
  { id: 1, arapca: "الرَّحْمَنُ", okunus: "Er-Rahmân", meal: "Rahmetiyle kullarına sonsuz merhamet eden", zikirAdedi: 298 },
  { id: 2, arapca: "الرَّحِيمُ", okunus: "Er-Rahîm", meal: "Ahirette yalnız müminlere merhamet eden", zikirAdedi: 258 },
  { id: 3, arapca: "الْمَلِكُ", okunus: "El-Melik", meal: "Her şeyin tek sahibi ve hükümdarı", zikirAdedi: 90 },
  { id: 4, arapca: "الْقُدُّوسُ", okunus: "El-Kuddûs", meal: "Bütün noksanlıklardan münezzeh", zikirAdedi: 170 },
  { id: 5, arapca: "السَّلَامُ", okunus: "Es-Selâm", meal: "Kullarına selamet ve huzur veren", zikirAdedi: 131 },
  { id: 6, arapca: "الْمُؤْمِنُ", okunus: "El-Mü'min", meal: "Kullarına güven ve iman veren", zikirAdedi: 136 },
  { id: 7, arapca: "الْمُهَيْمِنُ", okunus: "El-Müheymin", meal: "Her şeyi koruyup gözeten", zikirAdedi: 145 },
  { id: 8, arapca: "الْعَزِيزُ", okunus: "El-Azîz", meal: "İzzet sahibi, her şeye galip olan", zikirAdedi: 94 },
  { id: 9, arapca: "الْجَبَّارُ", okunus: "El-Cebbâr", meal: "Dilediğini zorla yaptıran, kırılanı onaran", zikirAdedi: 206 },
  { id: 10, arapca: "الْمُتَكَبِّرُ", okunus: "El-Mütekebbir", meal: "Büyüklük ve azamet sahibi", zikirAdedi: 662 },
  { id: 11, arapca: "الْخَالِقُ", okunus: "El-Hâlık", meal: "Yaratan, yoktan var eden", zikirAdedi: 731 },
  { id: 12, arapca: "الْبَارِئُ", okunus: "El-Bâri'", meal: "Her şeyi örneksiz ve kusursuz yaratan", zikirAdedi: 213 },
  { id: 13, arapca: "الْمُصَوِّرُ", okunus: "El-Musavvir", meal: "Varlıklara şekil ve suret veren", zikirAdedi: 336 },
  { id: 14, arapca: "الْغَفَّارُ", okunus: "El-Gaffâr", meal: "Günahları çokça bağışlayan", zikirAdedi: 1281 },
  { id: 15, arapca: "الْقَهَّارُ", okunus: "El-Kahhâr", meal: "Her şeye üstün ve hâkim olan", zikirAdedi: 306 },
  { id: 16, arapca: "الْوَهَّابُ", okunus: "El-Vehhâb", meal: "Karşılıksız bol bol ihsan eden", zikirAdedi: 14 },
  { id: 17, arapca: "الرَّزَّاقُ", okunus: "Er-Rezzâk", meal: "Bütün mahlukatın rızkını veren", zikirAdedi: 308 },
  { id: 18, arapca: "الْفَتَّاحُ", okunus: "El-Fettâh", meal: "Hayır kapılarını açan, hüküm veren", zikirAdedi: 489 },
  { id: 19, arapca: "اَلْعَلِيمُ", okunus: "El-Alîm", meal: "Her şeyi hakkıyla bilen", zikirAdedi: 150 },
  { id: 20, arapca: "الْقَابِضُ", okunus: "El-Kâbıd", meal: "Dilediğinin rızkını daraltan", zikirAdedi: 903 },
  { id: 21, arapca: "الْبَاسِطُ", okunus: "El-Bâsıt", meal: "Dilediğinin rızkını genişleten", zikirAdedi: 72 },
  { id: 22, arapca: "الْخَافِضُ", okunus: "El-Hâfıd", meal: "Dilediğini alçaltan", zikirAdedi: 1481 },
  { id: 23, arapca: "الرَّافِعُ", okunus: "Er-Râfi'", meal: "Dilediğini yükselten", zikirAdedi: 351 },
  { id: 24, arapca: "الْمُعِزُّ", okunus: "El-Muizz", meal: "Dilediğine izzet ve şeref veren", zikirAdedi: 117 },
  { id: 25, arapca: "الْمُذِلُّ", okunus: "El-Müzill", meal: "Dilediğini zelil ve perişan eden", zikirAdedi: 770 },
  { id: 26, arapca: "السَّمِيعُ", okunus: "Es-Semî'", meal: "Her şeyi işiten", zikirAdedi: 180 },
  { id: 27, arapca: "الْبَصِيرُ", okunus: "El-Basîr", meal: "Her şeyi gören", zikirAdedi: 302 },
  { id: 28, arapca: "الْحَكَمُ", okunus: "El-Hakem", meal: "Son hükmü veren mutlak adalet sahibi", zikirAdedi: 68 },
  { id: 29, arapca: "الْعَدْلُ", okunus: "El-Adl", meal: "Tam adaletle hükmeden", zikirAdedi: 104 },
  { id: 30, arapca: "اللَّطِيفُ", okunus: "El-Latîf", meal: "En ince işleri bilen, lütuf sahibi", zikirAdedi: 129 },
  { id: 31, arapca: "الْخَبِيرُ", okunus: "El-Habîr", meal: "Her şeyin iç yüzünden haberdar", zikirAdedi: 812 },
  { id: 32, arapca: "الْحَلِيمُ", okunus: "El-Halîm", meal: "Cezada acele etmeyen, yumuşak davranan", zikirAdedi: 88 },
  { id: 33, arapca: "الْعَظِيمُ", okunus: "El-Azîm", meal: "Büyüklüğü ve azameti sınırsız olan", zikirAdedi: 1020 },
  { id: 34, arapca: "الْغَفُورُ", okunus: "El-Gafûr", meal: "Çok bağışlayan", zikirAdedi: 1286 },
  { id: 35, arapca: "الشَّكُورُ", okunus: "Eş-Şekûr", meal: "Az amele çok ecir veren", zikirAdedi: 526 },
  { id: 36, arapca: "الْعَلِيُّ", okunus: "El-Aliyy", meal: "Yüceliği ve şanı en üstün olan", zikirAdedi: 110 },
  { id: 37, arapca: "الْكَبِيرُ", okunus: "El-Kebîr", meal: "Büyüklüğü idrak edilemeyen", zikirAdedi: 232 },
  { id: 38, arapca: "الْحَفِيظُ", okunus: "El-Hafîz", meal: "Her şeyi koruyup muhafaza eden", zikirAdedi: 998 },
  { id: 39, arapca: "الْمُقِيتُ", okunus: "El-Mukît", meal: "Bedenlerin ve ruhların gıdasını veren", zikirAdedi: 550 },
  { id: 40, arapca: "الْحَسِيبُ", okunus: "El-Hasîb", meal: "Herkesin hesabını eksiksiz gören", zikirAdedi: 80 },
  { id: 41, arapca: "الْجَلِيلُ", okunus: "El-Celîl", meal: "Celal ve azamet sahibi", zikirAdedi: 73 },
  { id: 42, arapca: "الْكَرِيمُ", okunus: "El-Kerîm", meal: "Keremi ve cömertliği sonsuz olan", zikirAdedi: 270 },
  { id: 43, arapca: "الرَّقِيبُ", okunus: "Er-Rakîb", meal: "Her an her şeyi gözetleyip kontrol eden", zikirAdedi: 312 },
  { id: 44, arapca: "الْمُجِيبُ", okunus: "El-Mücîb", meal: "Dualara cevap veren", zikirAdedi: 55 },
  { id: 45, arapca: "الْوَاسِعُ", okunus: "El-Vâsi'", meal: "Rahmeti, ilmi ve kudreti her şeyi kuşatan", zikirAdedi: 137 },
  { id: 46, arapca: "الْحَكِيمُ", okunus: "El-Hakîm", meal: "Her işi hikmetli olan", zikirAdedi: 78 },
  { id: 47, arapca: "الْوَدُودُ", okunus: "El-Vedûd", meal: "Kullarını çok seven ve sevilmeye layık olan", zikirAdedi: 20 },
  { id: 48, arapca: "الْمَجِيدُ", okunus: "El-Mecîd", meal: "Şanı ve şerefi çok yüce olan", zikirAdedi: 57 },
  { id: 49, arapca: "الْبَاعِثُ", okunus: "El-Bâis", meal: "Ölüleri dirilten", zikirAdedi: 573 },
  { id: 50, arapca: "الشَّهِيدُ", okunus: "Eş-Şehîd", meal: "Her şeye şahit olan", zikirAdedi: 319 },
  { id: 51, arapca: "الْحَقُّ", okunus: "El-Hakk", meal: "Varlığı hiç değişmeden duran, hakikatin ta kendisi", zikirAdedi: 108 },
  { id: 52, arapca: "الْوَكِيلُ", okunus: "El-Vekîl", meal: "Kendisine güvenilip dayanılan", zikirAdedi: 66 },
  { id: 53, arapca: "الْقَوِيُّ", okunus: "El-Kaviyy", meal: "Kudreti her şeye yeten", zikirAdedi: 116 },
  { id: 54, arapca: "الْمَتِينُ", okunus: "El-Metîn", meal: "Gücü ve kuvveti sarsılmaz olan", zikirAdedi: 500 },
  { id: 55, arapca: "الْوَلِيُّ", okunus: "El-Veliyy", meal: "Müminlerin dostu ve yardımcısı", zikirAdedi: 46 },
  { id: 56, arapca: "الْحَمِيدُ", okunus: "El-Hamîd", meal: "Bütün hamd ve övgülere layık olan", zikirAdedi: 62 },
  { id: 57, arapca: "الْمُحْصِي", okunus: "El-Muhsî", meal: "Her şeyin sayısını eksiksiz bilen", zikirAdedi: 148 },
  { id: 58, arapca: "الْمُبْدِئُ", okunus: "El-Mübdi'", meal: "İlk baştan yaratan", zikirAdedi: 56 },
  { id: 59, arapca: "الْمُعِيدُ", okunus: "El-Muîd", meal: "Yarattıklarını tekrar diriltecek olan", zikirAdedi: 124 },
  { id: 60, arapca: "الْمُحْيِي", okunus: "El-Muhyî", meal: "Hayat ve can veren", zikirAdedi: 68 },
  { id: 61, arapca: "اَلْمُمِيتُ", okunus: "El-Mümît", meal: "Ölümü yaratan", zikirAdedi: 490 },
  { id: 62, arapca: "الْحَيُّ", okunus: "El-Hayy", meal: "Diri, hayat sahibi, ebedi yaşayan", zikirAdedi: 18 },
  { id: 63, arapca: "الْقَيُّومُ", okunus: "El-Kayyûm", meal: "Varlıkları ayakta tutan, baki olan", zikirAdedi: 156 },
  { id: 64, arapca: "الْوَاجِدُ", okunus: "El-Vâcid", meal: "Dilediğini bulan, hiçbir şeye muhtaç olmayan", zikirAdedi: 14 },
  { id: 65, arapca: "الْمَاجِدُ", okunus: "El-Mâcid", meal: "Keremi ve lütfu bol, şanı yüce", zikirAdedi: 48 },
  { id: 66, arapca: "الْوَاحِدُ", okunus: "El-Vâhid", meal: "Tek olan, eşi ve benzeri olmayan", zikirAdedi: 19 },
  { id: 67, arapca: "اَلْأَحَدُ", okunus: "El-Ehad", meal: "Mutlak birliğin sahibi", zikirAdedi: 13 },
  { id: 68, arapca: "الصَّمَدُ", okunus: "Es-Samed", meal: "Hiçbir şeye muhtaç olmayan, herkesin muhtaç olduğu", zikirAdedi: 134 },
  { id: 69, arapca: "الْقَادِرُ", okunus: "El-Kâdir", meal: "Her şeye gücü yeten", zikirAdedi: 305 },
  { id: 70, arapca: "الْمُقْتَدِرُ", okunus: "El-Muktedir", meal: "Sonsuz kudret sahibi, her şeye hakkıyla gücü yeten", zikirAdedi: 744 },
  { id: 71, arapca: "الْمُقَدِّمُ", okunus: "El-Mukaddim", meal: "Dilediğini öne alan", zikirAdedi: 184 },
  { id: 72, arapca: "الْمُؤَخِّرُ", okunus: "El-Muahhir", meal: "Dilediğini geri bırakan", zikirAdedi: 846 },
  { id: 73, arapca: "الْأَوَّلُ", okunus: "El-Evvel", meal: "Varlığının başlangıcı olmayan, ilk", zikirAdedi: 37 },
  { id: 74, arapca: "اَلْآخِرُ", okunus: "El-Âhir", meal: "Varlığının sonu olmayan, son", zikirAdedi: 801 },
  { id: 75, arapca: "الظَّاهِرُ", okunus: "Ez-Zâhir", meal: "Varlığı apaçık olan, aşikâr", zikirAdedi: 1106 },
  { id: 76, arapca: "الْبَاطِنُ", okunus: "El-Bâtın", meal: "Zatının hakikati gizli olan", zikirAdedi: 62 },
  { id: 77, arapca: "الْوَالِي", okunus: "El-Vâlî", meal: "Bütün mahlukatın işlerini yürüten", zikirAdedi: 47 },
  { id: 78, arapca: "الْمُتَعَالِي", okunus: "El-Müteâlî", meal: "Yüceliği ve şanı her şeyden üstün olan", zikirAdedi: 551 },
  { id: 79, arapca: "الْبَرُّ", okunus: "El-Berr", meal: "İyilik ve ihsanı sonsuz olan", zikirAdedi: 202 },
  { id: 80, arapca: "التَّوَّابُ", okunus: "Et-Tevvâb", meal: "Tövbeleri çokça kabul eden", zikirAdedi: 409 },
  { id: 81, arapca: "الْمُنْتَقِمُ", okunus: "El-Müntakim", meal: "Zalimlerden intikam alan", zikirAdedi: 630 },
  { id: 82, arapca: "اَلْعَفُوُّ", okunus: "El-Afüvv", meal: "Çok affeden, günahları silen", zikirAdedi: 156 },
  { id: 83, arapca: "الرَّؤُوفُ", okunus: "Er-Raûf", meal: "Çok şefkatli ve merhametli olan", zikirAdedi: 287 },
  { id: 84, arapca: "مَالِكُ الْمُلْكِ", okunus: "Mâlikü'l-Mülk", meal: "Mülkün ebedi sahibi", zikirAdedi: 212 },
  { id: 85, arapca: "ذُوالْجَلَالِ وَالْإِكْرَامِ", okunus: "Zü'l-Celâli ve'l-İkrâm", meal: "Celal ve ikram sahibi", zikirAdedi: 1100 },
  { id: 86, arapca: "الْمُقْسِطُ", okunus: "El-Muksit", meal: "Adaletle hükmedip hakkı yerine getiren", zikirAdedi: 209 },
  { id: 87, arapca: "الْجَامِعُ", okunus: "El-Câmi'", meal: "Kıyamet günü herkesi bir araya toplayan", zikirAdedi: 114 },
  { id: 88, arapca: "اَلْغَنِيُّ", okunus: "El-Ganiyy", meal: "Hiçbir şeye muhtaç olmayan, mutlak zengin", zikirAdedi: 1060 },
  { id: 89, arapca: "اَلْمُغْنِي", okunus: "El-Mugnî", meal: "Dilediğini zengin eden", zikirAdedi: 1100 },
  { id: 90, arapca: "اَلْمَانِعُ", okunus: "El-Mâni'", meal: "Dilediği şeyi engelleyen", zikirAdedi: 161 },
  { id: 91, arapca: "الضَّارُّ", okunus: "Ed-Dârr", meal: "Dilediğine zarar veren (imtihan için)", zikirAdedi: 1001 },
  { id: 92, arapca: "النَّافِعُ", okunus: "En-Nâfi'", meal: "Dilediğine fayda veren", zikirAdedi: 201 },
  { id: 93, arapca: "النُّورُ", okunus: "En-Nûr", meal: "Gökleri ve yeri nurlandıran", zikirAdedi: 256 },
  { id: 94, arapca: "الْهَادِي", okunus: "El-Hâdî", meal: "Hidayet veren, doğru yola ulaştıran", zikirAdedi: 20 },
  { id: 95, arapca: "الْبَدِيعُ", okunus: "El-Bedî'", meal: "Eşsiz ve benzersiz yaratan", zikirAdedi: 86 },
  { id: 96, arapca: "اَلْبَاقِي", okunus: "El-Bâkî", meal: "Varlığı son bulmayan, ebedi olan", zikirAdedi: 113 },
  { id: 97, arapca: "الْوَارِثُ", okunus: "El-Vâris", meal: "Bütün mülkün asıl varisi", zikirAdedi: 707 },
  { id: 98, arapca: "الرَّشِيدُ", okunus: "Er-Reşîd", meal: "Doğru yolu gösteren, irşad eden", zikirAdedi: 514 },
  { id: 99, arapca: "الصَّبُورُ", okunus: "Es-Sabûr", meal: "Kullarına mühlet veren, çok sabırlı", zikirAdedi: 298 },
];

const HEDEF_SECENEKLERI: HedefOption[] = [
  { label: "33", value: 33 },
  { label: "99", value: 99 },
  { label: "100", value: 100 },
  { label: "500", value: 500 },
  { label: "1000", value: 1000 },
  { label: "Özel", value: -1 },
];

// ═══════════════════════════════════════════════════════════
// ALT BİLEŞEN – Esma Kartı
// ═══════════════════════════════════════════════════════════

const EsmaKart = React.memo(
  ({
    item,
    onPress,
  }: {
    item: EsmaItem;
    onPress: (item: EsmaItem) => void;
  }) => {
    return (
      <TouchableOpacity
        onPress={() => onPress(item)}
        activeOpacity={0.7}
        className="mx-4 mb-3 rounded-2xl border border-amber-500/20 bg-gray-900/90 p-4 active:scale-[0.98]"
        style={{ elevation: 4, shadowColor: "#f59e0b", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 }}
      >
        <View className="flex-row items-center justify-between">
          {/* Sol: ID & Arapça */}
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-600/20 border border-emerald-500/30">
              <Text className="text-xs font-bold text-emerald-300">{item.id}</Text>
            </View>
            <View>
              <Text className="text-2xl font-arabic text-amber-100 mb-0.5" style={{ fontFamily: "Amiri", writingDirection: "rtl" }}>
                {item.arapca}
              </Text>
              <Text className="text-sm font-medium text-gray-300">{item.okunus}</Text>
            </View>
          </View>
          {/* Sağ: Zikir Adedi */}
          <View className="items-end">
            <View className="flex-row items-center gap-1 rounded-full bg-emerald-900/40 px-3 py-1">
              <Ionicons name="repeat" size={12} color="#34d399" />
              <Text className="text-xs font-bold text-emerald-300">{item.zikirAdedi}</Text>
            </View>
          </View>
        </View>
        {/* Alt: Meal */}
        <Text className="mt-2 text-xs leading-5 text-gray-400 ml-12">{item.meal}</Text>
      </TouchableOpacity>
    );
  },
);
EsmaKart.displayName = "EsmaKart";

// ═══════════════════════════════════════════════════════════
// ANA BİLEŞEN – ZikirmatikScreen
// ═══════════════════════════════════════════════════════════

export default function ZikirmatikScreen() {
  // ── State ──
  const [sayac, setSayac] = useState(0);
  const [hedef, setHedef] = useState<number | null>(null);
  const [ozelHedefInput, setOzelHedefInput] = useState("");
  const [secilenHedefLabel, setSecilenHedefLabel] = useState<string | null>(null);
  const [ozelHedefMod, setOzelHedefMod] = useState(false);

  const flatListRef = useRef<FlatList<EsmaItem>>(null);

  // ── Hesaplamalar ──
  const hedefeUlasildi = hedef !== null && sayac >= hedef && hedef > 0;
  const ilerlemeYuzdesi = hedef && hedef > 0 ? Math.min((sayac / hedef) * 100, 100) : 0;

  // ── Haptics (yorum satırı – gerçek kullanım için expo-haptics import edin) ──
  // import * as Haptics from "expo-haptics";
  const triggerHaptic = useCallback(() => {
    // Platform.OS === "ios"
    //   ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    //   : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Titreşim simülasyonu için yorum satırı bırakıldı.
  }, []);

  // ── Zikir Çek ──
  const zikirCek = useCallback(() => {
    setSayac((prev) => prev + 1);
    triggerHaptic();
  }, [triggerHaptic]);

  // ── Sıfırla ──
  const sifirla = useCallback(() => {
    setSayac(0);
  }, []);

  // ── Hedef Seç ──
  const hedefSec = useCallback(
    (option: HedefOption) => {
      if (option.value === -1) {
        // Özel hedef
        setOzelHedefMod(true);
        setSecilenHedefLabel("Özel");
        return;
      }
      setOzelHedefMod(false);
      setOzelHedefInput("");
      setHedef(option.value);
      setSecilenHedefLabel(option.label);
      setSayac(0);
    },
    [],
  );

  // ── Özel Hedefi Onayla ──
  const ozelHedefOnayla = useCallback(() => {
    const sayi = parseInt(ozelHedefInput, 10);
    if (!isNaN(sayi) && sayi > 0) {
      setHedef(sayi);
      setSecilenHedefLabel(String(sayi));
      setSayac(0);
      setOzelHedefMod(false);
      setOzelHedefInput("");
    }
  }, [ozelHedefInput]);

  // ── Esma Kartına Tıklanınca Hedefi Set Et ──
  const esmaHedefSet = useCallback((item: EsmaItem) => {
    setHedef(item.zikirAdedi);
    setSecilenHedefLabel(String(item.zikirAdedi));
    setSayac(0);
    setOzelHedefMod(false);
    setOzelHedefInput("");
  }, []);

  // ── Render ──
  return (
    <View className="flex-1 bg-gray-950">
      {/* ═══ ÜST KISIM: ZİKİRMATİK SAYACI ═══ */}
      <View className="px-5 pt-6 pb-4">
        {/* Başlık */}
        <View className="flex-row items-center justify-center gap-2 mb-6">
          <Ionicons name="sparkles" size={22} color="#fbbf24" />
          <Text className="text-xl font-bold text-amber-300 tracking-wider">ZİKİRMATİK</Text>
          <Ionicons name="sparkles" size={22} color="#fbbf24" />
        </View>

        {/* Sayaç Göstergesi */}
        <View className="items-center mb-4">
          <View
            className={`w-44 h-44 rounded-full items-center justify-center border-4 ${
              hedefeUlasildi
                ? "border-emerald-400 bg-emerald-900/30 shadow-emerald-500/40"
                : "border-amber-500/40 bg-gray-900 shadow-amber-500/20"
            }`}
            style={{
              elevation: 10,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: hedefeUlasildi ? 0.5 : 0.25,
              shadowRadius: 20,
            }}
          >
            <Text
              className={`text-6xl font-black tracking-wide ${
                hedefeUlasildi ? "text-emerald-300" : "text-amber-200"
              }`}
            >
              {sayac}
            </Text>
            {/* İlerleme çemberi göstergesi */}
            {hedef && hedef > 0 && (
              <View className="mt-2 flex-row items-center gap-1">
                <View className="h-1.5 w-24 rounded-full bg-gray-800 overflow-hidden">
                  <View
                    className={`h-full rounded-full ${hedefeUlasildi ? "bg-emerald-400" : "bg-amber-400"}`}
                    style={{ width: `${ilerlemeYuzdesi}%` }}
                  />
                </View>
                <Text className="text-xs text-gray-500">
                  {hedefeUlasildi ? "✓" : `${Math.floor(ilerlemeYuzdesi)}%`}
                </Text>
              </View>
            )}
            {hedefeUlasildi && (
              <View className="absolute -top-3 -right-3">
                <View className="bg-emerald-500 rounded-full p-1.5">
                  <Ionicons name="checkmark-circle" size={26} color="#fff" />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Hedef Bilgisi */}
        {secilenHedefLabel && (
          <View className="flex-row items-center justify-center gap-2 mb-4">
            <Ionicons name="flag" size={14} color="#fbbf24" />
            <Text className="text-sm text-amber-400/80 font-medium">
              Hedef: {secilenHedefLabel} {hedefeUlasildi ? "– Elhamdülillah, hedefe ulaşıldı!" : ""}
            </Text>
          </View>
        )}

        {/* Ana Zikir Çek Butonu */}
        <TouchableOpacity
          onPress={zikirCek}
          activeOpacity={0.8}
          className="mx-4 h-20 rounded-3xl bg-emerald-600 items-center justify-center active:bg-emerald-700 mb-4"
          style={{
            elevation: 8,
            shadowColor: "#059669",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
          }}
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="hand-left" size={24} color="#fff" />
            <Text className="text-2xl font-extrabold text-white tracking-widest">ZİKİR ÇEK</Text>
            <Ionicons name="hand-right" size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Alt Butonlar: Sıfırla & Hedef Seçenekleri */}
        <View className="flex-row flex-wrap items-center justify-center gap-2 mb-3">
          {/* Sıfırla */}
          <TouchableOpacity
            onPress={sifirla}
            className="flex-row items-center gap-1.5 rounded-full bg-gray-800 border border-gray-700 px-4 py-2.5 active:bg-gray-700"
          >
            <Ionicons name="refresh" size={16} color="#f87171" />
            <Text className="text-sm font-semibold text-red-300">Sıfırla</Text>
          </TouchableOpacity>

          {/* Hızlı Hedef Butonları */}
          {HEDEF_SECENEKLERI.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              onPress={() => hedefSec(opt)}
              className={`rounded-full px-4 py-2.5 border active:scale-95 ${
                secilenHedefLabel === opt.label
                  ? "bg-amber-500/20 border-amber-400"
                  : "bg-gray-800 border-gray-700"
              }`}
            >
              <View className="flex-row items-center gap-1">
                {opt.value === -1 && <Ionicons name="create-outline" size={13} color="#fbbf24" />}
                <Text
                  className={`text-sm font-semibold ${
                    secilenHedefLabel === opt.label ? "text-amber-300" : "text-gray-300"
                  }`}
                >
                  {opt.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Özel Hedef Input Alanı */}
        {ozelHedefMod && (
          <View className="flex-row items-center gap-2 mx-4 mb-3">
            <TextInput
              className="flex-1 rounded-xl border border-amber-500/30 bg-gray-800 px-4 py-3 text-base text-white placeholder-gray-500"
              placeholder="Özel hedef sayısı girin (örn: 313)"
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              value={ozelHedefInput}
              onChangeText={setOzelHedefInput}
              onSubmitEditing={ozelHedefOnayla}
            />
            <TouchableOpacity
              onPress={ozelHedefOnayla}
              className="rounded-xl bg-amber-500 px-5 py-3 active:bg-amber-600"
            >
              <Text className="text-sm font-bold text-gray-900">Ayarla</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ═══ ALT KISIM: ESMAÜL HÜSNA LİSTESİ ═══ */}
      <View className="flex-1 bg-gray-900/50 rounded-t-3xl border-t border-amber-500/10 pt-4">
        {/* Liste Başlığı */}
        <View className="flex-row items-center justify-between px-5 mb-3">
          <View className="flex-row items-center gap-2">
            <View className="h-1 w-6 rounded-full bg-amber-400" />
            <Text className="text-lg font-bold text-amber-200">Esmaül Hüsna</Text>
          </View>
          <Text className="text-xs text-gray-500">99 İsim</Text>
        </View>

        {/* Açıklama */}
        <Text className="px-5 mb-3 text-xs text-gray-500 leading-4">
          Bir Esma'ya tıklayarak zikir hedefini otomatik ayarlayabilirsiniz.
        </Text>

        {/* Liste */}
        <FlatList
          ref={flatListRef}
          data={ESMALAR}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <EsmaKart item={item} onPress={esmaHedefSet} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="h-0" />}
        />
      </View>
    </View>
  );
}