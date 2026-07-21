# Bug Reproducer

## ✅ FIX_PROVEN — Bug reproduced and fix proven

> All five focused regressions now pass with the same commands, and the complete project test suite, TypeScript check, and design audit are green.

**Project:** Expo React Native trainer app
**Bug:** Active workout state and persistence regressions
**Environment:** macOS, Node.js 22.22.2, Vitest 4.1.9, authenticated remote DataProvider path
**Generated:** 2026-07-17

## Discovery scope

- Active workout screen and Approach component state transitions
- Local DataProvider result actions and remote snapshot mapping
- Authenticated workout-results API and replacement persistence semantics
- Dashboard workout progress calculation
- Exercise note and set deletion persistence

## Ranked and tested candidates

| # | Candidate | Contract evidence | Trigger | Location | Confidence | Outcome |
|---:|---|---|---|---|---|---|
| 1 | Overlapping set saves can change an earlier set | A checkbox action targets one set ID and must not change another set. | A newer set update reaches the server before a stale full-snapshot save for another set. | /Users/gpbu7557/Documents/New project/src/data/DataProvider.tsx:306; /Users/gpbu7557/Documents/New project/server/src/data/PrismaTrainerDataRepository.ts:378 | high | FIX_PROVEN |
| 2 | Added or unlogged sets disappear on resume | Visible planned and added sets must remain present after returning through Continue. | Two planned sets plus a saved third set, with no result for planned set #2. | /Users/gpbu7557/Documents/New project/src/data/remote/bootstrap.ts:102; /Users/gpbu7557/Documents/New project/app/sessions/[sessionId]/index.tsx:86 | high | FIX_PROVEN |
| 3 | Dashboard marks an exercise complete before all planned sets are complete | An exercise is complete only when all of its required sets are complete. | One completed result exists for an exercise with three planned sets. | /Users/gpbu7557/Documents/New project/app/(tabs)/index.tsx:172 | high | FIX_PROVEN |
| 4 | Deleted set results return after remote reload | Deleting a set must persist across reload and synchronization. | Call results.remove in authenticated remote mode, then reload remote results. | /Users/gpbu7557/Documents/New project/src/data/DataProvider.tsx:1240 | high | FIX_PROVEN |
| 5 | Saved exercise notes are not persisted | The Save action must preserve the note after leaving and reopening the session. | Save a changed note and reopen the active workout. | /Users/gpbu7557/Documents/New project/app/sessions/[sessionId]/index.tsx:271 | high | FIX_PROVEN |

## Original report

Пользователь сообщил, что после добавления подхода нажатие чекбокса затрагивает предыдущие подходы, а добавленный подход пропадает после выхода и нажатия «Продолжить». Дополнительно запрошен аудит связанных с тренировкой дефектов.

| Contract | Expected | Actual |
|---|---|---|
| Observed behavior | Each set action changes only its target; all visible sets, correct progress, deletions, and saved notes survive navigation and remote synchronization. | Stale snapshots overwrite other set state, missing-result gaps disappear, progress is overstated, deleted results return, and saved notes revert. |

## Minimal reproduction

Focused fixtures execute the current production mapping, dashboard calculation, DataProvider remove method, note callback, and real in-memory server API. Each assertion isolates one reported or adjacent workflow invariant.

**Confirming signal:** All five cases failed on their intended behavioral assertions with exit code 1; no setup, import, syntax, timeout, or dependency failure occurred.

### Reproduction files approved at Gate 1

- [test-training-session-resume.ts](</Users/gpbu7557/Documents/New project/scripts/test-training-session-resume.ts:1>) — Proves the missing set gap after remote resume.
- [data.test.ts](</Users/gpbu7557/Documents/New project/server/test/data.test.ts:394>) — Proves stale full-snapshot result writes overwrite another set.
- [test-training-dashboard-progress.ts](</Users/gpbu7557/Documents/New project/scripts/test-training-dashboard-progress.ts:1>) — Executes the production dashboard progress function.
- [test-training-screen-actions.test.tsx](</Users/gpbu7557/Documents/New project/scripts/test-training-screen-actions.test.tsx:1>) — Executes the production result removal and note callbacks.
- [vitest.training.config.ts](</Users/gpbu7557/Documents/New project/scripts/vitest.training.config.ts:1>) — Node-only Vitest configuration for the action harness.

## Red to green evidence

| Evidence | Before fix | After fix |
|---|---:|---:|
| Exit code | 1 | 0 |
| Timed out | False | False |
| Duration | 5,200 ms | 2,900 ms |
| Same command | — | True |
| Broader suite | — | passed |

### Before — failing evidence

