# App Store Privacy Answers — Draft

> **Status: DRAFT — OWNER ACTION REQUIRED.** This document is a code-derived preparation aid, not an approved App Store Connect submission or legal statement. The owner must confirm the production providers, final retention policy, backup behavior, and every answer in App Store Connect before submission.

## Release facts verified from the repository

- The iOS app uses account email authentication and a server-assigned user ID.
- Trainers can store client names, phone numbers, Telegram handles, age, gender, body measurements, health constraints, exercise restrictions, activity, sleep, goals, notes, workouts, schedules, sets, results, durations, weights, repetitions, and distances.
- Owner-scoped domain snapshots are stored locally. Access and refresh tokens are stored separately in SecureStore.
- Interrupted account deletion uses a PII-free local operation marker plus a device-only SecureStore recovery proof. The server stores only a domain-separated proof HMAC, random operation UUID, and short-lived timestamps; it stores neither the raw proof nor account identity in the receipt.
- The backend stores account, client, workout, result, authentication, security, and administrative audit records in PostgreSQL and backups.
- Authentication email and one-time codes are transferred to the configured email delivery provider. The code supports SMTP and Resend; the active production provider is not verified.
- The backend stores linked security metadata including hashed IP addresses and user-agent strings.
- No advertising SDK, analytics SDK, crash-reporting SDK, ATT prompt, or cross-app tracking behavior was found in the current release code.

## Proposed App Store Connect disclosures

These are technical mappings from current code. They are not final until the owner confirms them in App Store Connect.

| App Store category | Collected data | Linked to identity | Tracking | Purpose | Evidence summary |
| --- | --- | --- | --- | --- | --- |
| Contact Info → Name | Trainer display name when provided; client names | Yes | No | App Functionality | Account/client records |
| Contact Info → Email Address | Account email; API-supported client email | Yes | No | App Functionality | Authentication and client records |
| Contact Info → Phone Number | Optional client phone | Yes | No | App Functionality | Client management |
| Contact Info → Other User Contact Info | Optional Telegram handle | Yes | No | App Functionality | Client management |
| Identifiers → User ID | Account, owner, client, workout and session identifiers | Yes | No | App Functionality | Ownership and synchronization |
| Health & Fitness → Health | Age, gender, height, weight, target weight, health constraints and restrictions | Yes | No | App Functionality | Coaching intake and safety context |
| Health & Fitness → Fitness | Activity, sports, workouts, exercises, schedules, sets and results | Yes | No | App Functionality | Core training workflow |
| User Content → Other User Content | Goals, locations, descriptions, coach/client notes and free-form restrictions | Yes | No | App Functionality | Core training workflow |
| Other Data → Other Data Types | Age/gender fields and linked security metadata such as hashed IP and user-agent | Yes | No | App Functionality | Account security and domain records |

## Data not evidenced for this release

Do not declare these solely because a library or dormant backend capability mentions them:

- advertising or cross-app tracking;
- precise or coarse device location;
- contacts/address-book access;
- photos, videos, audio, camera, or microphone data;
- payment or financial information;
- a mobile device identifier: the backend accepts an optional `x-device-id`, but the current mobile client does not send it;
- crash, performance, or other diagnostic data sent to a developer-controlled provider.

If any production SDK, provider, logging pipeline, or runtime behavior changes, repeat the inventory before submission.

## Third-party and operations confirmation

- **OWNER ACTION:** Confirm the production email provider and its data-processing terms.
- **OWNER ACTION:** Confirm the PostgreSQL/VPS host, backup storage providers, geographic regions, and subprocessors.
- **OWNER ACTION:** Confirm whether reverse-proxy, platform, or infrastructure logs retain raw IP addresses or request metadata beyond the application records described above.
- **OWNER ACTION:** Confirm that Yandex/VK authentication remains disabled. If enabled, add their profile data and provider transfers to this inventory.
- **OWNER ACTION:** Confirm whether a crash/observability vendor will be enabled. If enabled, update the manifest, App Store answers, and policy before release.

## Tracking answer

Code evidence supports `Tracking: No` for the current release. `NSPrivacyTracking` remains `false`, and no tracking domains are declared.

- **OWNER ACTION:** Confirm that no production SDK, website integration, or data broker combines app data with third-party data for advertising or tracking.

## Required final App Store Connect work

- **OWNER ACTION:** Review and submit every data-type answer in App Store Connect → App Privacy.
- **OWNER ACTION:** Publish the final privacy policy at the HTTPS URL configured as `EXPO_PUBLIC_PRIVACY_POLICY_URL`.
- **OWNER ACTION:** Publish a working support destination at the HTTPS URL configured as `EXPO_PUBLIC_SUPPORT_URL`.
- **OWNER ACTION:** Confirm account deletion, retention, backup reconciliation, and legal-basis wording against the approved policy.
- **OWNER ACTION:** Record the review date, reviewer, and App Store Connect submission revision here before release.

Final review record: **OWNER ACTION — not yet approved**.

## Release URL configuration

Production builds must provide nonempty HTTPS values for `EXPO_PUBLIC_PRIVACY_POLICY_URL` and `EXPO_PUBLIC_SUPPORT_URL`. URLs containing credentials, query parameters, or fragments are rejected to prevent token-bearing destinations from becoming public opening targets or error output.

For local development, the app configuration falls back to the same public release documents:

- `https://api.trener-app.com/privacy`
- `https://api.trener-app.com/support`

Development overrides are also HTTPS-only so loopback or staging documentation URLs cannot enter a release archive.
