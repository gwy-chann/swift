/* eslint-disable @typescript-eslint/no-explicit-any, sonarjs/redundant-type-aliases */
type PrismaClientType = any;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | null | undefined
};

export function getPrismaClient(): PrismaClientType | null {
  if (typeof window !== 'undefined') {
    return null;
  }
  if (globalForPrisma.prisma !== undefined) {
    return globalForPrisma.prisma;
  }
  if (!process.env.DATABASE_URL) {
    globalForPrisma.prisma = null;
    return null;
  }
  try {
    // Lazy resolution to avoid crashing in environments without generated Prisma engine
    const nodeRequire =
      typeof module !== 'undefined' && module.require
        ? module.require
        : (eval('require') as (id: string) => any);
    const pkg = nodeRequire('@prisma/client');
    const PrismaClient = pkg?.PrismaClient ?? pkg;
    globalForPrisma.prisma = new PrismaClient();
  } catch {
    globalForPrisma.prisma = null;
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClientType, {
  get(_target, prop) {
    const client = getPrismaClient();
    if (!client) {
      return undefined;
    }
    const val = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  }
});
