import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import plist from "@expo/plist";

const root = new URL("../", import.meta.url);
const appConfig = JSON.parse(readFileSync(new URL("app.json", root), "utf8")) as {
  expo: {
    name: string;
    version: string;
    icon: string;
    orientation: string;
    scheme: string;
    ios: {
      supportsTablet: boolean;
      bundleIdentifier: string;
      buildNumber: string;
      infoPlist: Record<string, unknown>;
    };
  };
};
const easConfig = JSON.parse(readFileSync(new URL("eas.json", root), "utf8")) as Record<string, any>;
const packageJson = JSON.parse(readFileSync(new URL("package.json", root), "utf8")) as Record<string, any>;
const nativeInfo = plist.parse(readFileSync(new URL("ios/TrainerFoundation/Info.plist", root), "utf8")) as Record<string, unknown>;
const project = readFileSync(new URL("ios/TrainerFoundation.xcodeproj/project.pbxproj", root), "utf8");
const podfileProperties = JSON.parse(readFileSync(new URL("ios/Podfile.properties.json", root), "utf8")) as Record<string, string>;
const podfile = readFileSync(new URL("ios/Podfile", root), "utf8");
const reactNativePatch = readFileSync(new URL("patches/react-native+0.81.5.patch", root), "utf8");
const expoConstantsPatch = readFileSync(new URL("patches/expo-constants+18.0.13.patch", root), "utf8");
const storyboard = readFileSync(new URL("ios/TrainerFoundation/SplashScreen.storyboard", root), "utf8");
const indexSource = readFileSync(new URL("index.js", root), "utf8");
const runtimeEntrySource = readFileSync(new URL("src/runtime-entry.js", root), "utf8");
const metroConfigSource = readFileSync(new URL("metro.config.js", root), "utf8");
const splashContents = JSON.parse(
  readFileSync(new URL("ios/TrainerFoundation/Images.xcassets/SplashScreenLogo.imageset/Contents.json", root), "utf8")
) as { images: Array<{ filename?: string; scale?: string }> };
const easIgnore = readFileSync(new URL(".easignore", root), "utf8");

assert.equal(appConfig.expo.name, "Trener");
assert.equal(appConfig.expo.version, "1.0.0");
assert.equal(appConfig.expo.ios.buildNumber, "1");
assert.equal(appConfig.expo.orientation, "default");
assert.equal(appConfig.expo.ios.supportsTablet, true);
assert.equal(appConfig.expo.ios.bundleIdentifier, "com.trenerapp.trener");
assert.equal(appConfig.expo.scheme, "trainer");
assert.equal(nativeInfo.CFBundleDisplayName, appConfig.expo.name);
assert.equal(nativeInfo.CFBundleShortVersionString, "$(MARKETING_VERSION)");
assert.equal(nativeInfo.CFBundleVersion, "$(CURRENT_PROJECT_VERSION)");
assert.equal(nativeInfo.ITSAppUsesNonExemptEncryption, false);
assert.equal((nativeInfo.NSAppTransportSecurity as Record<string, unknown>).NSAllowsLocalNetworking, undefined);

const iphoneOrientations = appConfig.expo.ios.infoPlist.UISupportedInterfaceOrientations;
const ipadOrientations = appConfig.expo.ios.infoPlist["UISupportedInterfaceOrientations~ipad"];
assert.deepEqual(nativeInfo.UISupportedInterfaceOrientations, iphoneOrientations);
assert.deepEqual(nativeInfo["UISupportedInterfaceOrientations~ipad"], ipadOrientations);
assert.equal(nativeInfo.UIRequiresFullScreen, false);
assert.match(project, /TARGETED_DEVICE_FAMILY = "1,2";/);
assert.equal((project.match(/MARKETING_VERSION = 1\.0\.0;/g) ?? []).length, 2);
assert.equal((project.match(/CURRENT_PROJECT_VERSION = 1;/g) ?? []).length, 2);
assert.equal((project.match(/PRODUCT_BUNDLE_IDENTIFIER = com\.trenerapp\.trener;/g) ?? []).length, 2);
assert.doesNotMatch(project, /com\.anonymous\.trainerfoundation/);
assert.ok((project.match(/IPHONEOS_DEPLOYMENT_TARGET = 15\.1;/g) ?? []).length >= 2);

