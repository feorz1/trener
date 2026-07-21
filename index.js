if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true") {
  const { registerRootComponent } = require("expo");
  const { Platform } = require("react-native");
  const StorybookRoot =
    Platform.OS === "web"
      ? require("./.rnstorybook").default
      : require("./src/storybook/MobileStorybook").MobileStorybook;

  registerRootComponent(StorybookRoot);
} else {
  require("expo-router/entry");
}
