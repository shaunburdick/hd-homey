import { existsSync, mkdirSync } from 'node:fs';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import Config from '@/lib/config';
import Logger from '@/lib/logger';

export type DB = BetterSQLite3Database<typeof schema>;

/**
 * Global database connection cache
 *
 * Using globalThis ensures the connection persists across HMR (Hot Module Replacement)
 * in Next.js development mode. Without this, each module reload would create a new
 * connection, resulting in multiple "Opening SQL DB" log messages.
 *
 * This is the standard pattern for database connections in Next.js, as demonstrated
 * in Vercel's official examples:
 * https://github.com/vercel/next.js/tree/canary/examples/prisma-postgres/lib
 */
declare global {

    var __hdHomeyDbConnection: Database.Database | undefined;
}

export function connection() {
    if (globalThis.__hdHomeyDbConnection !== undefined) {
        return globalThis.__hdHomeyDbConnection;
    }
    Logger.info(`Opening SQL DB: ${Config.DB_PATH}...`);

    // Ensure the database directory exists before opening the connection
    // This is necessary for Next.js builds which may import database modules
    // even for dynamic routes during the build phase
    const dbDir = Config.DB_PATH.substring(0, Config.DB_PATH.lastIndexOf('/'));
    if (dbDir.length > 0) {
        if (existsSync(dbDir) === false) {
            Logger.info(`Creating database directory: ${dbDir}`);
            mkdirSync(dbDir, { recursive: true });
        }
    }

    const db = new Database(Config.DB_PATH);

    // For debugging SQL queries, uncomment the verbose option:
    // const db = new Database(Config.DB_PATH, {
    //     verbose: (query, ...params) => {
    //         Logger.info({ query, params }, 'SQL Query');
    //     },
    // });

    globalThis.__hdHomeyDbConnection = db;
    return globalThis.__hdHomeyDbConnection;
}

export async function getDb(): Promise<DB> {
    // Always return a new Drizzle instance but reuse the connection
    return drizzle(connection(), { schema });
}
