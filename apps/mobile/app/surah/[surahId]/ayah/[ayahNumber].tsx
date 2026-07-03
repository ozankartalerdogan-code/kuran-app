import { Redirect, useLocalSearchParams } from "expo-router";

// Web'in paylaşım URL'i (/surah/:surahId/ayah/:ayahNumber) uygulamanın kendi
// rotasından (/ayah/:surahId/:ayahNumber) farklı. Universal/App Links veya
// kuranyolu:// şemasıyla bu yola gelen her açılış buraya düşer, gerçek ekrana yönlendirir.
export default function SurahAyahLinkRedirect() {
  const { surahId, ayahNumber } = useLocalSearchParams<{ surahId: string; ayahNumber: string }>();
  return <Redirect href={`/ayah/${surahId}/${ayahNumber}`} />;
}
