import type { Metadata } from "next";
import { DerslerClient } from "./DerslerClient";

export const metadata: Metadata = {
  title: "Dersler — Kuran Yolu",
  description: "İbadet, akaid, ahlak, siyer ve tecvid derslerini kart kart okuyup quizlerle pekiştirin.",
};

export default function DerslerPage() {
  return <DerslerClient />;
}