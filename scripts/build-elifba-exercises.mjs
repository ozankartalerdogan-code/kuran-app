import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// Doğrulama mantığı tek kaynaktan gelsin diye saf TypeScript modülü doğrudan
// import edilir (Node 24 tip soyutlamasını destekler); burada kural kopyası yok.
import { validateExercises } from "../apps/mobile/src/lib/elifbaExerciseGen.ts";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const inputPath = resolve(repoRoot, "content/elifba/exercises.reviewed.json");
const outputPath = resolve(repoRoot, "apps/mobile/src/data/elifba.exercises.json");

async function main() {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(inputPath, "utf8"));
  } catch (error) {
    console.error(`Girdi okunamadı: ${inputPath}`);
    console.error(error);
    process.exitCode = 1;
    return;
  }

  if (!Array.isArray(parsed)) {
    console.error("Girdi kökü bir kayıt listesi (array) olmalı.");
    process.exitCode = 1;
    return;
  }

  const { valid, errors } = validateExercises(parsed);
  if (errors.length > 0) {
    console.error(`Doğrulama başarısız; dosya yazılmadı (${errors.length} hata):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(valid, null, 2)}\n`, "utf8");
  console.log(`Yazıldı: ${outputPath} (${valid.length} kayıt)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
