import { Redirect } from "expo-router";

// Hatim Takibi, mushaf sayfa görünümüne gömüldü (HatimPanel — başlıktaki
// yer imi ikonu). Veri anahtarı (hatimTakibi) değişmedi; ilerleme aynen durur.
// Rota, eski derin linkler kırılmasın diye paneli açan yönlendirme olarak yaşıyor.
export default function HatimScreen() {
  return <Redirect href="/mushaf-sayfa?hatim=1" />;
}
