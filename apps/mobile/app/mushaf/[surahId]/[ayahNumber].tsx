import { Redirect, useLocalSearchParams } from "expo-router";
import { ayetinSayfasi, SAYFA_SAYISI } from "../../../src/lib/mushafSayfa";

// Eski Mushaf Modu ekranı (büyük font + JuzTracker) sayfa görünümüyle
// birleştirildi; uygulama içinden buraya link kalmadı. Rota, eski derin
// linkler (kuranyolu://mushaf/2/255) kırılmasın diye ayetin bulunduğu
// 604'lük mushaf sayfasına yönlendirme olarak yaşıyor.
export default function MushafAyahLinkRedirect() {
  const { surahId, ayahNumber } = useLocalSearchParams<{ surahId: string; ayahNumber: string }>();
  const s = Number(surahId);
  const a = Number(ayahNumber);
  if (!Number.isInteger(s) || s < 1 || s > 114 || !Number.isInteger(a) || a < 1) {
    return <Redirect href="/mushaf-sayfa" />;
  }
  const sayfa = Math.min(SAYFA_SAYISI, Math.max(1, ayetinSayfasi(s, a)));
  return <Redirect href={`/mushaf-sayfa?sayfa=${sayfa}`} />;
}
