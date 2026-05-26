import { getApiDb, dbAll } from "../../lib/dbUtils";
import { ManeviVerseList } from "./ManeviVerseList";
import { BolumAkordeon } from "./BolumAkordeon";
import type { VerseCardData } from "../../components/VerseCard";

export const metadata = { title: "Manevi Sığınak — KuranApp" };

// ── DB ────────────────────────────────────────────────────────────────────────

interface DbRow {
  verse_key: string;
  surah_id:  number;
  ayah_number: number;
  meal:      string | null;
  ana_tema:  string | null;
  alt_taglar: string | null;
  tag:       string;
}

function fetchVerses(tag: string): VerseCardData[] {
  const db = getApiDb();
  const rows = dbAll<DbRow>(
    db.prepare(`
      SELECT
        vti.verse_key, v.surah_id, v.ayah_number,
        v.primary_translation AS meal,
        vt.ana_tema, vt.alt_taglar,
        vti.tag
      FROM verse_tag_items vti
      JOIN verses v ON v.verse_key = vti.verse_key
      LEFT JOIN verse_tags vt ON vt.verse_key = vti.verse_key
      WHERE vti.tag = ?
      ORDER BY v.surah_id, v.ayah_number
    `)
  , tag);
  return rows.map((r) => ({
    verse_key:   r.verse_key,
    surah_id:    r.surah_id,
    ayah_number: r.ayah_number,
    meal:        r.meal,
    ana_tema:    r.ana_tema,
    alt_taglar:  r.alt_taglar ? (() => { try { return JSON.parse(r.alt_taglar as string); } catch { return []; } })() : [],
  }));
}

// ── Ortak bileşenler ──────────────────────────────────────────────────────────

function ScoreBadge({ score, label }: { score: "10/10" | "8/10" | "0/10"; label?: string }) {
  const cfg = {
    "10/10": { emoji: "🟢", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    "8/10":  { emoji: "🟡", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
    "0/10":  { emoji: "🔴", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  }[score];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.cls}`}>
      {cfg.emoji} {score}{label ? ` — ${label}` : ""}
    </span>
  );
}


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

function UygulamaKutusu({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3.5 dark:border-stone-700/60 dark:bg-stone-800/40">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">{baslik}</p>
      {children}
    </div>
  );
}

function HadisKutusu({ baslik, arapca, anlam, uygulama }: { baslik: string; arapca: string; anlam: string; uygulama: string }) {
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3.5 dark:border-amber-800/50 dark:bg-amber-900/15">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm leading-none">🟢</span>
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">{baslik}</p>
      </div>
      <p className="mb-1.5 font-mono text-[13px] leading-relaxed text-stone-700 dark:text-stone-300 italic">{arapca}</p>
      <p className="mb-2 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
        <span className="font-semibold">Anlamı:</span> {anlam}
      </p>
      <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">
        <span className="font-semibold">Uygulama:</span> {uygulama}
      </p>
    </div>
  );
}

function UyariKutusu({ mesaj, renk = "red" }: { mesaj: string; renk?: "red" | "amber" }) {
  const cls = renk === "red"
    ? "border-red-200 bg-red-50/60 text-red-800 dark:border-red-800/50 dark:bg-red-900/15 dark:text-red-300"
    : "border-amber-200 bg-amber-50/60 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/15 dark:text-amber-300";
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 ${cls}`}>
      <p className="text-[12px] leading-relaxed">{mesaj}</p>
    </div>
  );
}

function VerseSubHeader({ tag }: { tag: string }) {
  const labels: Record<string, string> = {
    "korunma-genel":   "Genel Korunma Ayetleri",
    "korunma-sihir":   "Sihir Bozma Ayetleri",
    "korunma-nazar":   "Nazar Korunma Ayetleri",
    "korunma-hased":   "Hased Korunma Ayetleri",
    "korunma-siginma": "Sığınma Ayetleri",
    "korunma-sifa":    "Şifa Ayetleri",
  };
  return (
    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
      {labels[tag] ?? "İlgili Ayetler"}
    </p>
  );
}


// ── Güvenilirlik Puanı ────────────────────────────────────────────────────────

