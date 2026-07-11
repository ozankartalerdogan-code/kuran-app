import Link from "next/link";
import { PageHeader } from "../../components/PageHeader";

const OGREN_LINKS = [
  {
    title: "Elif-Ba Öğren",
    subtitle: "Arap harfleri, adım adım — 9 konu, flashcard modu",
    href: "/ogren/elifba",
    icon: "📖",
  },
  {
    title: "Harf-i Tarif",
    subtitle: "Şemsiye / Kameriye harfler, 25 soruluk test",
    href: "/ogren/harf-i-tarif",
    icon: "☀️🌙",
  },
  {
    title: "Dersler",
    subtitle: "17 ders, kartlı okuma ve quizler",
    href: "/ogren/dersler",
  },
  {
    title: "Peygamber Kıssaları",
    subtitle: "25 peygamberin kıssası",
    href: "/peyggold-kissalari",
  },
  {
    title: "Siyer-i Nebî",
    subtitle: "Hz. Peygamber'in hayatı",
    href: "/siyer",
  },
  {
    title: "Mübarek Günler",
    subtitle: "Mübarek gün ve geceler",
    href: "/mubarek-gunler",
  },
  {
    title: "Hadisler",
    subtitle: "Seçme hadisler ve konu başlıkları",
    href: "/hadisler",
  },
];

const IBADET_LINKS = [
  {
    title: "Namaz Rehberi",
    subtitle: "Adım adım namaz kılınışı, dualar, özel namazlar",
    href: "/namaz-rehberi",
    icon: "🕌",
  },
  {
    title: "İbadet Rehberi",
    subtitle: "İnanç esasları, namaz, oruç, zekât, abdest",
    href: "/ibadet-rehberi",
    icon: "📿",
  },
  {
    title: "Dualar ve Zikirler",
    subtitle: "89 dua, 23 kategori",
    href: "/dualar",
    icon: "🤲",
  },
  {
    title: "Manevi Sığınak",
    subtitle: "Korunma ve şifa duaları",
    href: "/manevi-siginak",
    icon: "🛡️",
  },
  {
    title: "İsmi Azam",
    subtitle: "Sekine ve korunma duaları",
    href: "/manevi-siginak/ismi-azam",
    icon: "✨",
  },
  {
    title: "Esmaül Hüsna",
    subtitle: "Allah'ın 99 ismi",
    href: "/esma",
    icon: "🌟",
  },
  {
    title: "Zikirmatik",
    subtitle: "Esmaül Hüsna ile dijital zikir sayacı",
    href: "/manevi-siginak/zikirmatik",
    icon: "📿",
  },
];

function LinkGrid({ items }: { items: typeof OGREN_LINKS }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group rounded-xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-navy-200 hover:bg-navy-50/40 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-navy-800/60 dark:hover:bg-navy-950/20"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-bold text-stone-800 group-hover:text-navy-800 dark:text-stone-100 dark:group-hover:text-navy-300">
                {item.icon && <span className="text-base leading-none">{item.icon}</span>}
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{item.subtitle}</p>
            </div>
            <span className="text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-navy-500">→</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function OgrenContent() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader
        icon="📚"
        title="Konular"
        description="Öğrenme içerikleri, ibadet rehberleri ve dualar."
      />

      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">📚 Öğren</h2>
      <LinkGrid items={OGREN_LINKS} />

      <h2 className="mb-3 mt-8 text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">🕌 İbadet &amp; Dua</h2>
      <LinkGrid items={IBADET_LINKS} />
    </main>
  );
}
