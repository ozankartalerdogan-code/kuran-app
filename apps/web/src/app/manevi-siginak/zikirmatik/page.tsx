"use client";

import { useState, useCallback, useEffect, useRef } from "react";

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
// SVG İKONLAR (Ionicons bağımlılığına gerek kalmadan)
// ═══════════════════════════════════════════════════════════

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
      <path d="M18 14l1 3.5L22.5 18.5 19 19.5 18 23l-1-3.5L13.5 18.5 17 19.5 18 14z" opacity={0.5} />
      <path d="M4 18l.5 2L6.5 20.5 4.5 21 4 23l-.5-2L1.5 20.5 3.5 20 4 18z" opacity={0.3} />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <polyline points="23 20 23 14 17 14" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}

function LoopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// ALT BİLEŞEN – Esma Kartı
// ═══════════════════════════════════════════════════════════

function EsmaKart({
  item,
  onPress,
  isActive,
}: {
  item: EsmaItem;
  onPress: (item: EsmaItem) => void;
  isActive: boolean;
}) {
  return (
    <button
      onClick={() => onPress(item)}
      className={`group w-full text-left rounded-2xl border p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] cursor-pointer
        ${
          isActive
            ? "border-navy-500/60 bg-navy-50/80 dark:bg-navy-900/20 shadow-md shadow-navy-500/10"
            : "border-gold-500/15 bg-white dark:bg-stone-900/70 hover:border-gold-400/30 hover:bg-gold-50/30 dark:hover:bg-gold-900/10"
        }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Sol: ID & Arapça */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-600/10 border border-navy-500/20 text-xs font-bold text-navy-600 dark:text-navy-400">
            {item.id}
          </span>
          <div className="min-w-0">
            <p lang="ar" className="text-xl leading-tight text-gold-700 dark:text-gold-200 font-arabic truncate">
              {item.arapca}
            </p>
            <p className="text-sm font-medium text-stone-500 dark:text-stone-400 truncate">
              {item.okunus}
            </p>
          </div>
        </div>
        {/* Sağ: Zikir Adedi */}
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-navy-50 dark:bg-navy-900/30 border border-navy-200 dark:border-navy-800/40 px-3 py-1">
          <LoopIcon className="h-3 w-3 text-navy-500 dark:text-navy-400" />
          <span className="text-xs font-bold text-navy-600 dark:text-navy-300">
            {item.zikirAdedi}
          </span>
        </div>
      </div>
      {/* Alt: Meal */}
      <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-500 ml-11">
        {item.meal}
      </p>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// ANA BİLEŞEN – ZikirmatikPage
// ═══════════════════════════════════════════════════════════

export default function ZikirmatikPage() {
  // ── State ──
  const [sayac, setSayac] = useState(0);
  const [hedef, setHedef] = useState<number | null>(null);
  const [ozelHedefInput, setOzelHedefInput] = useState("");
  const [secilenHedefLabel, setSecilenHedefLabel] = useState<string | null>(null);
  const [ozelHedefMod, setOzelHedefMod] = useState(false);
  const [activeEsmaId, setActiveEsmaId] = useState<number | null>(null);
  const [animClass, setAnimClass] = useState("");
  const [targetReachedAnim, setTargetReachedAnim] = useState(false);

  const zikirBtnRef = useRef<HTMLButtonElement>(null);
  const ozelInputRef = useRef<HTMLInputElement>(null);

  // ── Hesaplamalar ──
  const hedefeUlasildi = hedef !== null && sayac >= hedef && hedef > 0;
  const ilerlemeYuzdesi = hedef && hedef > 0 ? Math.min((sayac / hedef) * 100, 100) : 0;

  // ── Hedefe ulaşma animasyonu ──
  useEffect(() => {
    if (hedefeUlasildi && !targetReachedAnim) {
      setTargetReachedAnim(true);
      const t = setTimeout(() => setTargetReachedAnim(false), 3000);
      return () => clearTimeout(t);
    }
    if (!hedefeUlasildi) {
      setTargetReachedAnim(false);
    }
  }, [hedefeUlasildi, targetReachedAnim]);

  // ── Zikir Çek ──
  const zikirCek = useCallback(() => {
    setSayac((prev) => prev + 1);
    setAnimClass("scale-95");
    setTimeout(() => setAnimClass("scale-100"), 120);
  }, []);

  // ── Sıfırla ──
  const sifirla = useCallback(() => {
    setSayac(0);
  }, []);

  // ── Hedef Seç ──
  const hedefSec = useCallback((option: HedefOption) => {
    if (option.value === -1) {
      setOzelHedefMod(true);
      setSecilenHedefLabel("Özel");
      setTimeout(() => ozelInputRef.current?.focus(), 50);
      return;
    }
    setOzelHedefMod(false);
    setOzelHedefInput("");
    setHedef(option.value);
    setSecilenHedefLabel(option.label);
    setSayac(0);
    setActiveEsmaId(null);
  }, []);

  // ── Özel Hedefi Onayla ──
  const ozelHedefOnayla = useCallback(() => {
    const sayi = parseInt(ozelHedefInput, 10);
    if (!isNaN(sayi) && sayi > 0) {
      setHedef(sayi);
      setSecilenHedefLabel(String(sayi));
      setSayac(0);
      setOzelHedefMod(false);
      setOzelHedefInput("");
      setActiveEsmaId(null);
    }
  }, [ozelHedefInput]);

  // ── Esma Kartına Tıklanınca Hedefi Set Et ──
  const esmaHedefSet = useCallback((item: EsmaItem) => {
    setHedef(item.zikirAdedi);
    setSecilenHedefLabel(String(item.zikirAdedi));
    setActiveEsmaId(item.id);
    setSayac(0);
    setOzelHedefMod(false);
    setOzelHedefInput("");
    // Kart görüntüsüne scroll
    setTimeout(() => {
      const el = document.getElementById(`esma-${item.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  }, []);

  // ── Klavye Desteği: Space tuşu ile zikir çek ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Input alanlarına odaklıyken space tuşu zikri tetiklemesin
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        zikirCek();
        zikirBtnRef.current?.classList.add("ring-4", "ring-navy-300/50");
        setTimeout(() => {
          zikirBtnRef.current?.classList.remove("ring-4", "ring-navy-300/50");
        }, 200);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zikirCek]);

  // ── Özel hedef Enter ile onayla ──
  function handleOzelKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      ozelHedefOnayla();
    }
  }

  // ── Render ──
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* ═══ Hero Başlık ═══ */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-3">
          <SparklesIcon className="h-7 w-7 text-gold-400" />
          <h1 className="text-2xl font-bold tracking-wider text-gold-600 dark:text-gold-300">
            ZİKİRMATİK
          </h1>
          <SparklesIcon className="h-7 w-7 text-gold-400" />
        </div>
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400 max-w-md mx-auto">
          Zikir sayacı ile hedef belirleyin, Esmaül Hüsna'daki isimlerin zikir adetlerini keşfedin.
        </p>
      </div>

      {/* ═══ ÜST KISIM: ZİKİRMATİK SAYACI ═══ */}
      <div className="mb-10 rounded-2xl border border-stone-200 bg-white/60 dark:border-stone-700/60 dark:bg-stone-900/50 p-6 sm:p-8 backdrop-blur-sm">
        {/* Sayaç Göstergesi */}
        <div className="flex flex-col items-center mb-6">
          <div
            className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-500
              ${hedefeUlasildi
                ? "border-navy-400 bg-navy-900/20 shadow-[0_0_40px_rgba(52,211,153,0.3)]"
                : "border-gold-500/40 bg-stone-100 dark:bg-stone-800/60 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
              }`}
          >
            <span
              className={`text-6xl sm:text-7xl font-black tracking-wider tabular-nums transition-all duration-300 ${animClass}
                ${hedefeUlasildi ? "text-navy-400 dark:text-navy-300" : "text-gold-600 dark:text-gold-200"}`}
            >
              {sayac}
            </span>
            {/* İlerleme çemberi */}
            {hedef && hedef > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 w-28 rounded-full bg-stone-300 dark:bg-stone-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${hedefeUlasildi ? "bg-navy-400" : "bg-gold-400"}`}
                    style={{ width: `${ilerlemeYuzdesi}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
                  {hedefeUlasildi ? "100%" : `${Math.floor(ilerlemeYuzdesi)}%`}
                </span>
              </div>
            )}
            {/* Hedefe ulaşma rozeti */}
            {hedefeUlasildi && (
              <div className={`absolute -top-4 -right-4 transition-all duration-500 ${targetReachedAnim ? "scale-110" : "scale-100"}`}>
                <div className="bg-navy-500 rounded-full p-2 shadow-lg shadow-navy-500/40">
                  <CheckIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hedef Bilgisi */}
        {secilenHedefLabel && (
          <div className="flex items-center justify-center gap-2 mb-5">
            <TargetIcon className="h-4 w-4 text-gold-500 dark:text-gold-400" />
            <span className="text-sm text-gold-600 dark:text-gold-400/90 font-medium">
              Hedef: {secilenHedefLabel}
              {hedefeUlasildi && (
                <span className="ml-1.5 text-navy-600 dark:text-navy-400 font-semibold">
                  — Elhamdülillah, hedefe ulaşıldı!
                </span>
              )}
            </span>
          </div>
        )}

        {/* Ana Zikir Çek Butonu */}
        <div className="flex justify-center mb-5">
          <button
            ref={zikirBtnRef}
            onClick={zikirCek}
            className="group relative flex items-center gap-4 rounded-3xl bg-navy-600 hover:bg-navy-500 active:bg-navy-700 px-10 py-5 text-white shadow-xl shadow-navy-600/25 transition-all duration-200 hover:shadow-2xl hover:shadow-navy-500/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-navy-300/50"
          >
            {/* Sol el ikon */}
            <svg className="h-6 w-6 opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 0 1 1.414 3.414L12 18.828l-2.828-2.828-3 3" />
            </svg>
            <span className="text-2xl sm:text-3xl font-extrabold tracking-widest select-none">
              ZİKİR ÇEK
            </span>
            {/* Sağ el ikon */}
            <svg className="h-6 w-6 opacity-80 group-hover:opacity-100 transition-opacity scale-x-[-1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 0 1 1.414 3.414L12 18.828l-2.828-2.828-3 3" />
            </svg>
          </button>
        </div>

        {/* Klavye ipucu */}
        <p className="text-center text-[11px] text-stone-400 dark:text-stone-600 mb-5">
          <kbd className="inline-flex items-center rounded border border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-stone-500 dark:text-stone-400">
            Space
          </kbd>
          {" "}tuşuna basarak da zikir çekebilirsiniz
        </p>

        {/* Alt Butonlar: Sıfırla & Hedef Seçenekleri */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          {/* Sıfırla */}
          <button
            onClick={sifirla}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 py-2.5 text-sm font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 transition-colors"
          >
            <RefreshIcon className="h-4 w-4" />
            Sıfırla
          </button>

          {/* Hızlı Hedef Butonları */}
          {HEDEF_SECENEKLERI.map((opt) => (
            <button
              key={opt.label}
              onClick={() => hedefSec(opt)}
              className={`inline-flex items-center gap-1 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all active:scale-95
                ${
                  secilenHedefLabel === opt.label
                    ? "bg-gold-100 border-gold-400 text-gold-700 dark:bg-gold-900/30 dark:border-gold-500/50 dark:text-gold-300"
                    : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                }`}
            >
              {opt.value === -1 && <EditIcon className="h-3.5 w-3.5" />}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Özel Hedef Input Alanı */}
        {ozelHedefMod && (
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <input
              ref={ozelInputRef}
              type="number"
              min="1"
              className="flex-1 rounded-xl border border-gold-400/40 bg-stone-50 dark:bg-stone-800 px-4 py-3 text-base text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all"
              placeholder="Özel hedef sayısı girin (örn: 313)"
              value={ozelHedefInput}
              onChange={(e) => setOzelHedefInput(e.target.value)}
              onKeyDown={handleOzelKeyDown}
            />
            <button
              onClick={ozelHedefOnayla}
              className="rounded-xl bg-gold-500 hover:bg-gold-400 active:bg-gold-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-gold-500/20 transition-all"
            >
              Ayarla
            </button>
          </div>
        )}
      </div>

      {/* ═══ ALT KISIM: ESMAÜL HÜSNA LİSTESİ ═══ */}
      <div className="rounded-2xl border border-stone-200 bg-white/60 dark:border-stone-700/60 dark:bg-stone-900/50 p-6 sm:p-8 backdrop-blur-sm">
        {/* Liste Başlığı */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-6 rounded-full bg-gold-400" />
            <h2 className="text-lg font-bold text-gold-700 dark:text-gold-200">
              Esmaül Hüsna
            </h2>
          </div>
          <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
            99 İsim
          </span>
        </div>

        {/* Açıklama */}
        <p className="mb-5 text-xs leading-5 text-stone-500 dark:text-stone-500">
          Bir Esma kartına tıklayarak o ismin zikir adedini otomatik olarak hedef belirleyebilirsiniz.
        </p>

        {/* Arama / Filtre (opsiyonel, hızlı bulma) */}
        <FilterBar esmalar={ESMALAR} onSelectEsma={esmaHedefSet} />

        {/* Esma Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ESMALAR.map((item) => (
            <div key={item.id} id={`esma-${item.id}`}>
              <EsmaKart
                item={item}
                onPress={esmaHedefSet}
                isActive={activeEsmaId === item.id}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════
// ALT BİLEŞEN – Arama / Filtre Bar
// ═══════════════════════════════════════════════════════════

function FilterBar({
  esmalar,
  onSelectEsma,
}: {
  esmalar: EsmaItem[];
  onSelectEsma: (item: EsmaItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EsmaItem[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const q = query.toLocaleLowerCase("tr-TR").trim();
    const filtered = esmalar.filter(
      (e) =>
        e.okunus.toLocaleLowerCase("tr-TR").includes(q) ||
        e.meal.toLocaleLowerCase("tr-TR").includes(q) ||
        e.arapca.includes(q) ||
        String(e.zikirAdedi).includes(q),
    );
    setResults(filtered.slice(0, 8));
    setShowResults(true);
  }, [query, esmalar]);

  function handleSelect(item: EsmaItem) {
    onSelectEsma(item);
    setQuery("");
    setShowResults(false);
  }

  return (
    <div className="relative mb-5">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500" />
        <input
          type="text"
          className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 pl-10 pr-4 py-2.5 text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all"
          placeholder="Esma ara (okunuş, meal, zikir adedi)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowResults(true); }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-xl shadow-stone-200/50 dark:shadow-stone-950/50 overflow-hidden">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors border-b border-stone-100 dark:border-stone-700/50 last:border-0"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-600/10 text-[10px] font-bold text-navy-600 dark:text-navy-400">
                {item.id}
              </span>
              <span lang="ar" className="text-base text-gold-700 dark:text-gold-200 font-arabic">
                {item.arapca}
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 truncate">
                {item.okunus}
              </span>
              <span className="ml-auto text-[10px] font-bold text-navy-500 dark:text-navy-400">
                {item.zikirAdedi}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}