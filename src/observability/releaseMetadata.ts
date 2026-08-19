import Constants from "expo-constants";
import { Platform } from "react-native";
import type { ReleaseMetadata } from "./types";

export function getReleaseMetadata(): ReleaseMetadata {
  const appVersion = Constants.expoConfig?.version ?? "unknown";
  const iosBuildNumber = Constants.platform?.ios?.buildNumber;
  const configuredBuildNumber = Constants.expoConfig?.ios?.buildNumber;
  const androidVersionCode = Constants.expoConfig?.android?.versionCode;
  const buildNumber = Platform.OS === "ios"
    ? iosBuildNumber ?? configuredBuildNumber ?? "unknown"
    : androidVersionCode != null
      ? String(androidVersionCode)
      : "unknown";

  return {
    appVersion,
    buildNumber,
    platform: Platform.OS,
    channel: __DEV__ ? "development" : "release"
  };
}