function GuvenilirlikPuani() {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base leading-none">📊</span>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Güvenilirlik Puanı Sistemi
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/60 dark:bg-emerald-900/20">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-lg">🟢</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">10/10</span>
          </div>
          <p className="mb-1 text-xs font-semibold text-stone-700 dark:text-stone-200">Kesin Sünnet / Kur&apos;an</p>
          <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">Peygamberimizin bizzat yaptığı, sahih hadislerle sabit uygulamalar. Mutlak korunma.</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-900/20">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-lg">🟡</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">8/10</span>
          </div>
          <p className="mb-1 text-xs font-semibold text-stone-700 dark:text-stone-200">Ulema İctihadı / Meşru Rukye</p>
          <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">Alimlerin Kur&apos;an&apos;ın şifa özelliğine dayanarak caiz gördüğü yöntemler. Şirk unsuru yoktur.</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/60 dark:bg-red-900/20">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-lg">🔴</span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">0/10</span>
          </div>
          <p className="mb-1 text-xs font-semibold text-stone-700 dark:text-stone-200">Hurafe ve Şirk Riski</p>
          <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">Şifayı nesnelerden bekleyerek tevhide zarar veren uydurmalar. Uzak dur.</p>
        </div>
      </div>
    </div>
  );
}

// ── BÖLÜM 1: Genel Korunma ────────────────────────────────────────────────────

function Bolum1({ verses }: { verses: VerseCardData[] }) {
  return (
    <>
      <UygulamaKutusu baslik="Uygulama Rehberi">
        <StepList steps={[
          "Sabah namazından sonra: 1 Fatiha + Ayetel Kürsi + 3 İhlas + 1 Felak + 1 Nas oku.",
          "Akşam namazından sonra: Aynı seti tekrarla. Avuçlarına okuyup tüm vücuduna sür (sünnet).",
          "Yatmadan önce: Ayetel Kürsi + Amenerresulü (Bakara 285-286) oku. Bunlar gece boyu koruma sağlar.",
          "Evden çıkarken: Ayetel Kürsi oku, koruma kalkanı niyetiyle.",
          "Abdestsiz okunabilir ama abdestli olmak faziletlidir. Niyet: «Allah'ım, senin kelamınla korunmayı diliyorum.»",
        ]} />
      </UygulamaKutusu>

      <HadisKutusu
        baslik="Sahih Hadis Duası — Sabah-Akşam Kalkanı (İbn Mâce, Sahih)"
        arapca="Bismillâhillezî lâ yedurru me'asmihi şey'ün fil erdı ve lâ fissemâi ve hüves-semî'ul alîm."
        anlam="Yerde ve gökte hiçbir şeyin O'nun adıyla zarar veremeyeceği Allah'ın adıyla."
        uygulama="Sabah ve akşam 3'er defa oku. Koruma kalkanı niyetine."
      />

      <VerseSubHeader tag="korunma-genel" />
      <ManeviVerseList verses={verses} />
    </>
  );
}

// ── BÖLÜM 2: Büyü ve Sihir ────────────────────────────────────────────────────

function Bolum2({ verses }: { verses: VerseCardData[] }) {
  return (
    <>
      <UygulamaKutusu baslik="Hazırlık">
        <StepList steps={[
          "Abdest al, 2 rekat tövbe namazı kıl.",
          "Kalpten tövbe et. «Allah'ım, sana yöneldim, senden başka sığınacak yok» de.",
        ]} />
      </UygulamaKutusu>

      <UygulamaKutusu baslik="7 Günlük Program (Suya Okuyarak)">
        <StepList steps={[
          "Bir şişe temiz su al. Başında Fatiha + Ayetel Kürsi + Bakara 102 + A'raf 117-119 + Yunus 81-82 + Taha 69 + 3 İhlas + 1 Felak + 1 Nas oku.",
          "Her ayeti 3 veya 7 defa okuyup suya üfle.",
          "Bu sudan sabah aç karnına, öğle arası ve yatmadan önce birer bardak iç. 7 gün devam et.",
          "Kalan suyla banyo yap (her gün veya gün aşırı).",
        ]} />
      </UygulamaKutusu>

      <UygulamaKutusu baslik="Ek Uygulama">
        <BulletList items={[
          "Bakara Suresi'ni evde dinlet. Şeytan Bakara okunan eve girmez (hadis).",
          "Her namaz sonrası Ayetel Kürsi'yi 1 defa mutlaka oku.",
          "Yatmadan önce 3 İhlas + 1 Felak + 1 Nas okuyup avuçlarına üfle, tüm vücuduna sür.",
        ]} />
      </UygulamaKutusu>

      <UyariKutusu
        renk="red"
        mesaj="🔴 Uyarı: Cinci, medyum ve «büyü bozuyorum» diyen şarlatanlara gitmek şirke götürebilir. Şifayı yalnız Allah'tan iste!"
      />

      <VerseSubHeader tag="korunma-sihir" />
      <ManeviVerseList verses={verses} />
    </>
  );
}

