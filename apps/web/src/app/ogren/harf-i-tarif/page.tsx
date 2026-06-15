import type { Metadata } from "next";
import { HarfITarifLesson } from "./HarfITarifLesson";

export const metadata: Metadata = {
  title: "Harf-i Tarif: Şemsiye ve Kameriye Harfler",
  description:
    "Arapça 'el-' takısı neden bazen er-, es-, en- okunur? 14 şemsiye ve 14 kameriye harf, Esmaül Hüsna örnekleri ve 25 soruluk testle adım adım öğren.",
  openGraph: {
    title: "Harf-i Tarif: Şemsiye ve Kameriye Harfler",
    description: "Arapça 'el-' takısının değişim kuralı — şemsiye/kameriye harfler, örnekler ve test.",
    type: "article",
  },
  alternates: { canonical: "/ogren/harf-i-tarif" },
};

export default function Page() {
  return <HarfITarifLesson />;
}
