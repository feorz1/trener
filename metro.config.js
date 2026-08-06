const { getDefaultConfig } = require("expo/metro-config");
const { withStorybook } = require("@storybook/react-native/metro/withStorybook");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
const storybookEnabled =
  process.env.STORYBOOK_ENABLED === "true" ||
  process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true";
const production = process.env.NODE_ENV === "production";
const resolvedConfig = withStorybook(config, {
  enabled: storybookEnabled,
  configPath: ".rnstorybook"
});

if (storybookEnabled || production) {
  const productionEntry = path.resolve(__dirname, "src/runtime-entry.js");
  const storybookEntry = path.resolve(__dirname, "src/storybook/runtime-entry.js");
  const developmentAuthApi = path.resolve(__dirname, "src/auth/api/authApi.ts");
  const productionAuthApi = path.resolve(__dirname, "src/auth/api/authApi.production.ts");
  const resolveRequest = resolvedConfig.resolver.resolveRequest;

  resolvedConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolved = resolveRequest
      ? resolveRequest(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
    if (storybookEnabled && resolved.filePath === productionEntry) {
      return { filePath: storybookEntry, type: "sourceFile" };
    }
    if (production && resolved.filePath === developmentAuthApi) {
      return { filePath: productionAuthApi, type: "sourceFile" };
    }
    return resolved;
  };
}

module.exports = resolvedConfig;
