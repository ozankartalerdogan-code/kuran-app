const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const hiddenNativeModules = {
  'react-native-reanimated': path.resolve(__dirname, 'apps/mobile/src/shims/react-native-reanimated.ts'),
  'react-native-worklets': path.resolve(__dirname, 'apps/mobile/src/shims/react-native-worklets.ts'),
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (hiddenNativeModules[moduleName]) {
    return {
      filePath: hiddenNativeModules[moduleName],
      type: 'sourceFile',
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
