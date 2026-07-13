import type { Metadata } from "next";
import { BASLIKLAR } from "../../../../data/dersler/registry";
import { DersDetayClient } from "./DersDetayClient";

type PageProps = { params: { dersId: string } };

export function generateMetadata({ params }: PageProps): Metadata {
  const title = BASLIKLAR[params.dersId] ?? "Ders";
  return {
    title,
    description: `${title} dersini kartlarla okuyun ve quizle pekiştirin.`,
  };
}

export default function DersDetayPage({ params }: PageProps) {
  return <DersDetayClient dersId={params.dersId} />;
}