// ── BÖLÜM 3: Nazar ────────────────────────────────────────────────────────────

function Bolum3({ verses }: { verses: VerseCardData[] }) {
  return (
    <>
      <UygulamaKutusu baslik="Nazar Değen Kişi İçin (Kendine veya Başkasına)">
        <StepList steps={[
          "Abdest al.",
          "Sağ elini nazar değdiğini düşündüğün bölgeye koy.",
          "3 defa «Bismillah» de.",
          "7 defa Fatiha + 7 defa Felak + 7 defa Nas + 3 defa Kalem 51-52 oku.",
          "Her okuyuşta bölgeye üfle veya hafifçe tükürük sür (sünnet).",
          "«Allah'ım, şifa ver, şifa veren Sensin» de.",
        ]} />
      </UygulamaKutusu>

      <HadisKutusu
        baslik="Cebrail'in (a.s.) Nazar Rukyesi — Müslim, İbn Mâce (Sahih)"
        arapca="Bismillâhi erkîke, min kulli şey'in yu'zîke, min şerri kulli nefsin ev ayni hâsidin, Allâhu yeşfîke, bismillâhi erkîke."
        anlam="Allah'ın adıyla seni rahatsız eden her şeyden; her canlının ve hasetçi gözün şerrinden sana rukye ederim. Allah şifa versin."
        uygulama="Nazar değdiğini düşündüğün kişiye 7 defa oku."
      />

      <UygulamaKutusu baslik="Korunma İçin Günlük">
        <BulletList items={[
          "Beğendiğin her şey için «Maşallah, Allah nazardan korusun» de.",
          "Çocuklara her gün 3 İhlas + 1 Felak + 1 Nas okuyup üfle.",
          "Sabah akşam «Bismillâhillezî lâ yedurru…» duasını 3'er defa oku.",
        ]} />
      </UygulamaKutusu>

      <UyariKutusu
        renk="red"
        mesaj="🔴 Not: Nazar boncuğu takmak, kurşun döktürmek yok. Koruma yalnız Allah'tandır."
      />

      <VerseSubHeader tag="korunma-nazar" />
      <ManeviVerseList verses={verses} />
    </>
  );
}

// ── BÖLÜM 4: Hased ────────────────────────────────────────────────────────────

function Bolum4({ verses }: { verses: VerseCardData[] }) {
  return (
    <>
      <UygulamaKutusu baslik="Hasede Uğradığını Düşünen Kişi">
        <StepList steps={[
          "Abdest al, 2 rekat namaz kıl.",
          "7 defa Fatiha + 7 defa Felak + 7 defa Nas oku.",
          "Avuçlarına okuyup tüm vücuduna sür.",
          "«Allah'ım, haset edenlerin şerrinden sana sığınıyorum» diye dua et.",
          "7 gün boyunca sabah akşam tekrarla.",
        ]} />
      </UygulamaKutusu>

      <UygulamaKutusu baslik="Kendini Hasetten Korumak İçin">
        <BulletList items={[
          "Başkasının sahip olduğu nimeti görünce «Maşallah, Allah onu hayırlı etsin» de.",
          "Haset hissi gelince hemen istiğfar et.",
          "Haset ettiğin kişi için dua et. Bu haset duygusunu söndürür.",
          "Sabah akşam Felak ve Nas surelerini oku.",
        ]} />
      </UygulamaKutusu>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/15">
        <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">
          <span className="font-semibold">🟢 Sahih Hadis Notu (Müslim, İbn Mâce):</span> Cebrail&apos;in (a.s.) Nazar Rukyesi duası hasede karşı da okunur.
          Bölüm 3&apos;teki aynı duayı 7 defa oku.
        </p>
      </div>

      <VerseSubHeader tag="korunma-hased" />
      <ManeviVerseList verses={verses} />
    </>
  );
}

// ── BÖLÜM 5: Sığınma ─────────────────────────────────────────────────────────

