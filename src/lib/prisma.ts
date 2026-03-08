import path from 'path';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'dev.db')}`;

function buildAdapter() {
  if (databaseUrl.startsWith('file:')) {
    const dbPath = databaseUrl.replace(/^file:/, '') || path.join(process.cwd(), 'dev.db');
    return new PrismaBetterSqlite3({ url: dbPath });
  }

  if (databaseUrl.startsWith('postgresql:') || databaseUrl.startsWith('postgres:')) {
    const pool = new Pool({ connectionString: databaseUrl });
    return new PrismaPg(pool);
  }

  throw new Error(`Unsupported DATABASE_URL protocol for Prisma adapter: ${databaseUrl}`);
}

const adapter = buildAdapter();

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
