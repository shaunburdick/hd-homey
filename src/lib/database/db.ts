import { existsSync, mkdirSync } from 'node:fs';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import Config from '@/lib/config';
import Logger from '@/lib/logger';

export type DB = BetterSQLite3Database<typeof schema>;
let cachedConnection: Database.Database | undefined;

export function connection() {
    if (cachedConnection !== undefined) {
        return cachedConnection;
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

    cachedConnection = db;
    return cachedConnection;
}

export async function getDb(): Promise<DB> {
    // Always return a new Drizzle instance but reuse the connection
    return drizzle(connection(), { schema });
}
