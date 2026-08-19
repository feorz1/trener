const { registerRootComponent } = require("expo");
const { Platform } = require("react-native");

const StorybookRoot =
  Platform.OS === "web"
    ? require("../../.rnstorybook").default
    : require("./MobileStorybook").MobileStorybook;

registerRootComponent(StorybookRoot);
