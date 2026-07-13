export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { PeygamberKissalariClient } from "./PeygamberKissalariClient";

export const metadata: Metadata = {
  title: "Peygamber Kıssaları",
  description: "Kur'an'da adı geçen peygamberlerin kıssalarını okuyun.",
};

export default function PeygamberKissalariPage() {
  return <PeygamberKissalariClient />;
}
