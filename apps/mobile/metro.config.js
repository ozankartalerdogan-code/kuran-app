const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo watchFolders
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths ?? []),
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// react / react-dom / react-native tek kopya olarak çözülsün.
// Hoisting'e göre paket mobile/node_modules'ta da olabilir root'ta da —
// hangisi varsa onu kullan (npm install sonrası hoisting değişebiliyor).
function resolveSingleton(name) {
  const local = path.resolve(projectRoot, "node_modules", name);
  return fs.existsSync(local) ? local : path.resolve(monorepoRoot, "node_modules", name);
}
config.resolver.extraNodeModules = {
  react: resolveSingleton("react"),
  "react-dom": resolveSingleton("react-dom"),
  "react-native": resolveSingleton("react-native"),
};

// node: protokolünü boş modülle karşıla
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("node:")) {
    return { type: "empty" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
