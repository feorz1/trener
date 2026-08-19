import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import plist from "@expo/plist";
import {
  DEVELOPMENT_RELEASE_LINKS,
  ReleaseLinksConfigurationError,
  resolveReleaseLinks
} from "../src/config/releaseLinks";

const developmentLinks = resolveReleaseLinks({ NODE_ENV: "development" });
assert.equal(developmentLinks.privacyPolicyUrl, DEVELOPMENT_RELEASE_LINKS.privacyPolicyUrl);
assert.equal(developmentLinks.supportUrl, DEVELOPMENT_RELEASE_LINKS.supportUrl);
assert.match(developmentLinks.privacyPolicyUrl, /^https:\/\//);
assert.match(developmentLinks.supportUrl, /^https:\/\//);

assert.throws(
  () => resolveReleaseLinks({ NODE_ENV: "production" }),
  (error) => error instanceof ReleaseLinksConfigurationError
    && error.issues.includes("EXPO_PUBLIC_PRIVACY_POLICY_URL is required in production")
    && error.issues.includes("EXPO_PUBLIC_SUPPORT_URL is required in production")
);

assert.throws(
  () => resolveReleaseLinks({
    NODE_ENV: "production",
    EXPO_PUBLIC_PRIVACY_POLICY_URL: "   ",
    EXPO_PUBLIC_SUPPORT_URL: "\t"
  }),
  (error) => error instanceof ReleaseLinksConfigurationError
    && error.issues.includes("EXPO_PUBLIC_PRIVACY_POLICY_URL is required in production")
    && error.issues.includes("EXPO_PUBLIC_SUPPORT_URL is required in production")
);

assert.throws(
  () => resolveReleaseLinks({
    NODE_ENV: "production",
    EXPO_PUBLIC_PRIVACY_POLICY_URL: "http://privacy.example.com/privacy",
    EXPO_PUBLIC_SUPPORT_URL: "https://support.example.com/support"
  }),
  (error) => error instanceof ReleaseLinksConfigurationError
    && error.issues.includes("EXPO_PUBLIC_PRIVACY_POLICY_URL must use HTTPS")
);

assert.throws(
  () => resolveReleaseLinks({
    NODE_ENV: "development",
    EXPO_PUBLIC_PRIVACY_POLICY_URL: "http://127.0.0.1:3000/privacy",
    EXPO_PUBLIC_SUPPORT_URL: "https://support.example.com/support"
  }),
  (error) => error instanceof ReleaseLinksConfigurationError
    && error.issues.includes("EXPO_PUBLIC_PRIVACY_POLICY_URL must use HTTPS")
);

assert.throws(
  () => resolveReleaseLinks({
    NODE_ENV: "production",
    EXPO_PUBLIC_PRIVACY_POLICY_URL: "https://privacy.example.com/privacy",
    EXPO_PUBLIC_SUPPORT_URL: "http://support.example.com/support"
  }),
  (error) => error instanceof ReleaseLinksConfigurationError
    && error.issues.includes("EXPO_PUBLIC_SUPPORT_URL must use HTTPS")
);

const secretBearingUrl = "https://privacy.example.com/privacy?token=must-not-leak";
assert.throws(
  () => resolveReleaseLinks({
    NODE_ENV: "production",
    EXPO_PUBLIC_PRIVACY_POLICY_URL: secretBearingUrl,
    EXPO_PUBLIC_SUPPORT_URL: "https://support.example.com/support"
  }),
  (error) => error instanceof ReleaseLinksConfigurationError
    && !error.message.includes(secretBearingUrl)
    && !error.message.includes("must-not-leak")
);

assert.deepEqual(
  resolveReleaseLinks({
    NODE_ENV: "production",
    EXPO_PUBLIC_PRIVACY_POLICY_URL: "https://privacy.example.com/privacy",
    EXPO_PUBLIC_SUPPORT_URL: "https://support.example.com/support"
  }),
  {
    privacyPolicyUrl: "https://privacy.example.com/privacy",
    supportUrl: "https://support.example.com/support"
  }
);

type PrivacyManifestEntry = {
  NSPrivacyCollectedDataType?: string;
  NSPrivacyCollectedDataTypeLinked?: boolean;
  NSPrivacyCollectedDataTypeTracking?: boolean;
  NSPrivacyCollectedDataTypePurposes?: string[];
};

type AccessedApiEntry = {
  NSPrivacyAccessedAPIType?: string;
  NSPrivacyAccessedAPITypeReasons?: string[];
};

type PrivacyManifest = {
  NSPrivacyAccessedAPITypes?: AccessedApiEntry[];
  NSPrivacyCollectedDataTypes?: PrivacyManifestEntry[];
  NSPrivacyTracking?: boolean;
  NSPrivacyTrackingDomains?: string[];
};

const manifest = plist.parse(
  readFileSync(new URL("../ios/TrainerFoundation/PrivacyInfo.xcprivacy", import.meta.url), "utf8")
) as PrivacyManifest;

const settingsSource = readFileSync(new URL("../app/(tabs)/settings.tsx", import.meta.url), "utf8");
assert.match(settingsSource, /releaseLinks\.privacyPolicyUrl/);
assert.match(settingsSource, /releaseLinks\.supportUrl/);
assert.match(settingsSource, /Linking\.openURL/);
assert.match(settingsSource, /Alert\.alert\("Не удалось открыть ссылку"/);

const expectedTypes = [
  "NSPrivacyCollectedDataTypeEmailAddress",
  "NSPrivacyCollectedDataTypeFitness",
  "NSPrivacyCollectedDataTypeHealth",
  "NSPrivacyCollectedDataTypeName",
  "NSPrivacyCollectedDataTypeOtherDataTypes",
  "NSPrivacyCollectedDataTypeOtherUserContactInfo",
  "NSPrivacyCollectedDataTypeOtherUserContent",
  "NSPrivacyCollectedDataTypePhoneNumber",
  "NSPrivacyCollectedDataTypeUserID"
].sort();
const entries = manifest.NSPrivacyCollectedDataTypes ?? [];
assert.deepEqual(entries.map((entry) => entry.NSPrivacyCollectedDataType).sort(), expectedTypes);
for (const entry of entries) {
  assert.equal(entry.NSPrivacyCollectedDataTypeLinked, true);
  assert.equal(entry.NSPrivacyCollectedDataTypeTracking, false);
  assert.deepEqual(entry.NSPrivacyCollectedDataTypePurposes, ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]);
}

assert.equal(manifest.NSPrivacyTracking, false);
assert.equal(manifest.NSPrivacyTrackingDomains, undefined);
assert.deepEqual(
  Object.fromEntries(
    (manifest.NSPrivacyAccessedAPITypes ?? []).map((entry) => [
      entry.NSPrivacyAccessedAPIType,
      entry.NSPrivacyAccessedAPITypeReasons
    ])
  ),
  {
    NSPrivacyAccessedAPICategoryUserDefaults: ["CA92.1"],
    NSPrivacyAccessedAPICategoryFileTimestamp: ["0A2A.1", "3B52.1", "C617.1"],
    NSPrivacyAccessedAPICategoryDiskSpace: ["E174.1", "85F4.1"],
    NSPrivacyAccessedAPICategorySystemBootTime: ["35F9.1"]
  }
);

console.info("Release privacy configuration checks passed.");
