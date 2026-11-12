// Android widget seçicisinde görünen ad/açıklamayı dile göre yerelleştirir.
// react-native-android-widget etiketi düz metin, açıklamayı translatable="false" yazıyor;
// bu plugin:
//  - values/strings.xml: widget_<ad>_label + açıklamayı (İngilizce, varsayılan) çevrilebilir yapar,
//  - values-tr/widget_strings.xml: Türkçe karşılıkları yazar.
// app.config.js'te widget'ın label'ı "@string/widget_<ad>_label" olmalı.
// SIRA: plugins dizisinde 'react-native-android-widget'tan ÖNCE yer almalı; Expo mod'ları
// sondan başa çalıştırır, böylece bu strings.xml düzenlemesi widget plugin'inden SONRA uygulanır.
const fs = require('fs');
const path = require('path');
const { withStringsXml, withDangerousMod, withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'");

/** @param {{ widgets: { name: string, en: { label: string, description: string }, tr: { label: string, description: string } }[] }} params */
function withWidgetStrings(config, params) {
  // Widget plugin'i alıcı zaten varsa (önceden prebuild edilmiş android/) etiketi
  // güncellemez; etiketi burada string kaynağına bağla.
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    for (const w of params.widgets) {
      const r = (app.receiver ?? []).find((x) => x.$['android:name']?.endsWith(`.${w.name}`));
      if (r) r.$['android:label'] = `@string/widget_${w.name.toLowerCase()}_label`;
    }
    return cfg;
  });
  config = withStringsXml(config, (cfg) => {
    for (const w of params.widgets) {
      const id = w.name.toLowerCase();
      cfg.modResults = AndroidConfig.Strings.setStringItem(
        [
          { $: { name: `widget_${id}_label` }, _: esc(w.en.label) },
          { $: { name: `widget_${id}_description` }, _: esc(w.en.description) },
        ],
        cfg.modResults,
      );
    }
    return cfg;
  });
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/values-tr');
      fs.mkdirSync(dir, { recursive: true });
      const items = params.widgets.flatMap((w) => {
        const id = w.name.toLowerCase();
        return [
          `  <string name="widget_${id}_label">${esc(w.tr.label)}</string>`,
          `  <string name="widget_${id}_description">${esc(w.tr.description)}</string>`,
        ];
      });
      fs.writeFileSync(path.join(dir, 'widget_strings.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${items.join('\n')}\n</resources>\n`);
      return cfg;
    },
  ]);
}

module.exports = withWidgetStrings;
