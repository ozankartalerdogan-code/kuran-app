// Android widget sağlayıcı XML'lerine (widgetprovider_*.xml) "keyguard" kategorisi
// ekler; böylece widget'lar ana ekranın yanında kilit ekranında da eklenebilir.
// SIRA: app.config.js plugins dizisinde 'react-native-android-widget'tan ÖNCE
// yer almalı; Expo mod'ları sondan başa çalıştırır (withBaseMod/withMod), bu sayede
// kütüphane XML dosyalarını yazdıktan SONRA bu eklenti çalışır.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

/**
 * appwidget-provider XML içeriğindeki android:widgetCategory özniteliğine
 * "keyguard" değerini ekler (idempotent).
 *
 * @param {string} xml
 * @returns {string}
 */
function setKeyguardCategory(xml) {
  if (typeof xml !== 'string') return xml;
  return xml.replace(
    /(android:widgetCategory\s*=\s*)(["'])([^"']*)\2/,
    (match, prefix, quote, value) => {
      const parts = value
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.includes('keyguard')) {
        return match;
      }
      parts.push('keyguard');
      return `${prefix}${quote}${parts.join('|')}${quote}`;
    },
  );
}

function withWidgetKeyguard(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      if (!fs.existsSync(xmlDir)) {
        return cfg;
      }
      const entries = fs.readdirSync(xmlDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.startsWith('widgetprovider_') || !entry.name.endsWith('.xml')) continue;
        const filePath = path.join(xmlDir, entry.name);
        const original = fs.readFileSync(filePath, 'utf8');
        const updated = setKeyguardCategory(original);
        if (updated !== original) {
          fs.writeFileSync(filePath, updated, 'utf8');
        }
      }
      return cfg;
    },
  ]);
}

module.exports = withWidgetKeyguard;
module.exports.setKeyguardCategory = setKeyguardCategory;
