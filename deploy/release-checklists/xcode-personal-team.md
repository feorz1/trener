# Xcode Personal Team physical-iPhone checklist

This checklist is for a local physical-device smoke test without paid Apple
Developer Program membership. It is not App Store signing and must not alter
the approved production Bundle ID in tracked files.

## Before the Apple Account step

- [ ] Use Xcode 26.5 (or the currently approved release Xcode) and Node
  20.19.4.
- [ ] Open `ios/TrainerFoundation.xcworkspace`, not the `.xcodeproj`.
- [ ] Confirm tracked identity: name `Trener`, version `1.0.0`, Bundle ID
  `com.trenerapp.trener`.
- [ ] Record `git status --short` so signing-only Xcode changes can be detected
  and left uncommitted.
- [ ] Stop Metro and any Storybook process.
- [ ] Connect, unlock, and trust the iPhone; enable Developer Mode if iOS asks.

## Personal Team setup — perform only during the future device check

- [ ] In Xcode Settings → Accounts, add the tester's personal Apple Account.
- [ ] In target `TrainerFoundation` → Signing & Capabilities, keep automatic
  signing and select the Personal Team.
- [ ] Treat any existing `DEVELOPMENT_TEAM` value in the project as unverified
  until Xcode shows that it belongs to the selected Personal Team. Never reuse
  it as the future production Apple Developer Program Team ID.
- [ ] First try the approved `com.trenerapp.trener` identifier.
- [ ] If Personal Team cannot register that identifier, use a temporary local
  command-line/build-setting override for the device build only. Do not edit or
  commit `app.json`, `eas.json`, or `project.pbxproj`; the production Bundle ID
  remains `com.trenerapp.trener`.

## Release/no-Metro build

- [ ] Build the `TrainerFoundation` target with the Release configuration. The
  shared scheme currently uses Debug for Run, so either make a temporary,
  uncommitted scheme choice or invoke an explicit Release build.
- [ ] Provide the approved public build environment:
  `NODE_ENV=production`, API `https://api.trener-app.com`, privacy
  `https://api.trener-app.com/privacy`, support
  `https://api.trener-app.com/support`, Storybook/mock/social flags `false`,
  email auth `true`.
- [ ] Confirm `patch-package` ran during dependency installation.
- [ ] Install the resulting signed development app through Xcode.
- [ ] Quit Xcode/Metro, disconnect the Mac if practical, then cold-launch the
  app from its home-screen icon.

## Physical-device smoke

- [ ] Icon and splash are correct; no blank/white launch screen.
- [ ] App starts without Metro or a development-client launcher.
- [ ] Production email login and OTP flow work.
- [ ] Create/edit a synthetic client, plan a workout, record sets, complete it,
  and verify history.
- [ ] Kill and relaunch; session and server-synchronized data recover.
- [ ] Privacy and Support links open their public HTTPS pages.
- [ ] Light/dark appearance works and no Storybook/debug/mock/social UI appears.
- [ ] Check logout; check account deletion last on a disposable test account.

## Evidence and cleanup

- [ ] Record device model, iOS version, Xcode version, selected team type,
  effective local Bundle ID, release SHA, and pass/fail notes.
- [ ] Confirm the production Bundle ID in tracked files is unchanged.
- [ ] Leave all Personal Team signing/provisioning edits uncommitted.
- [ ] Remove the test app/profile from the device when testing is complete if
  local policy requires it.

Apple's current device workflow is documented at:
https://developer.apple.com/documentation/Xcode/running-your-app-on-simulated-or-physical-devices
