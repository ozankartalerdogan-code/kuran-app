import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");

console.log(">>> Bağımlılıklar yükleniyor...");
execSync("npm install --legacy-peer-deps", { cwd: root, stdio: "inherit" });

console.log(">>> Build başlıyor...");
execSync("npm run build --workspace=apps/web", { cwd: root, stdio: "inherit" });

console.log(">>> Build tamamlandı.");
