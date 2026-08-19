# Data Sync

Backend and PostgreSQL are the source of truth for trainer product data:

- clients;
- exercises;
- workout templates;
- workout sessions;
- workout set results.

Mobile keeps a local cache only for the currently authenticated `auth.user.id`.

## User Scope

Every trainer-owned backend row stores `trainer_id`, which references `users.id`.

The mobile app never sends `trainerId` as authority. Backend routes read the trainer id from the bearer access token and use it in every query or mutation.

System exercises have `is_system=true` and `trainer_id=null`. They are readable by all trainers but cannot be edited by a normal trainer.

## System Exercise Library

The production system exercise library is seeded from the local built-in catalog:

```txt
src/data/mockExercises.ts
src/data/exerciseCatalog.ts
```

Backend rows use:

```txt
is_system=true
trainer_id=null
system_key=local:<catalog exercise id>
```

`system_key` is the stable idempotency key for repeated seed runs. The backend UUID `id` stays database-owned because local catalog ids are slugs, not UUIDs.

Run the seed after Prisma migrations:

```bash
npm run api:seed:exercises
```

In Docker/VPS production:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api npm run api:seed:exercises
```

Expected count is at least 200 system exercises. Verify with PostgreSQL:

```sql
select count(*) from exercises where is_system = true and deleted_at is null;
select count(*) from exercises where trainer_id is not null and deleted_at is null;
```

`GET /exercises` and `GET /sync/bootstrap` return system exercises plus the current trainer's custom exercises. They do not return custom exercises owned by another trainer. Normal trainer API calls cannot patch or delete system exercises.

## Bootstrap

After auth resolves to an authenticated user, the root app shell mounts `DataProvider` with:

- `currentOwnerId = auth.user.id`;
- a user-specific local persistence key;
- a `/sync/bootstrap` loader using refresh-aware authorized fetch;
- a typed `dataApi` that uses the same authorized fetch for all mutations.

The bootstrap response replaces the local cache for that user and is saved to AsyncStorage.

Client questionnaire data is stored in `clients.profile` as JSONB. The profile contains contact extensions (`telegram`), gender, goal, restrictions, measurements, and the complete onboarding intake. `PATCH /clients/:id` deep-merges the nested `metrics` and `intake` objects, so updating one answer does not erase the others. Omitted fields are preserved; an explicitly sent empty string clears a text answer. Legacy clients without a profile continue to bootstrap with the existing mobile fallbacks.

Planned backend workout sessions are mapped to local `Workout` records only. `in_progress`, `completed`, and `cancelled` backend sessions also create local `WorkoutSession` and result records. This prevents a scheduled workout from looking like an already active session after app restart.

## Local Cache

AsyncStorage keys are partitioned by owner:

```txt
trainer-app:<auth.user.id>:data:v2
```

The legacy unscoped key is only read for the local development owner. A real authenticated user does not read old unscoped data, so data from an older local-only app state is not silently shown to every account.

## Logout

Logout clears auth tokens. The root shell then remounts `DataProvider` under `__unauthenticated__`, making the previous user's cache inaccessible to screens. Logging in as another user mounts a different cache key and triggers a fresh backend bootstrap.

## Current Sync Mode

The implemented mobile path is online-first with a user-scoped cache:

1. authenticate;
2. fetch `/me`;
3. mount user-scoped data layer;
4. load local cache for that user;
5. fetch `/sync/bootstrap`;
6. replace and save local cache;
7. send production mutations to backend first;
8. update cache only after a successful backend response.

If a mutation fails, the local cache is not updated as if the mutation succeeded. The UI receives a normalized Russian error such as “Проверьте данные и попробуйте ещё раз” or “Сервер временно недоступен. Попробуйте позже.”

## Active Session Structure Policy

For the production MVP, session structure editing uses the safe temporary policy from Goal 01C:

- `planned` workout sessions can be edited through `PATCH /workout-sessions/:id`.
- `in_progress`, `completed`, and `cancelled` workout sessions cannot be edited through the general PATCH route.
- Status changes are not accepted through the general PATCH route; mobile must use `/start`, `/complete`, or `/cancel`.
- If a client attempts to edit a started/completed/cancelled session, the API returns: `Нельзя изменить состав уже начатой тренировки`.

This intentionally avoids replacing session items after set results exist. A future dedicated endpoint can support safe structure operations such as adding an exercise, reordering items, and deleting only result-free items.

## Mutation Map

```txt
clients.create -> POST /clients -> dataApi.createClient
clients.update -> PATCH /clients/:id -> dataApi.updateClient
exercises.create -> POST /exercises -> dataApi.createExercise
exercises.update -> PATCH /exercises/:id -> dataApi.updateExercise
exercises.archive -> DELETE /exercises/:id -> dataApi.deleteExercise
workouts.publishDraft -> POST /workout-sessions -> dataApi.createWorkoutSession
workouts.applyEditDraft -> PATCH /workout-sessions/:id -> dataApi.updateWorkoutSession
workouts.reschedule -> PATCH /workout-sessions/:id -> dataApi.updateWorkoutSession
workouts.cancel -> POST /workout-sessions/:id/cancel -> dataApi.cancelWorkoutSession
sessions.start -> POST /workout-sessions/:id/start -> dataApi.startWorkoutSession
sessions.complete -> POST /workout-sessions/:id/complete -> dataApi.completeWorkoutSession
results.upsertSetResult -> PATCH /workout-sessions/:id/results -> dataApi.upsertWorkoutSessionResults
bootstrap -> GET /sync/bootstrap -> dataApi.bootstrap/fetchBootstrapState
```

The typed API also exposes workout template CRUD:

```txt
GET/POST/PATCH/DELETE /workout-templates
```

The current mobile UI does not yet have a dedicated template repository in `DataLayer`; scheduled mobile workouts are persisted as backend workout sessions.

## Template Flow Status

```txt
UI action -> local method -> backend endpoint -> cache update
create scheduled workout -> workouts.createDraft/publishDraft -> POST /workout-sessions -> remote session replaces local draft
edit planned workout -> workouts.createEditDraft/applyEditDraft -> PATCH /workout-sessions/:id -> remote session replaces source and removes draft
reschedule planned workout -> workouts.reschedule -> PATCH /workout-sessions/:id -> remote session upsert
cancel planned workout -> workouts.cancel -> POST /workout-sessions/:id/cancel -> remote session upsert
start session -> sessions.start -> POST /workout-sessions/:id/start -> remote session/results upsert
complete session -> sessions.complete -> POST /workout-sessions/:id/complete -> remote session/results upsert
save set result -> results.upsertSetResult -> PATCH /workout-sessions/:id/results -> remote session/results upsert
```

Dedicated workout template CRUD exists on the backend (`/workout-templates`) and in the typed API, but the mobile app does not yet expose a first-class template repository UI. Production mobile flows should not rely on local-only template mutations. Until the template repository is added, the supported production flow is scheduled workout/session persistence.

Deleted templates and sessions are soft-deleted and are not returned by `/sync/bootstrap`.

## Quick Values Classification

Current quick values are local-only UI preferences, not backend business data.

```txt
metric quick values / DataLayer.quickValues + tracking inputs / number[] / local-only UI preference
exercise-scoped quick values / keyed by ownerId + exerciseId + metric / number[] / local-only UI preference
client-specific quick values / keyed by ownerId + exerciseId + metric + clientId / number[] / local-only UI preference
```

Rationale:

- they represent recent/handy input suggestions;
- they do not replace saved workout results;
- they do not drive analytics, progress history, templates, or recommendations;
- they are stored under the same user-scoped cache key as the rest of local mobile state.

If quick values later become cross-device recommendations or analytics inputs, they should move to authorized backend storage and be returned through bootstrap or a dedicated endpoint.

Complex offline sync, conflict resolution, realtime updates, and multi-trainer shared clients are intentionally not implemented in this goal.

## Old Local Data

Old unscoped data is isolated instead of auto-uploaded. It is not shown to real authenticated users. A future migration can offer an explicit import flow that uploads legacy local data to the current trainer account.

## Offline Behavior

Without network, previously loaded user-scoped cache can be shown for reading. Saves are online-first: if the backend request does not complete, the app reports an error and does not mark the change as saved.

Local workout drafts may exist before the trainer taps save/start/assign. Once published, the backend returns the canonical id and the local draft id is removed from cache.

## Smoke Checklist

Trainer A:

```txt
1. Sign in on mobile as trainer A.
2. Create a client.
3. Create an exercise.
4. Create/publish a scheduled workout.
5. Start the workout session.
6. Save set results.
7. Complete the session.
8. Restart the app.
9. Confirm `/sync/bootstrap` restores the client, exercise, workout session, and results.
10. Confirm PostgreSQL rows use trainer A's `trainer_id`.
11. Confirm admin trainer detail metrics include the mobile-created data.
```

Trainer isolation:

```txt
1. Sign out trainer A.
2. Sign in as trainer B.
3. Confirm trainer A's mobile data is not visible.
4. Create client/workout data for trainer B.
5. Confirm PostgreSQL rows use trainer B's `trainer_id`.
6. Return to trainer A and confirm trainer A's data bootstraps again.
```

Network error:

```txt
1. Stop the API or point mobile at an unavailable API URL.
2. Attempt a create/update/result mutation.
3. Confirm the UI shows an error.
4. Confirm local cache did not create a fake successful record.
5. Restore the API and repeat the action successfully.
```

Production API guard:

```txt
1. Create a planned workout session.
2. PATCH /workout-sessions/:id while planned and confirm only allowed fields are accepted.
3. Start the session through POST /workout-sessions/:id/start.
4. PATCH /workout-sessions/:id after start returns "Нельзя изменить состав уже начатой тренировки".
5. Complete the session through POST /workout-sessions/:id/complete.
6. Confirm completed session structure cannot be overwritten through the general PATCH route.
7. Confirm status cannot be changed through the general PATCH route.
```

Soft delete:

```txt
1. Create a client.
2. Delete the client.
3. Restart the app or clear runtime state.
4. Run bootstrap and confirm the deleted client does not return.
5. Repeat for exercises and sessions when their UI/API path is part of the release smoke.
```

Blocked trainer:

```txt
1. Sign in as trainer A.
2. Block trainer A in admin.
3. Confirm refresh, /me, and protected data endpoints no longer expose trainer A data.
4. Revoke trainer A sessions in admin.
5. Unblock trainer A.
6. Confirm trainer A can sign in again and bootstrap only trainer A data.
```

## Remaining TODO

- Add a dedicated mobile template repository/UI if workout templates become a first-class mobile workflow.
- Add backend support for quick values if they need to survive across devices.
- Add a safe backend endpoint for editing active session item composition without replacing existing set results.
