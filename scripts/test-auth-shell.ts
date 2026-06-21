import assert from "node:assert/strict";
import {
  createDevelopmentAuthProvider,
  createExpiredDevelopmentCredential
} from "../src/auth/developmentProvider";
import { createMemoryCredentialVault } from "../src/auth/credentialVault";
import {
  restoreAuthSession,
  signInWithProvider,
  signOutWithProvider
} from "../src/auth/operations";
import { getAuthRouteDecision } from "../src/auth/routes";
import {
  signedInState,
  signedOutState
} from "../src/auth/state";
import { serializeDataState } from "../src/data/persistence/serializeSnapshot";
import { createInitialState } from "../src/data/seeds/mockSeed";
import { LOCAL_OWNER_ID } from "../src/types";

const signedOut = signedOutState("initial");
assert.equal(getAuthRouteDecision(signedOut, "/"), "redirect_to_sign_in");
assert.equal(getAuthRouteDecision(signedOut, "/clients/client-1"), "redirect_to_sign_in");
assert.equal(getAuthRouteDecision(signedOut, "/sign-in"), "allow");
assert.equal(getAuthRouteDecision(signedOut, "/storybook"), "allow");

const signedIn = signedInState({
  id: "session-test",
  ownerId: LOCAL_OWNER_ID,
  provider: "development",
  displayName: "Тренер",
  issuedAt: "2026-06-21T00:00:00.000Z"
});
assert.equal(getAuthRouteDecision(signedIn, "/"), "allow");
assert.equal(getAuthRouteDecision(signedIn, "/workouts/new"), "allow");
assert.equal(getAuthRouteDecision(signedIn, "/sign-in"), "redirect_to_app");

async function main() {
  const provider = createDevelopmentAuthProvider(() => new Date("2026-06-21T09:00:00.000Z"));
  const credentialVault = createMemoryCredentialVault();
  const signInResult = await signInWithProvider(provider, credentialVault, { displayName: " Dev Trainer " });
  assert.equal(signInResult.state.status, "signed_in");
  assert.equal(signInResult.credential.session.ownerId, LOCAL_OWNER_ID);
  assert.equal(signInResult.credential.session.displayName, "Dev Trainer");
  assert.match(signInResult.credential.accessToken, /^dev-local-token:/);

  const restored = await restoreAuthSession(provider, credentialVault);
  assert.equal(restored.state.status, "signed_in");
  assert.equal(restored.credential?.accessToken, signInResult.credential.accessToken);

  let preserveModeClearedLocalData = false;
  await signOutWithProvider({
    provider,
    credentialVault,
    credential: restored.credential,
    options: { mode: "preserve_local_data" },
    onClearLocalData: async () => {
      preserveModeClearedLocalData = true;
    }
  });
  assert.equal(preserveModeClearedLocalData, false);

  const secondSignIn = await signInWithProvider(provider, credentialVault);

  let localDataCleared = false;
  const signOutResult = await signOutWithProvider({
    provider,
    credentialVault,
    credential: secondSignIn.credential,
    options: { mode: "clear_local_data" },
    onClearLocalData: async () => {
      localDataCleared = true;
    }
  });
  assert.equal(signOutResult.state.status, "signed_out");
  assert.equal(signOutResult.state.signedOutReason, "logout");
  assert.equal(localDataCleared, true);
  assert.equal(await credentialVault.read(), null);

  const expiredVault = createMemoryCredentialVault(createExpiredDevelopmentCredential("2026-06-21T08:59:59.000Z"));
  const expiredRestore = await restoreAuthSession(provider, expiredVault);
  assert.equal(expiredRestore.state.status, "signed_out");
  assert.equal(expiredRestore.state.signedOutReason, "expired");
  assert.equal(expiredRestore.credential, null);
  assert.equal(await expiredVault.read(), null);

  const snapshotJson = JSON.stringify(serializeDataState(createInitialState()));
  assert.equal(snapshotJson.includes("dev-local-token"), false);
  assert.equal(snapshotJson.includes("accessToken"), false);
  assert.equal(snapshotJson.includes("credential"), false);

  console.log("Auth shell contract tests passed");
}

void main();
