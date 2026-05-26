"use client";

import { useRouter } from "next/navigation";
import { VerseCard, type VerseCardData } from "../../components/VerseCard";

export function ManeviVerseList({ verses }: { verses: VerseCardData[] }) {
  const router = useRouter();
  if (verses.length === 0) return null;
  return (
    <div className="space-y-3">
      {verses.map((v) => (
        <VerseCard
          key={v.verse_key}
          verse={v}
          onTagClick={(tag) => router.push(`/search?tag=${encodeURIComponent(tag)}&page=1`)}
        />
      ))}
    </div>
  );
}
