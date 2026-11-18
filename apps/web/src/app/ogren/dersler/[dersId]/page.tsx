import type { Metadata } from "next";
import { BASLIKLAR } from "../../../../data/dersler/registry";
import { DersDetayClient } from "./DersDetayClient";

type PageProps = { params: Promise<{ dersId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const title = BASLIKLAR[(await params).dersId] ?? "Ders";
  return {
    title,
    description: `${title} dersini kartlarla okuyun ve quizle pekiştirin.`,
  };
}

export default async function DersDetayPage({ params }: PageProps) {
  return <DersDetayClient dersId={(await params).dersId} />;
}