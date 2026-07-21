import { Prisma, PrismaClient } from "@prisma/client";
import type { AuthIdentityRecord, AuthProvider, EmailLoginCodeRecord, LoginTicketRecord, OAuthProvider, OAuthStateRecord, RefreshTokenRecord, UserRecord } from "../types";
import type { AuthRepository, CreateUserInput, UpsertIdentityInput } from "./AuthRepository";

const prisma = new PrismaClient();

export class PrismaAuthRepository implements AuthRepository {
  async findUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? mapUser(user) : null;
  }

  async findUserByEmail(email: string) {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive"
        },
        deletedAt: null
      }
    });
    return user ? mapUser(user) : null;
  }

  async createUser(input: CreateUserInput) {
    return mapUser(
      await prisma.user.create({
        data: {
          email: input.email ?? null,
          emailVerifiedAt: input.emailVerifiedAt ?? null,
          displayName: input.displayName ?? null,
          avatarUrl: input.avatarUrl ?? null,
          lastSeenAt: input.lastSeenAt ?? null,
          blockedAt: input.blockedAt ?? null,
          blockedReason: input.blockedReason ?? null
        }
      })
    );
  }

  async updateUser(id: string, input: Partial<CreateUserInput>) {
    return mapUser(
      await prisma.user.update({
        where: { id },
        data: {
          ...(input.email !== undefined ? { email: input.email ?? null } : {}),
          ...(input.emailVerifiedAt !== undefined ? { emailVerifiedAt: input.emailVerifiedAt ?? null } : {}),
          ...(input.displayName !== undefined ? { displayName: input.displayName ?? null } : {}),
          ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl ?? null } : {}),
          ...(input.lastSeenAt !== undefined ? { lastSeenAt: input.lastSeenAt ?? null } : {}),
          ...(input.blockedAt !== undefined ? { blockedAt: input.blockedAt ?? null } : {}),
          ...(input.blockedReason !== undefined ? { blockedReason: input.blockedReason ?? null } : {})
        }
      })
    );
  }

  async listIdentitiesForUser(userId: string) {
    return (await prisma.authIdentity.findMany({ where: { userId } })).map(mapIdentity);
  }

  async findIdentity(provider: AuthProvider, providerSubject: string) {
    const identity = await prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider,
          providerSubject
        }
      }
    });
    return identity ? mapIdentity(identity) : null;
  }

  async upsertIdentity(input: UpsertIdentityInput) {
    return mapIdentity(
      await prisma.authIdentity.upsert({
        where: {
          provider_providerSubject: {
            provider: input.provider,
            providerSubject: input.providerSubject
          }
        },
        create: {
          userId: input.userId,
          provider: input.provider,
          providerSubject: input.providerSubject,
          providerEmail: input.providerEmail ?? null,
          providerEmailVerified: input.providerEmailVerified ?? false,
          rawProfile: input.rawProfile === undefined ? undefined : input.rawProfile === null ? Prisma.JsonNull : (input.rawProfile as Prisma.InputJsonValue)
        },
        update: {
          userId: input.userId,
          providerEmail: input.providerEmail ?? null,
          providerEmailVerified: input.providerEmailVerified ?? false,
          rawProfile: input.rawProfile === undefined ? undefined : input.rawProfile === null ? Prisma.JsonNull : (input.rawProfile as Prisma.InputJsonValue)
        }
      })
    );
  }

  async createEmailCode(input: { email: string; codeHash: string; expiresAt: Date; lastSentAt: Date }) {
    return mapEmailCode(await prisma.emailLoginCode.create({ data: input }));
  }

  async findLatestEmailCode(email: string) {
    const record = await prisma.emailLoginCode.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" }
    });
    return record ? mapEmailCode(record) : null;
  }

  async incrementEmailCodeAttempts(id: string) {
    return mapEmailCode(
      await prisma.emailLoginCode.update({
        where: { id },
        data: { attemptCount: { increment: 1 } }
      })
    );
  }

  async consumeEmailCode(id: string) {
    const consumedAt = new Date();
    const result = await prisma.emailLoginCode.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt }
    });
    if (result.count !== 1) return null;
    const record = await prisma.emailLoginCode.findUnique({ where: { id } });
    return record ? mapEmailCode(record) : null;
  }

  async createRefreshToken(input: { userId: string; tokenHash: string; deviceId?: string | null; userAgent?: string | null; ipHash?: string | null; expiresAt: Date; rotatedFromTokenId?: string | null }) {
    return mapRefreshToken(
      await prisma.refreshToken.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          deviceId: input.deviceId ?? null,
          userAgent: input.userAgent ?? null,
          ipHash: input.ipHash ?? null,
          expiresAt: input.expiresAt,
          rotatedFromTokenId: input.rotatedFromTokenId ?? null
        }
      })
    );
  }

  async findRefreshTokenByHash(tokenHash: string) {
    const record = await prisma.refreshToken.findFirst({ where: { tokenHash } });
    return record ? mapRefreshToken(record) : null;
  }

  async revokeRefreshToken(id: string) {
    const record = await prisma.refreshToken.findUnique({ where: { id } });
    if (!record) return null;
    if (record.revokedAt) return mapRefreshToken(record);
    return mapRefreshToken(await prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } }));
  }

  async revokeRefreshTokenFamily(userId: string, deviceId?: string | null) {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        ...(deviceId === undefined ? {} : { deviceId }),
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  async createOAuthState(input: { provider: OAuthProvider; stateHash: string; codeVerifierEncrypted?: string | null; redirectAfter?: string | null; expiresAt: Date }) {
    return mapOAuthState(
      await prisma.oAuthState.create({
        data: {
          provider: input.provider,
          stateHash: input.stateHash,
          codeVerifierEncrypted: input.codeVerifierEncrypted ?? null,
          redirectAfter: input.redirectAfter ?? null,
          expiresAt: input.expiresAt
        }
      })
    );
  }

  async findOAuthStateByHash(stateHash: string) {
    const record = await prisma.oAuthState.findUnique({ where: { stateHash } });
    return record ? mapOAuthState(record) : null;
  }

  async consumeOAuthState(id: string) {
    return mapOAuthState(await prisma.oAuthState.update({ where: { id }, data: { consumedAt: new Date() } }));
  }

  async createLoginTicket(input: { userId: string; provider: OAuthProvider; ticketHash: string; expiresAt: Date }) {
    return mapLoginTicket(await prisma.loginTicket.create({ data: input }));
  }

  async findLoginTicketByHash(ticketHash: string) {
    const record = await prisma.loginTicket.findUnique({ where: { ticketHash } });
    return record ? mapLoginTicket(record) : null;
  }

  async consumeLoginTicket(id: string) {
    return mapLoginTicket(await prisma.loginTicket.update({ where: { id }, data: { consumedAt: new Date() } }));
  }
}

