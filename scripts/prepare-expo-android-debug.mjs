#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getConfig } = require("@expo/config");
const { resolveLocalTemplateAsync } = require("@expo/cli/build/src/prebuild/resolveLocalTemplate");

const INVOCATION_ROOT = process.cwd();
const MOBILE_ROOT = fs.existsSync(path.join(INVOCATION_ROOT, "app.config.js"))
  ? INVOCATION_ROOT : path.join(INVOCATION_ROOT, "apps", "mobile");
const ROOT = path.resolve(MOBILE_ROOT, "..", "..");
const ANDROID_ROOT = path.join(MOBILE_ROOT, "android");

function javaSources(root) {
  const files = [];
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filePath);
      else if (/\.(?:java|kt)$/.test(entry.name)) files.push(filePath);
    }
  };
  visit(path.join(root, "app", "src", "main", "java"));
  return files;
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, destinationPath);
    else fs.copyFileSync(sourcePath, destinationPath);
  }
}

function mainApplication(root) {
  return javaSources(root).find((filePath) => /^MainApplication\.(java|kt)$/.test(path.basename(filePath))) ?? null;
}

function declaredPackage(filePath) {
  return fs.readFileSync(filePath, "utf8").match(/^package\s+([^\s]+)\s*$/m)?.[1] ?? null;
}

function validateAndroid(expectedPackage) {
  const filePath = mainApplication(ANDROID_ROOT);
  if (!filePath) throw new Error(`Prepared Android project has no MainApplication under ${ANDROID_ROOT}`);
  const actualPackage = declaredPackage(filePath);
  if (actualPackage !== expectedPackage) {
    throw new Error(`MainApplication package mismatch: expected=${expectedPackage} actual=${actualPackage ?? "missing"} file=${filePath}`);
  }
  return filePath;
}

function configurePathAliasAutolinking() {
  const settingsPath = path.join(ANDROID_ROOT, "settings.gradle");
  const contents = fs.readFileSync(settingsPath, "utf8");
  if (contents.includes("expo-autolinking-path-alias.mjs")) return;
  const needle = "    ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)";
  if (!contents.includes(needle)) {
    throw new Error("Cannot locate Expo React Native autolinking command in settings.gradle.");
  }
  const replacement = [
    '    if (System.getenv("EXPO_ANDROID_PATH_ALIAS_ROOT")) {',
    '      ex.autolinkLibrariesFromCommand(["node", new File(rootDir, "../../../scripts/expo-autolinking-path-alias.mjs").absolutePath])',
    "    } else {",
    "      ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)",
    "    }",
  ].join("\n");
  fs.writeFileSync(settingsPath, contents.replace(needle, replacement), "utf8");
}

async function prepare() {
  const exp = getConfig(MOBILE_ROOT).exp;
  const expectedPackage = exp.android?.package;
  if (!expectedPackage) throw new Error("app.config.js must declare expo.android.package.");

  if (fs.existsSync(ANDROID_ROOT)) {
    configurePathAliasAutolinking();
    const filePath = validateAndroid(expectedPackage);
    console.log(`Android debug project already prepared: ${path.relative(ROOT, filePath)}`);
    return;
  }

  const temporaryRoot = path.join(ROOT, ".tmp");
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const templateDirectory = fs.mkdtempSync(path.join(temporaryRoot, "expo-android-template-"));
  try {
    await resolveLocalTemplateAsync({ templateDirectory, projectRoot: MOBILE_ROOT, exp });
    const templateMain = mainApplication(path.join(templateDirectory, "android"));
    if (!templateMain) throw new Error("Expo local template has no MainApplication.");

    const javaRoot = path.join(templateDirectory, "android", "app", "src", "main", "java");
    const templatePackage = path.relative(javaRoot, path.dirname(templateMain)).split(path.sep).join(".");
    for (const filePath of javaSources(path.join(templateDirectory, "android")).filter((file) => /^Main(Application|Activity)\.(java|kt)$/.test(path.basename(file)))) {
      const contents = fs.readFileSync(filePath, "utf8");
      const next = contents.replace(/^package\s+[^\s]+\s*$/m, `package ${templatePackage}`);
      if (next === contents && declaredPackage(filePath) !== templatePackage) {
        throw new Error(`Cannot align template package declaration in ${filePath}`);
      }
      fs.writeFileSync(filePath, next, "utf8");
    }

    copyDirectory(path.join(templateDirectory, "android"), ANDROID_ROOT);
    if (!fs.existsSync(ANDROID_ROOT) || !mainApplication(ANDROID_ROOT)) {
      throw new Error("Expo template copy did not create MainApplication.");
    }
    console.log(`Seeded Android template: ${path.relative(ROOT, mainApplication(ANDROID_ROOT))}`);
    const expoCli = path.join(path.dirname(require.resolve("@expo/cli/package.json")), "build", "bin", "cli");
    const result = spawnSync(process.execPath, [expoCli, "prebuild", "--platform", "android", "--no-install"], {
      cwd: MOBILE_ROOT,
      stdio: "inherit",
    });
    if (result.status !== 0) throw new Error(`Expo Android prebuild failed with exit code ${result.status ?? "unknown"}`);
    configurePathAliasAutolinking();
    const filePath = validateAndroid(expectedPackage);
    console.log(`Android debug project prepared: ${path.relative(ROOT, filePath)}`);
  } finally {
    fs.rmSync(templateDirectory, { recursive: true, force: true });
  }
}

prepare().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
