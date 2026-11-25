/** Cihazın doğal üst kenarının yönünü, çizilen ekranın üst kenarının yönüne çevirir. */
export function headingForScreen(
  deviceHeadingDeg: number,
  screenRotationDeg: 0 | 90 | 180 | -90,
): number {
  // Android Surface.ROTATION_90 (Expo orientation=90): ekranın üstü cihazın
  // doğal sağıdır; pusulada doğal üstten sağa +90° olduğundan dönüş EKLENİR.
  // Kuzeye bakan cihaz fiziksel olarak saat yönünde 90° döndürülürse doğal
  // üstü doğuya (90°), yatay UI'ın üstü kuzeye bakar: orientation=-90,
  // headingForScreen(90, -90)=0. Ters yönde (270, 90)=0 olur.
  // EMÜLATÖRDE DOĞRULA: Android'de iki yatay yön.
  // iPad AÇILINCA DOĞRULA: yatay UI'da CLLocationManager heading düzeltmesinin işareti.
  // Expo iOS orientation'ı UIDevice'dan, Android ise display.rotation'dan alır.
  if (screenRotationDeg === 0 && deviceHeadingDeg >= 0 && deviceHeadingDeg < 360) {
    return deviceHeadingDeg;
  }
  return ((deviceHeadingDeg + screenRotationDeg) % 360 + 360) % 360;
}
/** Expo orientation değerinden, gerçekten çizilen arayüzün dönüşünü seçer. */
export function effectiveScreenRotation(
  platform: "ios" | "android" | string,
  orientation: number | undefined,
): 0 | 90 | 180 | -90 {
  if (platform === "ios") {
    // iPad açılınca arayüz yönü expo-screen-orientation ile alınacak:
    // UIInterfaceOrientation: LANDSCAPE_RIGHT→+90, LANDSCAPE_LEFT→-90, PORTRAIT_DOWN→180.
    // DeviceMotion orientation iOS'ta fiziksel yön, işareti ters ve faceUp'ta 0 — KULLANMA.
    return 0;
  }
  if (platform === "android") {
    // display.rotation doğrudan arayüzün dönüşüdür.
    return orientation === 90 || orientation === 180 || orientation === -90 ? orientation : 0;
  }
  return 0;
}