```text
REPRODUCED 1: resume restored set orders [1, 3], expected [1, 2, 3].
REPRODUCED 2: an overlapping stale save restored set #1 to completed=true, expected false.
REPRODUCED 3: dashboard progress returned completedExercises=1, expected 0 while only one of three planned sets had a result.
REPRODUCED 4: results.remove cleared local state but the remote result remained and returned on reload.
REPRODUCED 5: handleNoteChange updated screen state to 'Новая заметка', but reopening restored persisted value 'Старая заметка'.
```

### After — fixed evidence

```text
FIX_PROVEN 1: resume restored the full contiguous set range [1, 2, 3].
FIX_PROVEN 2: serialized saves preserved set #1 as completed=false while saving set #3 independently.
FIX_PROVEN 3: dashboard progress kept the exercise incomplete until all three planned sets are complete.
FIX_PROVEN 4: results.remove deleted the remote result so reload returned no deleted set.
FIX_PROVEN 5: the updated exercise note survived persistence and reopen.
Broader checks: npm run typecheck passed; npm run design:audit passed with 0 errors and 0 warnings; npm test passed 21 API tests plus unit and integration suites.
```

## Root cause

Per-set changes are serialized as replace-all result snapshots without revision ordering; remote mapping reconstructs rows only from existing results and ignores gaps implied by plannedSets; dashboard completion checks only persisted results; result removal has no remote mutation; note saving updates only component state.

## Approved fix

Serialized remote writes per session; rebuilt remote workouts from the complete planned/result set range; persisted blank added sets, planned set counts, deletions, reindexing, and notes; and based dashboard completion on every required set.

**Why this is causal:** The same five production-path reproducers that failed before the changes now pass, while the broader project suites remain green. Each fix removes the exact state-loss or stale-snapshot condition isolated by its reproducer.

### Production files approved at Gate 2

- [sessionResultWriteQueue.ts](</Users/gpbu7557/Documents/New project/src/data/remote/sessionResultWriteQueue.ts:1>) — Serializes remote writes for each active session.
- [DataProvider.tsx](</Users/gpbu7557/Documents/New project/src/data/DataProvider.tsx:1179>) — Persists session exercise metadata, queues result snapshots, and remotely deletes/reindexes sets.
- [bootstrap.ts](</Users/gpbu7557/Documents/New project/src/data/remote/bootstrap.ts:107>) — Materializes every set through the maximum planned or recorded index.
- [index.tsx](</Users/gpbu7557/Documents/New project/app/sessions/[sessionId]/index.tsx:284>) — Persists notes, blank added sets, deletion, and planned set counts from the active screen.
- [index.tsx](</Users/gpbu7557/Documents/New project/app/(tabs)/index.tsx:172>) — Requires every planned set to be complete before counting an exercise complete.
- [types.ts](</Users/gpbu7557/Documents/New project/src/data/types.ts:75>) — Allows session exercise metadata to be persisted through session updates.

## Verification

| Check | Status | Evidence |
|---|---|---|
| Existing session merge baseline | ✅ passed | Existing session exercise merge tests passed before adding regressions. |
| Existing server data baseline | ✅ passed | The original five server data tests passed before adding the focused race reproducer. |
| Resume regression | ✅ passed | Restored contiguous set orders [1, 2, 3]. |
| Overlapping save regression | ✅ passed | Serialized overlapping operations preserved set #1=false and set #3=true. |
| Dashboard progress regression | ✅ passed | Exercise remained incomplete with only one of three planned sets complete. |
| Remote deletion regression | ✅ passed | Deleted result was absent from remote persistence after reload. |
| Exercise note regression | ✅ passed | Reopening restored the newly saved note. |
| TypeScript | ✅ passed | npm run typecheck completed successfully. |
| Design audit | ✅ passed | npm run design:audit reported 0 errors and 0 warnings. |
| Full project suite | ✅ passed | npm test passed unit, integration, and all 21 API tests. |

## Reproduce

```bash
./node_modules/.bin/tsx scripts/test-training-session-resume.ts
```
```bash
./node_modules/.bin/vitest run server/test/data.test.ts -t "preserves independent set state across overlapping saves"
```
```bash
./node_modules/.bin/tsx scripts/test-training-dashboard-progress.ts
```
```bash
./node_modules/.bin/vitest run --config scripts/vitest.training.config.ts scripts/test-training-screen-actions.test.tsx
```

## Limitations

- The audit covers the active authenticated workout lifecycle, not every planning, history, or administrative screen.
- The overlapping-save timing is deterministic in the API harness; a manual real-device pass was not performed in this turn.

## Residual risks

- The per-session queue intentionally adds network latency when many edits are made rapidly.
- Server-side revision control would provide additional protection for writes originating from multiple devices.

## Notes

- Both Bug Reproducer gates were explicitly approved before production changes.
- No dependencies, migrations, configuration, or remote user data were changed.

---

Generated by `$bug-reproducer`. A fix is proven only by the same red-to-green reproducer plus relevant broader checks.