const icon = readFileSync(new URL(appConfig.expo.icon.replace(/^\.\//, ""), root));
assert.equal(icon.readUInt32BE(16), 1024);
assert.equal(icon.readUInt32BE(20), 1024);
assert.ok(icon.readUInt8(25) === 0 || icon.readUInt8(25) === 2, "App icon PNG must not have an alpha channel");
assert.notEqual(
  createHash("sha256").update(icon).digest("hex"),
  "303cb263686a2441faa06905f5a34bd73fbc1381e0cb57eeb3d2681ca75f43e0",
  "App icon must not be the blank white placeholder"
);
assert.match(storyboard, /image="SplashScreenLogo"/);
assert.match(storyboard, /id="EXPO-SplashScreen"/);
assert.match(storyboard, /name="SplashScreenBackground"/);
assert.deepEqual(splashContents.images.map((image) => image.scale), ["1x", "2x", "3x"]);
assert.ok(splashContents.images.every((image) => image.filename?.endsWith(".png")));

assert.equal(easConfig.cli.version, "16.18.0");
assert.equal(easConfig.cli.requireCommit, true);
assert.equal(easConfig.cli.appVersionSource, "remote");
assert.equal(easConfig.build.production.distribution, "store");
assert.equal(easConfig.build.production.environment, "production");
assert.equal(easConfig.build.production.node, "20.19.4");
assert.equal(easConfig.build.production.ios.image, "macos-sequoia-15.6-xcode-26.0");
assert.equal(easConfig.build.production.ios.cocoapods, "1.16.2");
assert.equal(easConfig.build.production.ios.buildConfiguration, "Release");
assert.equal(easConfig.build.production.env.EXPO_PUBLIC_API_BASE_URL, "https://api.trener-app.com");
assert.equal(easConfig.build.production.env.EXPO_PUBLIC_PRIVACY_POLICY_URL, "https://api.trener-app.com/privacy");
assert.equal(easConfig.build.production.env.EXPO_PUBLIC_SUPPORT_URL, "https://api.trener-app.com/support");
assert.equal(easConfig.build["release-simulator"].extends, "production");
assert.equal(easConfig.build["release-simulator"].autoIncrement, false);
assert.equal(easConfig.build["release-simulator"].ios.simulator, true);
assert.equal(readFileSync(new URL(".nvmrc", root), "utf8").trim(), "20.19.4");
assert.equal(packageJson.packageManager, "npm@10.9.3");
assert.equal(packageJson.engines.node, ">=20.19.4 <21");
assert.equal(packageJson.expo.doctor.appConfigFieldsNotSyncedCheck.enabled, false);
assert.equal(podfileProperties["ios.buildReactNativeFromSource"], "true");
assert.match(podfile, /target\.name == 'fmt'/);
assert.match(podfile, /FMT_USE_CONSTEVAL=0/);
assert.match(podfile, /#ifndef FMT_USE_CONSTEVAL/);
assert.match(packageJson.scripts.postinstall, /patch-package/);
assert.match(reactNativePatch, /IO\.popen\(\["find", projectFolderPath, "-name", "Info\.plist"\]/);
assert.match(expoConstantsPatch, /PROJECT_DIR_BASENAME=\$\(basename \"\$PROJECT_DIR\"\)/);
assert.equal(indexSource.trim(), "require(\"./src/runtime-entry\");");
assert.match(runtimeEntrySource, /require\("expo-router\/entry"\)/);
assert.doesNotMatch(runtimeEntrySource, /storybook/i);
assert.match(metroConfigSource, /if \(storybookEnabled \|\| production\)/);
assert.match(metroConfigSource, /src\/storybook\/runtime-entry\.js/);
assert.match(metroConfigSource, /src\/auth\/api\/authApi\.production\.ts/);

for (const ignored of ["node_modules/", "ios/build/", ".env.*", "*.p8", "server/", "admin/", "reports/"]) {
  assert.match(easIgnore, new RegExp(ignored.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
for (const required of ["ios/", "assets/", "patches/", "package-lock.json", "app.json", "index.js"]) {
  assert.doesNotMatch(easIgnore, new RegExp(`^${required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
}

console.info("Native release configuration checks passed.");
