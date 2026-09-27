const { withInfoPlist } = require('expo/config-plugins');

// expo-audio, enableBackgroundPlayback varsayılanı (true) ile iOS'a
// UIBackgroundModes "audio" ekliyor. App arka planda ses çalmıyor (yalnız
// elif-ba derslerinde ön planda kısa sesler) → App Review 2.5.4 gereği bu mod
// beyan edilmemeli. expo-audio seçeneğini kapatmak Android manifest'ini de
// değiştirirdi; bu plugin YALNIZ iOS Info.plist'ten "audio" modunu çıkarır.
module.exports = function withIosNoBackgroundAudio(config) {
  return withInfoPlist(config, (cfg) => {
    const modes = cfg.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      cfg.modResults.UIBackgroundModes = modes.filter((m) => m !== 'audio');
    }
    return cfg;
  });
};
