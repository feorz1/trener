# iOS development build through the local proxy

Use this runbook when the iOS Simulator must run the real `Trener` development
client and send production API traffic through the machine proxy.

## Failure pattern

The two previously installed app icons were embedded builds. They contained a
prepackaged `main.jsbundle`, but not the Expo development launcher. Starting an
icon or opening a Metro URL therefore kept running the embedded JavaScript:

- Metro did not receive a bundle request;
- `EXPO_PUBLIC_API_BASE_URL` from the Metro process never reached the app;
- auth failed with the generic network error;
- the two old apps also shared a development URL scheme, which made targeting
  one of them ambiguous.

Setting `HTTP_PROXY` or `HTTPS_PROXY` on the app process does not configure
iOS `URLSession`, so it does not fix this failure.

## Proven launch order

1. Confirm that the machine proxy is listening on `127.0.0.1:10808`.
2. Start a local HTTP reverse proxy on `127.0.0.1:3000`. It must forward to
   `https://api.trener-app.com` through `127.0.0.1:10808` and log request paths
   and response statuses. The reusable proxy command is kept in the
   `trainer-dev-build` skill.
3. Verify the local API path before launching the app:

   ```bash
   curl -fsS http://127.0.0.1:3000/health
   curl -fsS http://127.0.0.1:3000/auth/providers
   ```

   `/health` must return `ok: true`; `/auth/providers` must report
   `email: true`.
4. Start Metro from the repository root and keep it running:

   ```bash
   EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000 \
   STORYBOOK_ENABLED=false \
   EXPO_PUBLIC_STORYBOOK_ENABLED=false \
   npx expo start --dev-client --clear
   ```

5. Build and install a real native Debug development client. Prefer
   XcodeBuildMCP with these settings:

   | Setting | Value |
   | --- | --- |
   | Workspace | `ios/TrainerFoundation.xcworkspace` |
   | Scheme | `TrainerFoundation` |
   | Configuration | `Debug` |
   | Bundle ID | `com.trenerapp.trener` |
   | Simulator | the currently booted iOS Simulator |

   Required tool sequence:

   1. `session_show_defaults`
   2. `discover_projs` only if the workspace is missing or wrong
   3. `list_schemes`
   4. `session_set_defaults`
   5. `session_show_defaults`
   6. `build_run_sim`

6. The first native build can exceed the five-minute tool timeout while Xcode
   continues compiling. If the next build reports a locked `build.db`, do not
   delete DerivedData and do not start more builds. Wait for the original log
   to stop changing, confirm `** BUILD SUCCEEDED **`, then run `build_run_sim`
   again. The warm build installs and launches quickly.
7. A correct launch opens the Expo screen named `Trener` with
   `Development Build` and a server such as `http://localhost:8081`. Select that
   server. If the app opens its product UI immediately and Metro shows no bundle
   request, an embedded build is still running.

## Passing checks

Do not report success until all applicable checks pass:

- Xcode reports `Build succeeded`, installs, and launches
  `com.trenerapp.trener`;
- Metro reports an iOS bundle completed;
- the reverse proxy logs `GET /auth/providers` with `200`;
- email login logs `POST /auth/email/start` and
  `POST /auth/email/verify` with `200`;
- the authenticated app logs `GET /sync/bootstrap` with `200` and shows the
  main `Trener` tabs.

The workflow above was verified on 2026-08-07 with all of these checks passing.

## Dead ends to avoid

- Do not use `--tunnel` when the Simulator cannot fetch the generated
  `exp.direct` URL.
- Do not rely on `HTTP_PROXY`/`HTTPS_PROXY` app environment variables for
  `URLSession` traffic.
- Do not open the Metro development URL against an embedded app and assume it
  loaded the Metro bundle; confirm the Expo development launcher and Metro log.
- Do not remove the legacy app merely to resolve the shared URL scheme unless
  the user explicitly asks. Target the canonical bundle ID instead.
- Never copy production mail-provider secrets or one-time login codes into
  this repository or a skill.