function Bolum5({ verses }: { verses: VerseCardData[] }) {
  return (
    <>
      <UygulamaKutusu baslik="Şeytan Vesvesesi Geldiğinde">
        <StepList steps={[
          "Hemen «Eûzü billâhi mineş-şeytânir-racîm» de.",
          "Sol tarafına 3 defa hafifçe tükür (sünnet).",
          "Mü'minun 97-98 ayetlerini 3 defa oku.",
          "«La ilahe illallah» zikrine sarıl.",
        ]} />
      </UygulamaKutusu>

      <UygulamaKutusu baslik="Gece Korkusu ve Karabasan İçin">
        <StepList steps={[
          "Yatmadan önce Ayetel Kürsi oku.",
          "Sağ tarafına yat, sağ elini yanağının altına koy.",
          "3 İhlas + 1 Felak + 1 Nas oku, avuçlarına üfle, vücuduna sür.",
          "«Allah'ım, nefsimin şerrinden ve şeytanın şerrinden sana sığınıyorum» de.",
        ]} />
      </UygulamaKutusu>

      <UyariKutusu
        renk="amber"
        mesaj="⚠️ Not: Vesvese, imanın varlığına işarettir. Vesveseyi büyütme, üzerinde durma. Allah'a sığınıp geç."
      />

      <VerseSubHeader tag="korunma-siginma" />
      <ManeviVerseList verses={verses} />
    </>
  );
}

// ── BÖLÜM 6: Şifa ────────────────────────────────────────────────────────────

function Bolum6({ verses }: { verses: VerseCardData[] }) {
  return (
    <>
      <UygulamaKutusu baslik="Hastalıkta Şifa İçin">
        <StepList steps={[
          "Abdest al, 2 rekat namaz kıl.",
          "Sağ elini ağrıyan bölgeye koy, 3 defa «Bismillah» de.",
          "7 defa Fatiha + 7 defa İsra 82 + 7 defa Yunus 107 oku.",
          "«Allâhumme Rabben-nâsi muzhibel-bâsi işfi enteş-Şâfî» duasını 3 defa oku.",
          "Her okuyuşta ağrıyan bölgeye üfle.",
          "Günde 3 defa tekrarla (sabah, öğle, akşam).",
        ]} />
      </UygulamaKutusu>

      <HadisKutusu
        baslik="Bölgesel Ağrı Duası — Müslim, Ebû Dâvûd, İbn Mâce (Sahih)"
        arapca="Eûzu billâhi ve kudretihî min şerri mâ ecidu ve uhâziru."
        anlam="Hissedip çekindiğim ağrının şerrinden Allah'a ve O'nun kudretine sığınırım."
        uygulama="Sağ el ağrıyan yere konur, 3 defa «Bismillah» dendikten sonra bu dua 7 defa okunur."
      />

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <ScoreBadge score="8/10" label="Ulema İctihadı" />
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Manevi Sıkıntı ve Depresyon İçin</span>
        </div>
        <UygulamaKutusu baslik="">
          <BulletList items={[
            "Her namazda Fatiha'yı anlamını düşünerek oku.",
            "Günde 100 defa «La ilahe illa ente sübhaneke inni küntü minez-zalimin» (Yunus peygamberin duası) oku.",
            "İsra 82'yi suya 7 defa okuyup iç. 7 gün devam et.",
            "Bolca istiğfar et.",
          ]} />
        </UygulamaKutusu>
      </div>

      <UyariKutusu
        renk="amber"
        mesaj="⚠️ Not: Kur'an şifadır ama doktora gitmeyi ihmal etme. Manevi ve maddi tedaviyi birlikte yürüt."
      />

      <VerseSubHeader tag="korunma-sifa" />
      <ManeviVerseList verses={verses} />
    </>
  );
}

// ── Mit Avcısı ────────────────────────────────────────────────────────────────

