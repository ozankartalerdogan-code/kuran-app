export const dynamic = "force-dynamic";
import { ManeviVerseList } from "../ManeviVerseList";
import { BolumAkordeon } from "../BolumAkordeon";
import { fetchVerses } from "../fetchVerses";
import type { VerseCardData } from "../../../components/VerseCard";
import {
  ismiAzamDualari,
  korunmaDualari,
  sekineDuasi,
  bakara250,
  type DuaKarti,
  type KorunmaDuasi,
} from "../../../data/ismi-azam-dualari";

export const metadata = { title: "İsmi Azam ve Korunma Duaları — KuranApp" };

// ── Ortak UI ──────────────────────────────────────────────────────────────────

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[11px] font-bold text-stone-600 dark:bg-stone-700 dark:text-stone-400">
            {i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400 dark:bg-stone-500" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Kutu({ baslik, children, renk = "stone" }: {
  baslik: string;
  children: React.ReactNode;
  renk?: "stone" | "amber" | "violet";
}) {
  const cls = {
    stone:  "border-stone-200 bg-stone-50/60 dark:border-stone-700/60 dark:bg-stone-800/40",
    amber:  "border-amber-200 bg-amber-50/60 dark:border-amber-800/50 dark:bg-amber-900/15",
    violet: "border-violet-200 bg-violet-50/60 dark:border-violet-800/50 dark:bg-violet-900/15",
  }[renk];
  const labelCls = {
    stone:  "text-stone-400 dark:text-stone-500",
    amber:  "text-amber-700 dark:text-amber-400",
    violet: "text-violet-700 dark:text-violet-400",
  }[renk];
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3.5 ${cls}`}>
      {baslik && (
        <p className={`mb-3 text-[11px] font-bold uppercase tracking-widest ${labelCls}`}>{baslik}</p>
      )}
      {children}
    </div>
  );
}

// ── Gelişmiş Dua Kartı (Arapça RTL + Meal + Transkripsiyon) ──────────────────

function DuaKartiFull({ dua }: { dua: DuaKarti }) {
  const scoreColor =
    dua.guvenilirlik === "10/10"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  const scoreEmoji = dua.guvenilirlik === "10/10" ? "🟢" : "🟡";

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800/50 dark:bg-amber-900/15">
      {/* Başlık */}
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-200/60 px-4 py-3 dark:border-amber-800/40">
        <span className="text-sm">{scoreEmoji}</span>
        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{dua.baslik}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${scoreColor}`}>
          {dua.guvenilirlik}
        </span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
          {dua.kaynak}
        </span>
      </div>

      {/* Arapça (RTL) */}
      <div className="px-4 py-3" dir="rtl">
        <p className="text-right font-scheherazade text-xl leading-[2.2] text-stone-800 dark:text-stone-100">
          {dua.arapca}
        </p>
      </div>

      {/* Okunuş — meal'den büyük */}
      <div className="border-t border-amber-200/60 px-4 py-2.5 dark:border-amber-800/40">
        <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          <span className="font-semibold">Okunuşu:</span> {dua.transkripsiyon}
        </p>
      </div>

      {/* Meal — en küçük */}
      <div className="border-t border-amber-200/60 px-4 py-2.5 dark:border-amber-800/40">
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <span className="font-semibold">Anlamı:</span> {dua.meal}
        </p>
      </div>

      {/* Uygulama */}
      <div className="border-t border-amber-200/60 px-4 py-2.5 dark:border-amber-800/40">
        <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Uygulama:</span> {dua.uygulama}
        </p>
      </div>
    </div>
  );
}

// ── Korunma Duası Kartı (Arapça RTL + Meal + Kategori etiketi) ───────────────

const korunmaKategoriLabel: Record<KorunmaDuasi["kategori"], string> = {
  "sabah-aksam": "☀️ Sabah-Akşam",
  "evden-cikarken": "🚪 Evden Çıkarken",
  "yatarken": "🌙 Yatarken",
  "genel-korunma": "🛡️ Genel Korunma",
};

