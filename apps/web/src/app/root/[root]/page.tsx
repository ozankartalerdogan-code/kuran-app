export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import type { RootDetail } from "../../../types/rootDetail";
import RootDetailContent from "./RootDetailContent";

interface Props {
  params: Promise<{ root: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { root: encodedRoot } = await params;
  const root = decodeURIComponent(encodedRoot);
  return {
    title: `Kök: ${root}`,
    description: `${root} kökünün anlamı, sure dağılımı ve türev kelimeleri`,
  };
}

export default async function RootDetailPage({ params }: Props) {
  const { root: encodedRoot } = await params;
  const root = decodeURIComponent(encodedRoot);

  let data: RootDetail | null = null;
  let error: string | null = null;

  try {
    // SSR: DB'den doğrudan oku — API route ile aynı ortak modül (getRootDetailFromDb)
    const { getRootDetailFromDb } = await import("../../../lib/getRootDetailFromDb");
    data = await getRootDetailFromDb(root);
    if (!data) error = "Kök bulunamadı.";
  } catch (e) {
    error = "Veri yüklenirken bir hata oluştu.";
    console.error("[root detail]", e);
  }

  return <RootDetailContent root={root} data={data} error={error} />;
}