function MitAvcisi() {
  const yapilacaklar = [
    "Kur'an ve sahih sünnetten öğrenilen duaları bizzat kendin oku",
    "Şifayı yalnız Allah'tan iste; vesilelere değil, Vesileler Sahibi'ne güven",
    "Sabah-akşam Ayetel Kürsi + 3 İhlas + Felak + Nas oku",
    "Nazar için Kalem 51-52 ve Felak-Nas'ı oku",
    "Vesvese gelince «Eûzü billâhi mineş-şeytânir-racîm» de ve geç",
  ];

  const hurafeler = [
    { baslik: "Nazar Boncuğu", hukum: "🔴 Şirk Riski", aciklama: "Peygamberimiz: «Kim nazarlık takarsa Allah onu korumasın.» Boncuğun kendisinin koruduğuna inanmak şirktir." },
    { baslik: "Kurşun Döktürmek", hukum: "🔴 Batıl", aciklama: "Eski Türk geleneğinden İslam'a karışmıştır. Dinde hiçbir dayanağı yoktur." },
    { baslik: "Sirke-Tuz-Su Karışımı", hukum: "🔴 Hurafe", aciklama: "Maddi sıvıya manevi enerji emme gücü atfetmek şirke kapı aralar. Koruma sadece Allah'tandır." },
    { baslik: "Defne Yaprağı / Tütsü", hukum: "🔴 Hurafe", aciklama: "Dumanın cinleri kovduğuna inanmak batıldır. Evi Kur'an okuyarak temizle." },
    { baslik: "Cinci / Medyum / Falcı", hukum: "🔴 Büyük Günah", aciklama: "«Kim kâhine gidip söylediklerini tasdik ederse Muhammed'e indirileni inkâr etmiş olur.»" },
    { baslik: "Yıldızname / Astroloji", hukum: "🔴 Küfür Riski", aciklama: "Gaybı Allah'tan başka kimse bilemez. Yıldızname ile gelecek söylemek büyük günahtır." },
    { baslik: "Muska / Temîme (Semboller)", hukum: "🔴 Şirk", aciklama: "Peygamberimiz temîmeyi yasaklamıştır. En güvenlisi: muskasız, doğrudan ayetleri okuyarak sığınmak." },
    { baslik: "Sihirli Su Satanlar", hukum: "🔴 Haram", aciklama: "Rukye için suya ayet okumak caizdir — ama bunu kendin yapmalısın. Başkasının hazırladığı asla içilmez." },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl leading-none">⚖️</span>
        <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">Mit Avcısı — Yap / Yapma</h2>
      </div>

      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3.5 dark:border-emerald-800/50 dark:bg-emerald-900/15">
        <p className="mb-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">🟢 YAP</p>
        <ul className="space-y-1.5">
          {yapilacaklar.map((m) => (
            <li key={m} className="flex items-start gap-2 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />{m}
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-hidden rounded-xl border border-red-200 dark:border-red-800/40">
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 dark:border-red-900/40 dark:bg-red-900/20">
          <p className="text-xs font-bold text-red-700 dark:text-red-400">🔴 YAPMA — Hurafeler ve Fıkhî Hükümleri</p>
        </div>
        <div className="divide-y divide-red-50 bg-white dark:divide-stone-800 dark:bg-stone-900">
          {hurafeler.map((h) => (
            <div key={h.baslik} className="px-4 py-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{h.baslik}</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">{h.hukum}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{h.aciklama}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Uzak Durulması Gerekenler ─────────────────────────────────────────────────

function UzakDurulmasi() {
  const maddeler = [
    {
      harf: "A", baslik: "Sirke-Tuz-Su Karışımı",
      hukum: "🔴 0/10 — HURAFE",
      neden: "Kur'an ve sünnette asla yeri yoktur. Sirke ve tuzun gıda olarak bereketi vardır ancak metafizik koruma gücü yoktur.",
      sakinca: "Maddi bir sıvıya manevi enerji emme gücü atfetmek şirke kapı aralar. Koruma sadece Allah'tandır.",
    },
    {
      harf: "B", baslik: "Nazar Boncuğu / Mavi Boncuk",
      hukum: "🔴 0/10 — ŞİRK RİSKİ",
      neden: "Peygamberimiz (s.a.s.): «Kim nazarlık takarsa Allah onu korumasın» buyurmuştur.",
      sakinca: "Boncuğun kendisinin koruduğuna inanmak şirktir. Alternatif: Ayetel Kürsi'yi ezberle ve oku.",
    },
    {
      harf: "C", baslik: "Kurşun Döktürmek",
      hukum: "🔴 0/10 — BATIL",
      neden: "Eski Türk geleneklerinden İslam'a karışmıştır. Dinde hiçbir dayanağı yoktur.",
      sakinca: "Nazar için meşru yöntem Felak-Nas okumaktır. Kurşun döktürme ritüeli buna hiçbir şey katmaz.",
    },
    {
      harf: "D", baslik: "Defne Yaprağı / Tütsü Yakmak",
      hukum: "🔴 0/10 — HURAFE",
      neden: "Defne yaprağının veya dumanın cinleri kovduğuna inanmak batıldır.",
      sakinca: "Evi Kur'an okuyarak temizle. Bakara Suresi okunan eve şeytan giremez (sahih hadis).",
    },
    {
      harf: "E", baslik: "Cinci / Medyum / Falcıya Gitmek",
      hukum: "🔴 0/10 — BÜYÜK GÜNAH",
      neden: "Peygamberimiz: «Kim kâhine gidip söylediklerini tasdik ederse Muhammed'e indirileni inkâr etmiş olur.»",
      sakinca: "Bu kişilerin hiçbiri gaybı bilemez. Amaçları maddi sömürüdür. Ebedî kurtuluşu tehlikeye atar.",
    },
    {
      harf: "F", baslik: "Yıldızname / Astroloji ile Teşhis",
      hukum: "🔴 0/10 — KÜFÜR RİSKİ",
      neden: "Gaybı Allah'tan başka kimse bilemez. Yıldızname ile gelecek söylemek büyük günahtır.",
      sakinca: "Burç yorumuna güvenmek Allah'a olan tevekkülü zedeler ve şirke açılan kapıdır.",
    },
    {
      harf: "G", baslik: "Muska / Temîme (Anlaşılmaz Semboller)",
      hukum: "🔴 0/10 — ŞİRK",
      neden: "Peygamberimiz temîmeyi yasaklamıştır. İçinde anlaşılmaz harfler, şekiller veya melek isimleri olan muskalar haramdır.",
      sakinca: "En güvenlisi: muskasız, doğrudan ayetleri okuyarak Allah'a sığınmak. Sadece Kur'an ayetli muskalar bazı alimlerce tartışmalıdır.",
    },
    {
      harf: "H", baslik: "Sihirli / Büyülü Su Satanlar",
      hukum: "🔴 0/10 — DOLANDIRICILIK + HARAM",
      neden: "Cinlerle işbirliği yapılarak «enerji yüklendiği» iddia edilen sular dolandırıcılık ve haramdır.",
      sakinca: "Rukye için suya ayet okumak caizdir ama bunu kendin yapmalısın. Başkasının cinlerle hazırladığı su asla içilmez.",
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl leading-none">⚠️</span>
        <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
          Uzak Durulması Gerekenler
        </h2>
      </div>
      <div className="overflow-hidden rounded-2xl border border-red-200/60 bg-white dark:border-red-800/30 dark:bg-stone-900">
        <div className="border-b border-red-100 bg-red-50/80 px-4 py-2.5 dark:border-red-900/40 dark:bg-red-900/15">
          <p className="text-[11px] font-medium text-red-700 dark:text-red-400">
            🔴 0/10 — Hurafe ve Şirk Riski: Koruma yalnız Allah&apos;tandır
          </p>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {maddeler.map((m) => (
            <div key={m.harf} className="px-4 py-3.5">
              <div className="mb-1.5 flex flex-wrap items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {m.harf}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{m.baslik}</span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">{m.hukum}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    <span className="font-semibold text-stone-600 dark:text-stone-300">Neden sakıncalı: </span>{m.neden}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    <span className="font-semibold text-stone-600 dark:text-stone-300">Teolojik hata: </span>{m.sakinca}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Genel İlkeler ─────────────────────────────────────────────────────────────

function GenelIlkeler() {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 dark:border-stone-700/60 dark:bg-stone-800/40">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
        Genel İlkeler ve Özet Tavsiyeler
      </p>
      <ul className="space-y-2">
        {[
          { ikon: "🟢", metin: "YAP: Kur'an ve sahih sünnetten öğrenilen duaları bizzat kendin oku." },
          { ikon: "🟢", metin: "YAP: Şifayı yalnız Allah'tan iste, vesilelere değil Vesileler Sahibi'ne güven." },
          { ikon: "🔴", metin: "YAPMA: Hiçbir nesneye (tuz, sirke, boncuk, ip, muska) koruyucu güç atfetme." },
          { ikon: "🔴", metin: "YAPMA: Cinci, medyum, falcı, yıldıznameci, büyü bozuculara asla gitme." },
          { ikon: "🟢", metin: "UNUTMA: Korunmanın en büyük kalkanı takvadır. Haramlardan sakın, farzları yerine getir." },
        ].map((il) => (
          <li key={il.metin} className="flex items-start gap-2 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
            <span className="shrink-0">{il.ikon}</span>
            {il.metin}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────────────────────

export default function ManeviSiginakPage() {
  const genel   = fetchVerses("korunma-genel");
  const sihir   = fetchVerses("korunma-sihir");
  const nazar   = fetchVerses("korunma-nazar");
  const hased   = fetchVerses("korunma-hased");
  const siginma = fetchVerses("korunma-siginma");
  const sifa    = fetchVerses("korunma-sifa");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="text-2xl leading-none">🛡️</span>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            Manevi Sığınak
          </h1>
        </div>
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Kur&apos;an ve sahih sünnetle korunma rehberi — büyü, nazar, hased ve vesveseden Allah&apos;a sığınma.
        </p>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/20">
          <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">
            <span className="font-bold">Tevhit Bilinci:</span> Şifayı ve korumayı yalnız Allah&apos;tan iste.
            Vesilelere değil, Vesileler Sahibi&apos;ne güven. Hiçbir nesne, kişi veya ritüel kendi başına koruma sağlayamaz.
          </p>
        </div>
      </div>

      <GuvenilirlikPuani />

      <div className="mb-3 mt-8">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base leading-none">📖</span>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            Uygulama Rehberleri
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Her bölümü açarak uygulama adımlarını ve ilgili ayetleri görebilirsin.
        </p>
      </div>

      <div className="mb-8 space-y-2.5">
        <BolumAkordeon
          ikon="🛡️" baslik="Genel Korunma Kalkanı — Günlük Rutin"
          score="10/10" scoreLabel="Kesin Sünnet"
          borderCls="border-l-emerald-400"
          headerCls="from-emerald-50/70 dark:from-emerald-900/20"
          iconBgCls="bg-emerald-100 dark:bg-emerald-900/40"
        >
          <Bolum1 verses={genel} />
        </BolumAkordeon>

        <BolumAkordeon
          ikon="✨" baslik="Büyü ve Sihir — Sihrin Bozulması"
          score="8/10" scoreLabel="Ulema İctihadı"
          borderCls="border-l-violet-400"
          headerCls="from-violet-50/70 dark:from-violet-900/20"
          iconBgCls="bg-violet-100 dark:bg-violet-900/40"
        >
          <Bolum2 verses={sihir} />
        </BolumAkordeon>

        <BolumAkordeon
          ikon="👁️" baslik="Nazar — Göz Değmesi"
          score="10/10" scoreLabel="Kesin Sünnet"
          borderCls="border-l-sky-400"
          headerCls="from-sky-50/70 dark:from-sky-900/20"
          iconBgCls="bg-sky-100 dark:bg-sky-900/40"
        >
          <Bolum3 verses={nazar} />
        </BolumAkordeon>

        <BolumAkordeon
          ikon="💚" baslik="Hased — Kıskançlık Şerrinden Korunma"
          score="10/10" scoreLabel="Kesin Sünnet"
          borderCls="border-l-teal-400"
          headerCls="from-teal-50/70 dark:from-teal-900/20"
          iconBgCls="bg-teal-100 dark:bg-teal-900/40"
        >
          <Bolum4 verses={hased} />
        </BolumAkordeon>

        <BolumAkordeon
          ikon="🤲" baslik="Şeytan Vesvesesi — Sığınma"
          score="10/10" scoreLabel="Kesin Sünnet"
          borderCls="border-l-indigo-400"
          headerCls="from-indigo-50/70 dark:from-indigo-900/20"
          iconBgCls="bg-indigo-100 dark:bg-indigo-900/40"
        >
          <Bolum5 verses={siginma} />
        </BolumAkordeon>

        <BolumAkordeon
          ikon="💊" baslik="Şifa — Kur'an ile İyileşme"
          score="10/10" scoreLabel="Kesin Sünnet"
          borderCls="border-l-rose-400"
          headerCls="from-rose-50/70 dark:from-rose-900/20"
          iconBgCls="bg-rose-100 dark:bg-rose-900/40"
        >
          <Bolum6 verses={sifa} />
        </BolumAkordeon>
      </div>

      <div className="mb-8 border-t border-stone-200 pt-8 dark:border-stone-700/60">
        <MitAvcisi />
      </div>

      <div className="mb-8 border-t border-stone-200 pt-8 dark:border-stone-700/60">
        <UzakDurulmasi />
      </div>

      <GenelIlkeler />
    </main>
  );
}
