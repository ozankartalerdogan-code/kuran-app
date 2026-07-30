const fs = require("node:fs");
const path = require("node:path");

const realRoot = process.env.EXPO_ANDROID_REAL_ROOT;
const aliasRoot = process.env.EXPO_ANDROID_PATH_ALIAS_ROOT;
if (!realRoot || !aliasRoot) return;

const normalizedRealRoot = path.resolve(realRoot);
const normalizedAliasRoot = path.resolve(aliasRoot);
const realRootLower = normalizedRealRoot.toLowerCase();
const remap = (value) => {
  if (typeof value !== "string") return value;
  const lower = value.toLowerCase();
  if (lower === realRootLower) return normalizedAliasRoot;
  if (lower.startsWith(realRootLower + path.sep)) {
    return path.join(normalizedAliasRoot, value.slice(normalizedRealRoot.length).replace(/^[/\\]+/, ""));
  }
  return value;
};

const originalRealpathSync = fs.realpathSync.bind(fs);
const originalRealpathSyncNative = fs.realpathSync.native?.bind(fs.realpathSync);
const wrappedRealpathSync = (...args) => remap(originalRealpathSync(...args));
if (originalRealpathSyncNative) wrappedRealpathSync.native = (...args) => remap(originalRealpathSyncNative(...args));
fs.realpathSync = wrappedRealpathSync;

const originalRealpath = fs.realpath.bind(fs);
fs.realpath = (input, options, callback) => {
  const cb = typeof options === "function" ? options : callback;
  const actualOptions = typeof options === "function" ? undefined : options;
  return originalRealpath(input, actualOptions, (error, value) => cb(error, remap(value)));
};
if (fs.realpath.native) {
  const originalNative = fs.realpath.native.bind(fs.realpath);
  fs.realpath.native = (input, options, callback) => {
    const cb = typeof options === "function" ? options : callback;
    const actualOptions = typeof options === "function" ? undefined : options;
    return originalNative(input, actualOptions, (error, value) => cb(error, remap(value)));
  };
}

const originalPromiseRealpath = fs.promises.realpath.bind(fs.promises);
fs.promises.realpath = async (...args) => remap(await originalPromiseRealpath(...args));
