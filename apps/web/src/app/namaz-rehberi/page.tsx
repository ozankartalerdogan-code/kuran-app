import type { Metadata } from "next";
import { NamazRehberiClient } from "./NamazRehberiClient";

export const metadata: Metadata = {
  title: "Namaz Rehberi",
  description:
    "Yeni başlayanlar için adım adım namaz rehberi: farz/sünnet farkı, namaz öncesi hazırlık, adım adım namaz kılınışı, dualar, vitir namazı ve özel namazlar (cenaze, teheccüd, teravih, istihare ve daha fazlası).",
  alternates: { canonical: "/namaz-rehberi" },
};

export default function NamazRehberiPage() {
  return <NamazRehberiClient />;
}
