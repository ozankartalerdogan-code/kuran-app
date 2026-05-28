import type { Metadata } from "next";
import { FavorilerClient } from "./FavorilerClient";

export const metadata: Metadata = {
  title: "Favori Ayetler",
  description: "Kaydettiğiniz favori ayetleri görüntüleyin ve yönetin.",
};

export default function FavorilerPage() {
  return <FavorilerClient />;
}
