/**
 * testDbGuard.ts — DB'ye bağlı testler için varlık kontrolü.
 *
 * `data/app.db` 227MB ve `.gitignore` ile izlenmiyor; CI checkout'unda BULUNMAZ.
 * Buna rağmen onu koşulsuz açan testler CI'yı kırıyordu (bkz. Typecheck
 * workflow'unun test job'ı). DB'ye bağlı test dosyaları gövdelerini ayrı bir
 * `*.dbtests.ts` modülüne alır ve yalnız DB varsa dinamik import eder; yoksa
 * tek bir atlanmış test kaydeder. Böylece yerelde tam kapsam korunur, CI yeşil
 * kalır.
 *
 * Yalnız testlerden kullanılır; uygulama kodu bu modülü import etmez.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Monorepo kökü. */
export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

/** Monorepo kökündeki kanonik `data/app.db` yolu. */
export const APP_DB_PATH = path.join(REPO_ROOT, "data", "app.db");

/** `data/app.db` diskte var mı? */
export function appDbExists(): boolean {
  return fs.existsSync(APP_DB_PATH);
}

/**
 * Repo köküne göreli verilen yolların HEPSİ diskte var mı?
 *
 * `data/` dizini pratikte izlenmiyor (yalnız tek dosya commit'li), bu yüzden
 * app.db dışındaki veri girdilerine dayanan testler de aynı kapıdan geçer.
 */
export function repoFilesExist(...relativePaths: string[]): boolean {
  return relativePaths.every((relativePath) =>
    fs.existsSync(path.join(REPO_ROOT, relativePath)),
  );
}

/** Atlanan testlerde gösterilecek gerekçe. */
export const APP_DB_SKIP_REASON =
  "data/app.db yok (gitignore'lı, CI checkout'unda bulunmaz) — DB'ye bağlı testler atlandı";

/** `data/` altındaki üretim girdileri eksik olduğunda gösterilecek gerekçe. */
export const DATA_INPUTS_SKIP_REASON =
  "data/ altındaki gerekli girdiler yok (gitignore'lı, CI checkout'unda bulunmaz) — test atlandı";