function mapUser(user: {
  id: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  displayName: string | null;
  avatarUrl: string | null;
  lastSeenAt: Date | null;
  blockedAt: Date | null;
  blockedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): UserRecord {
  return user;
}

function mapIdentity(identity: {
  id: string;
  userId: string;
  provider: string;
  providerSubject: string;
  providerEmail: string | null;
  providerEmailVerified: boolean;
  rawProfile: unknown;
  createdAt: Date;
  updatedAt: Date;
}): AuthIdentityRecord {
  return {
    ...identity,
    provider: identity.provider as AuthProvider
  };
}

function mapRefreshToken(record: RefreshTokenRecord): RefreshTokenRecord {
  return record;
}

function mapEmailCode(record: EmailLoginCodeRecord): EmailLoginCodeRecord {
  return record;
}

function mapOAuthState(record: {
  id: string;
  provider: string;
  stateHash: string;
  codeVerifierEncrypted: string | null;
  redirectAfter: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}): OAuthStateRecord {
  return {
    ...record,
    provider: record.provider as OAuthProvider
  };
}

function mapLoginTicket(record: {
  id: string;
  userId: string;
  provider: string;
  ticketHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}): LoginTicketRecord {
  return {
    ...record,
    provider: record.provider as OAuthProvider
  };
}
