import { PageSkeleton } from "../../../components/Skeleton";

// Rota verisi (Turso) gelene kadar kimlikli iskelet — bos beyaz ekran yerine.
export default function Loading() {
  return <PageSkeleton cards={5} />;
}
