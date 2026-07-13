export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { DualarClient } from "./DualarClient";

export const metadata: Metadata = {
  title: "Dualar ve Zikirler",
  description: "Duaları ve zikirleri kategori bazında okuyun.",
};

export default function DualarPage() {
  return <DualarClient />;
}
