import Link from "next/link";
import {
  BookOpen, SunMoon, Layers, Users, Scroll, CalendarHeart, Quote,
  MoonStar, BookMarked, HandHeart, Shield, Sparkles, Star, CircleDot,
  GraduationCap, ChevronRight, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";

interface OgrenLink {
  title:    string;
  subtitle: string;
  href:     string;
  icon:     LucideIcon;
}

const OGREN_LINKS: OgrenLink[] = [
  {
    title: "Elif-Ba Öğren",
    subtitle: "Arap harfleri, adım adım — 9 konu, flashcard modu",
    href: "/ogren/elifba",
    icon: BookOpen,
  },
  {
    title: "Harf-i Tarif",
    subtitle: "Şemsiye / Kameriye harfler, 25 soruluk test",
    href: "/ogren/harf-i-tarif",
    icon: SunMoon,
  },
  {
    title: "Dersler",
    subtitle: "17 ders, kartlı okuma ve quizler",
    href: "/ogren/dersler",
    icon: Layers,
  },
  {
    title: "Peygamber Kıssaları",
    subtitle: "25 peygamberin kıssası",
    href: "/peygamber-kissalari",
    icon: Users,
  },
  {
    title: "Siyer-i Nebî",
    subtitle: "Hz. Peygamber'in hayatı",
    href: "/siyer",
    icon: Scroll,
  },
  {
    title: "Mübarek Günler",
    subtitle: "Mübarek gün ve geceler",
    href: "/mubarek-gunler",
    icon: CalendarHeart,
  },
  {
    title: "Hadisler",
    subtitle: "Seçme hadisler ve konu başlıkları",
    href: "/hadisler",
    icon: Quote,
  },
];

const IBADET_LINKS: OgrenLink[] = [
  {
    title: "Namaz Rehberi",
    subtitle: "Adım adım namaz kılınışı, dualar, özel namazlar",
    href: "/namaz-rehberi",
    icon: MoonStar,
  },
  {
    title: "İbadet Rehberi",
    subtitle: "İnanç esasları, namaz, oruç, zekât, abdest",
    href: "/ibadet-rehberi",
    icon: BookMarked,
  },
  {
    title: "Dualar ve Zikirler",
    subtitle: "89 dua, 23 kategori",
    href: "/dualar",
    icon: HandHeart,
  },
  {
    title: "Manevi Sığınak",
    subtitle: "Korunma ve şifa duaları",
    href: "/manevi-siginak",
    icon: Shield,
  },
  {
    title: "İsmi Azam",
    subtitle: "Sekine ve korunma duaları",
    href: "/manevi-siginak/ismi-azam",
    icon: Sparkles,
  },
  {
    title: "Esmaül Hüsna",
    subtitle: "Allah'ın 99 ismi",
    href: "/esma",
    icon: Star,
  },
  {
    title: "Zikirmatik",
    subtitle: "Esmaül Hüsna ile dijital zikir sayacı",
    href: "/manevi-siginak/zikirmatik",
    icon: CircleDot,
  },
];

function LinkGrid({ items }: { items: OgrenLink[] }) {
  return (
    <div className="stagger-children grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group rounded-xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-navy-200 hover:bg-navy-50/40 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-navy-800/60 dark:hover:bg-navy-950/20"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-900/40 dark:text-navy-300"
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-stone-800 group-hover:text-navy-800 dark:text-stone-100 dark:group-hover:text-navy-300">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{item.subtitle}</p>
            </div>
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-navy-500"
              strokeWidth={2}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

export function OgrenContent() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={GraduationCap}
        title="Konular"
        description="Öğrenme içerikleri, ibadet rehberleri ve dualar."
      />

      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Öğren</h2>
      <LinkGrid items={OGREN_LINKS} />

      <h2 className="mb-3 mt-8 text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">İbadet &amp; Dua</h2>
      <LinkGrid items={IBADET_LINKS} />
    </main>
  );
}
