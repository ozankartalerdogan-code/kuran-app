export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { OgrenContent } from "./OgrenContent";

export const metadata: Metadata = {
  title: "Elif-Ba Öğren",
  description:
    "Diyanet 2024 müfredatıyla Arap harflerini adım adım öğren — 9 konu, flashcard çalışma modu.",
};

export default function OgrenPage() {
  return <OgrenContent />;
}
