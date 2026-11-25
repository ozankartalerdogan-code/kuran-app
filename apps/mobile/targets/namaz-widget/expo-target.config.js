/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "NamazWidget",
  bundleIdentifier: ".namazwidget",
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "WidgetKit"],
  colors: {
    $widgetBackground: { light: "#fffdf6", dark: "#1c1917" },
    $accent: "#047857",
  },
  entitlements: {
    "com.apple.security.application-groups":
      config.ios?.entitlements?.["com.apple.security.application-groups"] ?? [
        "group.com.kuranapp.mobile",
      ],
  },
});
