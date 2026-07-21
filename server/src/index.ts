import { loadAuthConfig } from "./config";
import { createEmailSender } from "./email";
import { buildApi } from "./app";
import { createOAuthAdapters } from "./oauth/providers";
import { createAuthRepository } from "./repositories/createAuthRepository";
import { createTrainerDataRepository } from "./data/createTrainerDataRepository";
import { createAdminRepository } from "./admin/createAdminRepository";
import { createAccountDeletionRepository } from "./accountDeletion/createAccountDeletionRepository";

async function main() {
  const config = loadAuthConfig();
  const repository = createAuthRepository(config);
  const dataRepository = createTrainerDataRepository(config);
  const adminRepository = createAdminRepository(config);
  const accountDeletionRepository = createAccountDeletionRepository(config, {
    authRepository: repository,
    dataRepository,
    adminRepository
  });
  const app = buildApi({
    config,
    repository,
    dataRepository,
    adminRepository,
    accountDeletionRepository,
    emailSender: createEmailSender(config),
    oauthAdapters: createOAuthAdapters(config)
  });
  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.info(`[api] listening on ${config.apiBaseUrl}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
