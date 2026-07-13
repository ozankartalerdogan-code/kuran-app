export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { HatimClient } from "./HatimClient";

export const metadata: Metadata = {
  title: "Hatim Takibi",
  description: "30 cüzlük Kuran okumanızı takip edin.",
};

export default function HatimPage() {
  return <HatimClient />;
}
