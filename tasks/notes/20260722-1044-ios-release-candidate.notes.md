# iOS release candidate — execution notes

## 2026-08-06 pre-signing release goal

- Apple Developer Program Team is unavailable and is not a blocker for the
  non-signing release scope.
- Forbidden during this goal: Apple credentials, signed store build, submit,
  App Store Connect creation, TestFlight, Apple login, and MFA.
- Approved immutable release identity: `Trener` `1.0.0`, Bundle ID
  `com.trenerapp.trener`.
- Expo/EAS linkage is `@feorz/trainer-foundation`, project ID
  `d5a30ca4-d99b-4648-9e50-5f201b61ac99`.
- EAS production public environment variables were synchronized without
  reading or printing secret values. The `release-simulator` profile inherits
  production and sets `ios.simulator=true`, `autoIncrement=false`.
- Local release gates pass on Node 20.19.4/npm 10.9.3, including `npm run
  check`, Expo Doctor 16/16, Expo dependency alignment, ops safety tests, and
  high-severity production dependency audit. Non-breaking transitive security
  updates and a PostCSS 8.5.26 override avoid the breaking Expo 57 upgrade.
- Production API `/health` and `/ready` return 200, but `/privacy` and
  `/support` return 404, proving the current release candidate is not yet
  deployed.
- Local deployment preflight tests pass. Production compose validation,
  backup/restore proof, and rollout require restored SSH access to the VPS; the
  configured `deploy` key is currently rejected. Request exactly one deploy
  confirmation immediately before the first production mutation.
- `support@trener-app.com` is referenced by the product, but inbound mailbox
  existence is not yet proven. The domain has no explicit MX answer; TCP mail
  ports accept connections but did not provide a usable SMTP recipient probe.
  Require provider/inbox evidence or a delivery/reply test before release
  completion.
- App Store metadata and the Xcode Personal Team physical-device checklist are
  tracked under `deploy/submissions/` and `deploy/release-checklists/`.
- Claude cross-model review was unavailable because the Claude Code CLI is not
  installed; do not represent this as an external-review pass.
