import { loadAuthConfig } from "../config";
import { AdminService } from "./AdminService";
import { createAdminRepository } from "./createAdminRepository";

async function main() {
  const args = new Map<string, string>();
  for (let index = 2; index < process.argv.length; index += 1) {
    const current = process.argv[index];
    const next = process.argv[index + 1];
    if (current?.startsWith("--") && next && !next.startsWith("--")) {
      args.set(current.slice(2), next);
      index += 1;
    }
  }

  const config = loadAuthConfig();
  const email = args.get("email") ?? config.admin.initialEmail;
  const password = args.get("password") ?? config.admin.initialPassword;
  if (!email || !password) {
    throw new Error("Pass --email and --password, or set ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD.");
  }

  const repository = createAdminRepository(config);
  const service = new AdminService(config, repository);
  const admin = await service.createInitialAdmin(email, password, "OWNER");
  console.info(`[admin] owner is ready: ${admin.email}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
