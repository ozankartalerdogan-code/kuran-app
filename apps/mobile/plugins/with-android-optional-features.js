const { withAndroidManifest } = require('expo/config-plugins');

// Play, manifestte açıkça beyan edilmeyen donanımları izinlerden/ayarlardan
// "zorunlu" sayar: expo-network'ün ACCESS_WIFI_STATE izni → android.hardware.wifi,
// orientation: 'portrait' → android.hardware.screen.portrait. Bu da Play ön
// kontrolünde "Zorunlu donanım özelliği beyanları kullanılabilirliği kısıtlıyor"
// uyarısı veriyor (vc 22, 19 Kasım 2026). Uygulama Wi-Fi'siz (mobil veri) ve
// dikey ekranı olmayan cihazlarda da çalışır → ikisini required="false" beyan et.
const OPTIONAL_FEATURES = ['android.hardware.wifi', 'android.hardware.screen.portrait'];

module.exports = function withAndroidOptionalFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const features = (manifest['uses-feature'] = manifest['uses-feature'] || []);
    for (const name of OPTIONAL_FEATURES) {
      const existing = features.find((f) => f.$ && f.$['android:name'] === name);
      if (existing) {
        existing.$['android:required'] = 'false';
      } else {
        features.push({ $: { 'android:name': name, 'android:required': 'false' } });
      }
    }
    return cfg;
  });
};
