import type { Metadata } from "next";
import { BASLIKLAR } from "../../../../data/dersler/registry";
import { DersDetayClient } from "./DersDetayClient";

type PageProps = { params: Promise<{ dersId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dersId } = await params;
  const title = BASLIKLAR[dersId] ?? "Ders";
  return {
    title,
    description: `${title} dersini kartlarla okuyun ve quizle pekiştirin.`,
  };
}

export default async function DersDetayPage({ params }: PageProps) {
  const { dersId } = await params;
  return <DersDetayClient dersId={dersId} />;
}