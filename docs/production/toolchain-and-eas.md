# iOS release toolchain and EAS policy

## Reproducible toolchain

- Node.js: `20.19.4` (`.nvmrc`, package engines, and EAS production profile).
- npm: `10.9.3` (`packageManager`; bundled on the selected EAS image).
- EAS CLI: exactly `16.18.0` in `eas.json` and npm scripts.
- CocoaPods: `1.16.2` locally and in the EAS production profile.
- EAS iOS image: `macos-sequoia-15.6-xcode-26.0`, the full image behind the Expo SDK 54 image family at the time this release candidate was prepared.
- Local verification baseline: Xcode `26.5`; the committed deployment target remains iOS `15.1`.
- iOS builds React Native from source (`ios.buildReactNativeFromSource=true`). This avoids the confirmed Debug linker mismatch between the SDK 54 precompiled React binary and the local Xcode toolchain, at the cost of a longer native build.

The repository commits and maintains native iOS files directly, so Expo Doctor's app-config/native-sync check is explicitly disabled in `package.json`; native parity is instead enforced by `scripts/test-release-native-config.ts`. All other Expo Doctor checks remain enabled.

Update these pins together after validating `npm ci`, Expo Doctor, the production export, and an unsigned Release build. Do not update only the EAS image or only Node/npm.

## Version strategy

- User-facing version is `1.0.0` in `app.json` and both Xcode configurations.
- `Info.plist` resolves `CFBundleShortVersionString` from `MARKETING_VERSION` and `CFBundleVersion` from `CURRENT_PROJECT_VERSION`.
- The committed seed build number is `1`.
- EAS uses the recommended remote build-number source and increments it for production builds. The first project-link operation must initialize the remote value from the last App Store/TestFlight build, not assume the committed seed is unused.

## Required production EAS environment

The profile commits only non-secret release flags and the verified API origin. Configure these EAS production-environment values before resolving or building the profile:

- `EXPO_PUBLIC_PRIVACY_POLICY_URL`: final public HTTPS privacy-policy URL.
- `EXPO_PUBLIC_SUPPORT_URL`: final public HTTPS support URL.

The `release-simulator` profile extends the production profile, disables
build-number auto-increment, and sets `ios.simulator=true`. It is the release
artifact used for no-Metro Simulator validation and never requires Apple
credentials. It must not be submitted or treated as an App Store archive.

Do not place Apple credentials, signing material, API tokens, SMTP credentials, or private keys in `eas.json`. EAS project owner/project ID, Apple team, App Store Connect app, and remote build number remain owner-controlled setup.

## Read-only validation after project linkage

```bash
npx eas-cli@16.18.0 whoami
npx eas-cli@16.18.0 project:info
npx eas-cli@16.18.0 config --platform ios --profile production --json --non-interactive
npx eas-cli@16.18.0 build:version:get --platform ios --profile production
```

Do not run `eas init`, a remote build, or submit until the existing bundle identifier and project ownership have been explicitly confirmed.
