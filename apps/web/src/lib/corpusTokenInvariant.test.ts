/**
 * corpusTokenInvariant.test.ts — korpus token invariant testleri için DB kapısı.
 * Çalıştır: npm test
 *
 * Invariant'ın gerekçesi ve testlerin kendisi `corpusTokenInvariant.dbtests.ts`
 * içinde (dokunulmadan taşındı). Kanonik `data/app.db` ve frozen token map
 * gerektirdikleri için yalnız DB diskte varken import edilir; DB gitignore'lı
 * olduğundan CI checkout'unda bulunmaz — bkz. testDbGuard.ts.
 */
import { test } from "node:test";
import { repoFilesExist, DATA_INPUTS_SKIP_REASON } from "./testDbGuard.ts";

const REQUIRED = [
  "data/app.db",
  "data/candidates/morphology/hc1-ext-v1_8/token-map-hc1-ext-v1_8.jsonl",
];

if (repoFilesExist(...REQUIRED)) {
  await import("./corpusTokenInvariant.dbtests.ts");
} else {
  test(
    "korpus token invariant testleri (app.db + frozen token map gerekir)",
    { skip: DATA_INPUTS_SKIP_REASON },
    () => {},
  );
}
