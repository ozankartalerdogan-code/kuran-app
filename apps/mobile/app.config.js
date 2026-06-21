const appJson = require('./app.json');

module.exports = () => {
  const plugins = appJson.expo.plugins.map(plugin => {
    if (plugin === '@react-native-firebase/app') {
      return [
        '@react-native-firebase/app',
        {
          android: {
            googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
          },
        },
      ];
    }
    return plugin;
  });

  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      plugins,
    },
  };
};
