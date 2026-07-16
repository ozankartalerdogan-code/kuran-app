#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const aliasRoot = process.env.EXPO_ANDROID_PATH_ALIAS_ROOT;
if (!aliasRoot) {
  console.error("EXPO_ANDROID_PATH_ALIAS_ROOT is required.");
  process.exit(2);
}

const packageRoot = path.dirname(require.resolve("expo-modules-autolinking/package.json"));
const executable = path.join(packageRoot, "bin", "expo-modules-autolinking");
const result = spawnSync(process.execPath, [
  executable,
  "react-native-config",
  "--platform",
  "android",
  "--json",
], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
});
if (result.status !== 0) {
  process.stderr.write(result.stderr || "expo-modules-autolinking failed.\n");
  process.exit(result.status ?? 1);
}

const config = JSON.parse(result.stdout);
const reactNativePath = String(config.reactNativePath ?? "");
const nodeModulesRoot = path.dirname(reactNativePath);
const realRoot = path.dirname(nodeModulesRoot);
if (!reactNativePath || path.basename(nodeModulesRoot) !== "node_modules") {
  throw new Error(`Cannot derive workspace root from reactNativePath=${reactNativePath}`);
}

const normalizedRealRoot = path.resolve(realRoot);
const normalizedAliasRoot = path.resolve(aliasRoot);
const remap = (value) => {
  if (typeof value === "string") {
    if (value === normalizedRealRoot) return normalizedAliasRoot;
    if (value.startsWith(normalizedRealRoot + path.sep)) {
      return path.join(normalizedAliasRoot, value.slice(normalizedRealRoot.length).replace(/^[/\\]+/, ""));
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(remap);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remap(item)]));
  }
  return value;
};

const mapped = remap(config);
const mappedRelativePath = path.relative(normalizedAliasRoot, path.resolve(String(mapped.reactNativePath)));
if (!mappedRelativePath || mappedRelativePath.startsWith("..") || path.isAbsolute(mappedRelativePath)) {
  throw new Error("Autolinking path alias was not applied.");
}
process.stdout.write(JSON.stringify(mapped));