function KorunmaKarti({ dua }: { dua: KorunmaDuasi }) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-900/15">
      {/* Başlık */}
      <div className="flex flex-wrap items-center gap-2 border-b border-emerald-200/60 px-4 py-3 dark:border-emerald-800/40">
        <span className="text-sm">🟢</span>
        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{dua.baslik}</p>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          {dua.guvenilirlik}
        </span>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {korunmaKategoriLabel[dua.kategori]}
        </span>
      </div>

      {/* Arapça (RTL) */}
      <div className="px-4 py-3" dir="rtl">
        <p className="text-right font-scheherazade text-xl leading-[2.2] text-stone-800 dark:text-stone-100">
          {dua.arapca}
        </p>
      </div>

      {/* Okunuş — meal'den büyük */}
      <div className="border-t border-emerald-200/60 px-4 py-2.5 dark:border-emerald-800/40">
        <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          <span className="font-semibold">Okunuşu:</span> {dua.transkripsiyon}
        </p>
      </div>

      {/* Meal — en küçük */}
      <div className="border-t border-emerald-200/60 px-4 py-2.5 dark:border-emerald-800/40">
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <span className="font-semibold">Anlamı:</span> {dua.meal}
        </p>
      </div>

      {/* Uygulama */}
      <div className="border-t border-emerald-200/60 px-4 py-2.5 dark:border-emerald-800/40">
        <p className="text-[12px] leading-relaxed text-emerald-800 dark:text-emerald-300">
          <span className="font-semibold">Uygulama:</span> {dua.uygulama}
        </p>
      </div>
    </div>
  );
}

