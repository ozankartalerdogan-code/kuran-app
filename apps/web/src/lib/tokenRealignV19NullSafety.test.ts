/**
 * tokenRealignV19NullSafety.test.ts — token-realign-v1_9 NULL güvenliği
 * testleri için veri kapısı.
 * Çalıştır: npm test
 *
 * Testlerin kendisi `tokenRealignV19NullSafety.dbtests.ts` içinde (dokunulmadan
 * taşındı). Hem kanonik `data/app.db`'ye hem migration'ın forward.sql dosyasına
 * ihtiyaç duyarlar; ikisi de gitignore'lı olduğundan CI checkout'unda bulunmaz
 * — bkz. testDbGuard.ts.
 */
import { test } from "node:test";
import { repoFilesExist, DATA_INPUTS_SKIP_REASON } from "./testDbGuard.ts";

const REQUIRED = [
  "data/app.db",
  "data/candidates/morphology/token-realign-v1_9/forward.sql",
];

if (repoFilesExist(...REQUIRED)) {
  await import("./tokenRealignV19NullSafety.dbtests.ts");
} else {
  test(
    "token-realign-v1_9 NULL güvenliği testleri (app.db + forward.sql gerekir)",
    { skip: DATA_INPUTS_SKIP_REASON },
    () => {},
  );
}
