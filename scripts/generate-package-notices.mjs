import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE_MANIFESTS = [
  "package.json",
  "apps/web/package.json",
  "apps/mobile/package.json",
  "packages/core/package.json",
  "packages/storage/package.json",
  "packages/types/package.json",
  "packages/ui/package.json",
];
const LICENSE_NAMES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "license",
  "license.md",
  "license.txt",
  "COPYING",
];
const NODE_MODULE_ROOTS = [
  path.join(REPO_ROOT, "node_modules"),
  path.join(REPO_ROOT, "apps/web/node_modules"),
  path.join(REPO_ROOT, "apps/mobile/node_modules"),
];

const names = new Set();
for (const relativeManifest of WORKSPACE_MANIFESTS) {
  const manifest = JSON.parse(readFileSync(path.join(REPO_ROOT, relativeManifest), "utf8"));
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (!name.startsWith("@quran-app/")) names.add(name);
  }
}

const records = [];
for (const name of [...names].sort((left, right) => left.localeCompare(right, "en"))) {
  const packageDirectory = NODE_MODULE_ROOTS
    .map((root) => path.join(root, ...name.split("/")))
    .find((candidate) => existsSync(path.join(candidate, "package.json")));
  if (!packageDirectory) {
    throw new Error(`Installed runtime package is missing: ${name}`);
  }
  const packageManifestPath = path.join(packageDirectory, "package.json");
  const manifest = JSON.parse(readFileSync(packageManifestPath, "utf8"));
  const licenseName = LICENSE_NAMES.find((candidate) => existsSync(path.join(packageDirectory, candidate))) ?? null;
  const licenseText = licenseName ? readFileSync(path.join(packageDirectory, licenseName), "utf8").trim() : null;
  records.push({
    name,
    version: manifest.version ?? "unknown",
    declaredLicense: manifest.license ?? "UNDECLARED",
    repository:
      typeof manifest.repository === "string"
        ? manifest.repository
        : manifest.repository?.url ?? manifest.homepage ?? null,
    licenseFile: licenseName ? `node_modules/${name}/${licenseName}` : null,
    licenseSha256: licenseText
      ? createHash("sha256").update(Buffer.from(licenseText, "utf8")).digest("hex")
      : null,
    licenseText,
  });
}

const table = [
  "# Runtime Package Notices",
  "",
  "Generated deterministically from direct production dependencies in the root and workspace package manifests.",
  "A release build may include additional transitive or native packages; the shipped web/mobile artifacts must receive a final bundle-specific license/SBOM check.",
  "",
  "| Package | Version | Declared license | Repository | License evidence |",
  "|---|---:|---|---|---|",
  ...records.map(
    (record) =>
      `| ${record.name} | ${record.version} | ${record.declaredLicense} | ${
        record.repository ? String(record.repository).replace(/^git\+/u, "").replace(/\.git$/u, "") : "not declared"
      } | ${
        record.licenseFile ? `${record.licenseFile} · SHA-256 \`${record.licenseSha256}\`` : "package metadata only"
      } |`,
  ),
  "",
].join("\n");

const texts = records
  .map((record) => {
    const heading = `${"=".repeat(80)}\n${record.name}@${record.version} — ${record.declaredLicense}\n${"=".repeat(80)}`;
    return `${heading}\n${record.licenseText ?? "No standalone license file was found in the installed package; consult the package metadata/repository before distribution."}`;
  })
  .join("\n\n");

writeFileSync(path.join(REPO_ROOT, "licenses/PACKAGE-NOTICES.md"), `${table}\n`, "utf8");
writeFileSync(path.join(REPO_ROOT, "licenses/PACKAGE-LICENSE-TEXTS.txt"), `${texts}\n`, "utf8");
console.log(`Wrote package notices for ${records.length} direct runtime dependencies.`);
