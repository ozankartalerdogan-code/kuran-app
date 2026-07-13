export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { SiyerClient } from "./SiyerClient";

export const metadata: Metadata = {
  title: "Siyer-i Nebî",
  description: "Hz. Peygamber'in hayatını dönemlere göre okuyun.",
};

export default function SiyerPage() {
  return <SiyerClient />;
}
