export type AyahShareContent = {
  surahName: string;
  ayahNumber: number;
  arabicText: string | null;
  reading: string | null;
  meal: string | null;
  webUrl: string;
};

// Native paylaşım hedefleri mesajı aynen kullandığı için içerik burada saf ve
// platformdan bağımsız oluşturulur. Boş bölümler satır aralığı üretmez.
export function buildAyahShareText({
  surahName,
  ayahNumber,
  arabicText,
  reading,
  meal,
  webUrl,
}: AyahShareContent): string {
  return [
    `${surahName} · ${ayahNumber}. Ayet`,
    arabicText,
    reading,
    meal,
    "Kuran Yolu",
    webUrl,
  ].reduce<string[]>((parts, part) => {
    if (part?.trim()) parts.push(part);
    return parts;
  }, []).join("\n\n");
}