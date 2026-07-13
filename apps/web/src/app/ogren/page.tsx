import type { Metadata } from "next";
import { OgrenContent } from "./OgrenContent";

export const metadata: Metadata = {
  title: "Konular",
  description: "Elif-Ba, Harf-i Tarif, dersler, peygamber kıssaları ve daha fazlası — Kuran Yolu öğrenme içerikleri.",
  alternates: { canonical: "/ogren" },
};

export default function OgrenPage() {
  return <OgrenContent />;
}
