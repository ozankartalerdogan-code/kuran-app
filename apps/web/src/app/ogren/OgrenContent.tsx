import Link from "next/link";

const CONTENT_LINKS = [
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
    href: "/peygamber-kissalari",
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

export function OgrenContent() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-700/60">
        <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-50">Konular</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Öğrenme içerikleri — Elif-Ba&apos;dan dersler ve kıssalara.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {CONTENT_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-emerald-800/60 dark:hover:bg-emerald-950/20"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-bold text-stone-800 group-hover:text-emerald-800 dark:text-stone-100 dark:group-hover:text-emerald-300">
                  {item.icon && <span className="text-base leading-none">{item.icon}</span>}
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{item.subtitle}</p>
              </div>
              <span className="text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500">→</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
