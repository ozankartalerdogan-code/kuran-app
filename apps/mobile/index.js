// Android widget'ın headless görevi bu dosyada kaydedilir — bu yüzden package.json
// "main" alanı doğrudan "expo-router/entry" yerine bu dosyayı işaret eder.
import 'expo-router/entry';

// react-native-android-widget'ı require ETMEK bile (Android + New Architecture'da)
// native modül linklenmemişse senkron throw eder — mevcut dev client yeni EAS
// build'e kadar bunu çalıştıramaz. try/catch + require() (import DEĞİL, import
// hoisting try/catch'i atlar) ile diğer native modüllerle (storage/Sentry/
// backgroundRefresh) aynı build-gated desen izleniyor.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { widgetTaskHandler } = require('./src/widgets/widget-task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
} catch {
  // no-op — widget native modülü henüz build'e girmedi
}
