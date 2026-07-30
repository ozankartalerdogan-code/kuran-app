/**
 * mushafCompat.test.ts — /api/mushaf v5 geriye-uyumluluk testleri için DB kapısı.
 * Çalıştır: npm test  (Node yerleşik test runner + native TS)
 *
 * Testlerin kendisi `mushafCompat.dbtests.ts` içinde; kanonik `data/app.db`
 * gerektirdikleri için yalnız DB diskte varken import edilir. DB gitignore'lı
 * olduğundan CI checkout'unda bulunmaz ve testler atlanır — bkz. testDbGuard.ts.
 */
import { test } from "node:test";
import { appDbExists, APP_DB_SKIP_REASON } from "./testDbGuard.ts";

if (appDbExists()) {
  await import("./mushafCompat.dbtests.ts");
} else {
  test("mushaf uyumluluk testleri (app.db gerekir)", { skip: APP_DB_SKIP_REASON }, () => {});
}
