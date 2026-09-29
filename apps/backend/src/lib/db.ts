/**
 * Prisma client singleton — MongoDB (Prisma 6).
 *
 * In development, Next.js hot-reload creates a new module instance on every
 * change, which would exhaust the connection pool. We store the client on
 * the Node.js global object so it survives hot-reloads.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
