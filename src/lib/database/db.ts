import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import Config from '@/lib/config';
import Logger from '@/lib/logger';
import * as schema from './schema';
import path from 'path';

export type DB = BetterSQLite3Database<typeof schema>;
let cachedDB: DB;

export function connection() {
    Logger.info(`Opening SQL DB: ${Config.DB_PATH}...`);
    return new Database(Config.DB_PATH, { verbose: q => Logger.info(q) });
}

export async function runMigrations(db: DB) {
    migrate(db, { migrationsFolder: path.join(process.cwd(), 'migrations') });
}

export async function getDb(): Promise<DB> {
    if (cachedDB) {
        return cachedDB;
    }

    cachedDB = drizzle(connection(), { schema });
    await runMigrations(cachedDB);

    return cachedDB;
}
