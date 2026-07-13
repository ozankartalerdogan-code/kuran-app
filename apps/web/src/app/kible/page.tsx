export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { KibleClient } from "./KibleClient";

export const metadata: Metadata = {
  title: "Kıble Yönü",
  description: "Konumunuza göre Kabe'nin yönünü bulun.",
};

export default function KiblePage() {
  return <KibleClient />;
}
