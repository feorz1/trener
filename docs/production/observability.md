# Runtime observability contract

The app exposes a provider-neutral `AppErrorReporter` interface. Root render failures and startup data failures emit structured, sanitized events containing only category, stable code, error kind, fatality, time, release/build metadata, and an allowlisted operational context.

The contract excludes raw error messages, stacks, request/response bodies, email, phone, names, client profiles, health/fitness details, notes, tokens, authorization values, and cookies. Unknown attribute keys are dropped. Reporter failures are swallowed so telemetry cannot create a second app failure.

No production crash vendor is configured. Before enabling one, the owner must:

1. select the provider and data-processing region;
2. approve its DPA, retention, user-access, and deletion behavior;
3. implement an `AppErrorReporter` adapter that receives only `SanitizedAppErrorEvent`;
4. configure source-map upload using CI/EAS secrets, never public Expo variables;
5. verify release/build matching and a deliberate non-PII test crash;
6. update the privacy manifest, App Store privacy answers, policy, and subprocessors inventory if the provider receives diagnostics or identifiers;
7. configure alert thresholds and an on-call destination.

Until those actions are complete, provider delivery and source-map symbolication are `NOT VERIFIED`; the local recovery UI and safe reporting boundary remain active.
