import { Redirect } from "expo-router";

// Mushaf Modu, 604 sayfalık sayfa görünümüyle birleştirildi. Eski yer imi
// (surah:ayah) mushaf-sayfa açılışında sayfaya çevrilerek devam ettirilir.
// Rota, eski derin linkler ve alışkanlıklar kırılmasın diye yönlendirme olarak yaşıyor.
export default function MushafScreen() {
  return <Redirect href="/mushaf-sayfa" />;
}