function MetotKutusu({
  baslik, kaynak, aciklama, uygulama, puan = "10/10",
}: {
  baslik: string;
  kaynak: string;
  aciklama: string;
  uygulama: string;
  puan?: "10/10" | "8/10";
}) {
  const isSekiz = puan === "8/10";
  const border = isSekiz
    ? "border-violet-200 bg-violet-50/60 dark:border-violet-800/50 dark:bg-violet-900/15"
    : "border-amber-200 bg-amber-50/60 dark:border-amber-800/50 dark:bg-amber-900/15";
  const labelColor = isSekiz
    ? "text-violet-800 dark:text-violet-300"
    : "text-amber-800 dark:text-amber-300";
  const badgeColor = isSekiz
    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";

  return (
    <div className={`mb-4 rounded-xl border px-4 py-4 ${border}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm">{isSekiz ? "🟡" : "🟢"}</span>
        <p className={`text-xs font-bold ${labelColor}`}>{baslik}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>{kaynak}</span>
      </div>
      <p className={`mb-2 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400`}>{aciklama}</p>
      <p className={`text-[12px] leading-relaxed ${labelColor}`}>
        <span className="font-semibold">Uygulama:</span> {uygulama}
      </p>
    </div>
  );
}

function VerseSubHeader({ label }: { label: string }) {
  return (
    <p className="mb-3 mt-2 text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
      {label}
    </p>
  );
}

// ── Güvenilirlik Badgeleri ────────────────────────────────────────────────────

function GuvenilirlikBadgeleri() {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/60 dark:bg-emerald-900/20">
        <div className="mb-1 flex items-center gap-2">
          <span>🟢</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            10/10
          </span>
        </div>
        <p className="mb-0.5 text-xs font-semibold text-stone-700 dark:text-stone-200">Kesin Sünnet / Kur'an</p>
        <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          Hz. Peygamber'in bizzat "İsmi Azam" dediği, sahih hadislerle sabit ayet ve dualar.
        </p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-900/20">
        <div className="mb-1 flex items-center gap-2">
          <span>🟡</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            8/10
          </span>
        </div>
        <p className="mb-0.5 text-xs font-semibold text-stone-700 dark:text-stone-200">Meşru ve Makbul</p>
        <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          Sahabe ve ulema tertibi; sahih ayet ve esmalardan oluşan, alimlerce kabul görmüş uygulamalar.
        </p>
      </div>
    </div>
  );
}

// ── Bölüm 1: Sahih İsmi Azam ─────────────────────────────────────────────────

function Bolum1Icerik({ verses }: { verses: VerseCardData[] }) {
  return (
    <>
      <Kutu baslik="İrfani Şart — Nasıl Dua Edilir?">
        <StepList steps={[
          "Abdest al, 2 rekat hacet namazı kıl.",
          "Kalbini dünyalıklardan arındır. İsmi Azam, ağızdan çıkan kelime değil, kalbin ulaştığı bir «hal»dir.",
          "Allah'tan başka hiçbir şeyi düşünme. O'nu görüyormuş gibi bir ihlas haline gir.",
          "Niyet et: «Allah'ım, senin yüce isimlerine sığındım. Acziyetimi itiraf ediyor, yalnız senden istiyorum.»",
        ]} />
      </Kutu>

      {ismiAzamDualari.map((dua) => (
        <DuaKartiFull key={dua.id} dua={dua} />
      ))}

      <MetotKutusu
        baslik="el-Hayyü'l-Kayyûm Sırrı — Übey b. Kâ'b Rivayeti"
        kaynak="Tirmizî · Sahih"
        aciklama="Hz. Peygamber, İsmi Azam'ın Bakara, Âl-i İmrân ve Tâhâ surelerinde olduğunu bildirmiştir. Bu üç surede ortak olan vasıf: «el-Hayyü'l-Kayyûm» — Ebedî diri, her şeyi ayakta tutan."
        uygulama="«Yâ Hayyü, Yâ Kayyûm» diyerek Allah'a yönel; Bakara 255, Âl-i İmrân 2 ve Tâhâ 111'i oku."
      />

      <MetotKutusu
        baslik="Esma binti Yezid (r.anha) Rivayeti"
        kaynak="İbn Mâce · Sahih"
        aciklama="Hz. Peygamber şöyle buyurdu: «Allah'ın İsmi Azam'ı şu iki ayettedir: Bakara 163 ve Âl-i İmrân 2.»"
        uygulama="Bu iki ayeti 3'er defa oku; «Yâ Rahmân, Yâ Rahîm, Yâ Hayy, Yâ Kayyûm» diyerek dua et."
      />

      <MetotKutusu
        baslik="Hz. Ali (r.a.) Tavsiyesi"
        kaynak="Sahih Sahabi Uygulaması"
        aciklama="Hz. Ali şöyle buyurdu: «Allah'a İsmi Azam'ı ile dua etmek istediğinde, Hadid Suresi'nin ilk on ayetini ve Haşr Suresi'nin son üç ayetini oku.»"
        uygulama="Önce Hadid 1–10, sonra Haşr 22–24 oku; secdede isteklerini dile getir."
        puan="8/10"
      />

      <VerseSubHeader label="İsmi Azam Ayetleri" />
      <ManeviVerseList verses={verses} />
    </>
  );
}

// ── Bölüm 2: Sekine Duası ─────────────────────────────────────────────────────

function Bolum2Icerik({ verses }: { verses: VerseCardData[] }) {
  return (
    <>
      {/* Tabut-u Sekine Açıklama */}
      <div className="mb-4 overflow-hidden rounded-xl border border-violet-200 bg-violet-50/60 dark:border-violet-800/50 dark:bg-violet-900/15">
        <div className="border-b border-violet-200/60 px-4 py-3 dark:border-violet-800/40">
          <p className="text-xs font-bold text-violet-800 dark:text-violet-300">
            📦 Tabut-u Sekine Nedir?
          </p>
        </div>
        {/* Arapça Ayet */}
        <div className="px-4 py-3" dir="rtl">
          <p className="text-right font-scheherazade text-xl leading-[2.2] text-stone-800 dark:text-stone-100">
            {sekineDuasi.arapca}
          </p>
        </div>
        {/* Meal */}
        <div className="border-t border-violet-200/60 px-4 py-2.5 dark:border-violet-800/40">
          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            <span className="font-semibold">Bakara 248 — Anlamı:</span> {sekineDuasi.meal}
          </p>
        </div>
        {/* Açıklama */}
        <div className="border-t border-violet-200/60 px-4 py-2.5 dark:border-violet-800/40">
          <p className="text-[12px] leading-relaxed text-violet-700 dark:text-violet-300">
            {sekineDuasi.aciklama}
          </p>
        </div>
      </div>

      {/* Bakara 250 - Talut Duası */}
      <DuaKartiFull dua={bakara250} />

      <Kutu baslik="Hazırlık" renk="violet">
        <StepList steps={[
          "Zihnini dünya gailelerinden arındır, kalbini Allah'ın rızasına odakla.",
          "7 kez «Estağfirullah el-Azîm» oku.",
          "7 kez salavat getir.",
          "10 kez «Allahu Ekber» de.",
        ]} />
      </Kutu>

      <Kutu baslik="Dairesel Zikir Protokolü" renk="violet">
        <StepList steps={[
          "Besmele çek.",
          "Şu 6 esmayı oku: «Ferdün, Hayyün, Kayyûmün, Hakemün, Adlün, Kuddûsün».",
          "Hemen ardından listedeki ilk Sekine ayetini oku.",
          "Bu üçlüyü (Besmele + 6 Esma + Ayet) 19 defa tekrarla.",
          "Her ayet için aynı döngüyü uygula — toplam 19 ayet.",
          "İster 19 güne böl, ister tek oturuşta tamamla.",
        ]} />
      </Kutu>

      <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 dark:border-violet-800/50 dark:bg-violet-900/15">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">
          Tevafuk Notu
        </p>
        <BulletList items={[
          "Besmele 19 harftir.",
          "6 esma (Ferdün, Hayyün, Kayyûmün, Hakemün, Adlün, Kuddûsün) toplam 19 harftir.",
          "Sekine listesindeki ayet sayısı 19'dur.",
          "Bu tevafuk, manevi bir tamamlanmayı ve koruma halkasını simgeler.",
        ]} />
      </div>

      <VerseSubHeader label="Sekine Duası Ayetleri (Sırasıyla)" />
      <ManeviVerseList verses={verses} />
    </>
  );
}

// ── Bölüm 3: Korunma Duaları ─────────────────────────────────────────────────

function Bolum3Icerik() {
  return (
    <>
      <Kutu baslik="Korunma Duaları Hakkında" renk="stone">
        <p className="text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
          Aşağıdaki dualar, Peygamber Efendimiz'in (s.a.v.) bizzat okuduğu ve ümmetine tavsiye ettiği,
          sahih hadislerle sabit günlük korunma dualarıdır. Her biri 10/10 güvenilirlik puanına sahiptir.
        </p>
      </Kutu>

      {korunmaDualari.map((dua) => (
        <KorunmaKarti key={dua.id} dua={dua} />
      ))}

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3.5 dark:border-amber-800/50 dark:bg-amber-900/15">
        <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">
          <span className="font-bold">📿 Tavsiye:</span> Bu duaları günlük rutininize ekleyin.
          Sabah-akşam korunma duası, evden çıkarken ve yatarken okunan dualar, sizi Allah'ın
          izniyle görünmez kazalardan ve şerlerden muhafaza eder.
        </p>
      </div>
    </>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────────────────────

export default async function IsmiAzamPage() {
  const ayetVerses   = await fetchVerses("ismiazam-ayet");
  const sekineVerses = await fetchVerses("ismiazam-sekine");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Hero */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="text-2xl leading-none">✨</span>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            İsmi Azam ve Korunma Duaları
          </h1>
        </div>
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Allah'ın en büyük ismi, Sekine (huzur) duası ve sahih hadislerle sabit günlük korunma duaları.
        </p>
      </div>

      {/* Kişisel not */}
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5 dark:border-amber-700/60 dark:bg-amber-900/20">
        <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
          <span className="font-bold">Not:</span>{" "}
          İsmi Azam, harflerin sihirli kombinasyonu değil; kulun tam teslimiyetle Rabbine yöneldiği an'ın adıdır.
          Kelimeler değil, o kelimeleri taşıyan kalp hal'i konuşur.
        </p>
      </div>

      {/* Ulema açıklaması */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-4 dark:border-amber-700/50 dark:bg-amber-900/15">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
          Alimlerin Ortak Kanaati
        </p>
        <p className="text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
          İslam alimlerinin ortak kanaatine göre İsmi Azam, belirli bir dua metni değil; kulun kalbini tamamen
          Allah'a teslim ettiği, O'ndan başka her şeyi zihninden sildiği bir teslimiyet ve odaklanma halidir.
          İbn Arabi, İmam Gazali ve Diyanet İşleri Başkanlığı dahil pek çok otorite, asıl olanın dudaktan dökülen
          kelimeler değil, kalbin ulaştığı o derin &ldquo;an&rdquo; olduğunu vurgular. Mesele, hangi ismi söylediğin
          değil; o ismi <span className="font-semibold">hangi kalple söylediğin</span>dir.
        </p>
      </div>

      <GuvenilirlikBadgeleri />

      <div className="space-y-2.5">
        <BolumAkordeon
          ikon="🟢"
          baslik="Sahih İsmi Azam — Rivayetler ve Metodlar"
          score="10/10"
          scoreLabel="Kesin Sünnet"
          borderCls="border-l-amber-400"
          headerCls="from-amber-50/70 dark:from-amber-900/20"
          iconBgCls="bg-amber-100 dark:bg-amber-900/40"
        >
          <Bolum1Icerik verses={ayetVerses} />
        </BolumAkordeon>

        <BolumAkordeon
          ikon="🌀"
          baslik="Sekine Duası — 19 Ayet Protokolü"
          score="8/10"
          scoreLabel="Ulema Tertibi"
          borderCls="border-l-violet-400"
          headerCls="from-violet-50/70 dark:from-violet-900/20"
          iconBgCls="bg-violet-100 dark:bg-violet-900/40"
        >
          <Bolum2Icerik verses={sekineVerses} />
        </BolumAkordeon>

        <BolumAkordeon
          ikon="🛡️"
          baslik="Günlük Korunma Duaları"
          score="10/10"
          scoreLabel="Kesin Sünnet"
          borderCls="border-l-emerald-400"
          headerCls="from-emerald-50/70 dark:from-emerald-900/20"
          iconBgCls="bg-emerald-100 dark:bg-emerald-900/40"
        >
          <Bolum3Icerik />
        </BolumAkordeon>
      </div>
    </main>
  );
}