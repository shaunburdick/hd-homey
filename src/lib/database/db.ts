import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import Config from '@/lib/config';
import Logger from '@/lib/logger';

export type DB = BetterSQLite3Database<typeof schema>;
let cachedConnection: Database.Database;

export function connection() {
    if (cachedConnection !== null && cachedConnection !== undefined) {
        return cachedConnection;
    }
    Logger.info(`Opening SQL DB: ${Config.DB_PATH}...`);
    cachedConnection = new Database(Config.DB_PATH, { verbose: q => Logger.info(q) });
    return cachedConnection;
}

export async function getDb(): Promise<DB> {
    // Always return a new Drizzle instance but reuse the connection
    return drizzle(connection(), { schema });
}
