export interface DuaKarti {
  id: string;
  baslik: string;
  kaynak: string;
  guvenilirlik: "10/10" | "8/10";
  arapca: string;
  meal: string;
  transkripsiyon: string;
  uygulama: string;
}

export interface KorunmaDuasi extends DuaKarti {
  kategori: "sabah-aksam" | "evden-cikarken" | "yatarken" | "genel-korunma";
}

export interface SekineDuasi {
  id: string;
  baslik: string;
  arapca: string;
  meal: string;
  aciklama: string;
}

export const ismiAzamDualari: DuaKarti[] = [
  {
    id: "ismi-azam-1",
    baslik: "Büreyde b. Husayb (r.a.) Rivayeti",
    kaynak: "Tirmizî, Ebû Dâvûd · Sahih",
    guvenilirlik: "10/10",
    arapca:
      "اللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنِّي أَشْهَدُ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ الْأَحَدُ الصَّمَدُ الَّذِي لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
    meal: "Allah'ım! Senin tek (Ahad) ve hiçbir şeye muhtaç olmayan (Samed), doğurmamış, doğmamış ve hiçbir dengi bulunmayan mutlak Allah olduğuna şehadet ederek senden istiyorum.",
    transkripsiyon:
      "Allahümme innî es'elüke bi-ennî eşhedü enneke ente'llâhü lâ ilâhe illâ ente'l-ehadü's-samedü'l-lezî lem yelid ve lem yûled ve lem yekün lehû küfüven ehad",
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

export const korunmaDualari: KorunmaDuasi[] = [
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
      "Allahümme ente Rabbî lâ ilâhe illâ ente halaktenî ve ene abdüke ve ene alâ ahdike ve va'dike mesteta'tü, eûzü bike min şerri mâ sana'tü, ebûü leke bi ni'metike aleyye ve ebûü bi zenbî fağfirlî feinnehû lâ yağfiruz-zünûbe illâ ente",
    uygulama: "Sabah ve akşam oku. Fazileti: Kim bu duayı gündüz inanarak okur da akşam olmadan ölürse cennetlik; gece inanarak okur da sabah olmadan ölürse cennetlik olur (Buhârî).",
  },
];

export const sekineDuasi: SekineDuasi = {
  id: "sekine",
  baslik: "Tabut-u Sekine ve Huzur Duası",
  arapca:
    "إِنَّ آيَةَ مُلْكِهِ أَنْ يَأْتِيَكُمُ التَّابُوتُ فِيهِ سَكِينَةٌ مِنْ رَبِّكُمْ وَبَقِيَّةٌ مِمَّا تَرَكَ آلُ مُوسَى وَآلُ هَارُونَ تَحْمِلُهُ الْمَلَائِكَةُ ۚ إِنَّ فِي ذَٰلِكَ لَآيَةً لَكُمْ إِنْ كُنْتُمْ مُؤْمِنِينَ",
  meal: "Onun hükümdarlığının alameti, size o sandığın (Tabut) gelmesidir. Onda Rabbinizden bir sekinet (huzur ve güven), Musa ve Harun ailelerinin bıraktıklarından bir kalıntı vardır. Onu melekler taşımaktadır. Eğer inananlardan iseniz, bunda sizin için kesin bir alamet vardır.",
  aciklama:
    "Sekine, Allah'ın mümin kullarının kalbine indirdiği huzur, sükunet ve manevi güçtür. Tabut-u Sekine, bu ilahi huzurun sembolü olarak anılır.",
};

export const bakara250: DuaKarti = {
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
