import type { Metadata } from "next";
import { NotlarimClient } from "./NotlarimClient";

export const metadata: Metadata = {
  title: "Notlarım",
  description: "Ayetlere eklediğiniz kişisel notları görüntüleyin ve yönetin.",
};

export default function NotlarimPage() {
  return <NotlarimClient />;
}
