export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { HadislerClient } from "./HadislerClient";

export const metadata: Metadata = {
  title: "Hadisler — Kuran Yolu",
  description: "Seçme hadisleri konu başlıklarına göre okuyun.",
};

export default function HadislerPage() {
  return <HadislerClient />;
}
