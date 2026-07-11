export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { MubarekGunlerClient } from "./MubarekGunlerClient";

export const metadata: Metadata = {
  title: "Mübarek Gün ve Geceler — Kuran Yolu",
  description: "Mübarek gün ve geceleri, dayanak notları ve ibadet önerileriyle okuyun.",
};

export default function MubarekGunlerPage() {
  return <MubarekGunlerClient />;
}
