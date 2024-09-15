import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import Config from '@/lib/config';
import Logger from '@/lib/logger';
import * as schema from './schema';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

export type DB = BetterSQLite3Database<typeof schema>;
let cachedDB: DB;
let ranMigration = false;

export function connection() {
    const dbFolder = path.dirname(Config.DB_PATH);
    Logger.info(`Checking that ${dbFolder} exists...`);
    if (!existsSync(dbFolder)) {
        Logger.info(`${dbFolder} doesn't exist. Attempting to create it...`);
        mkdirSync(dbFolder, { recursive: true });
    }

    Logger.info(`Opening SQL DB: ${Config.DB_PATH}...`);
    return new Database(Config.DB_PATH, { verbose: q => Logger.info(q) });
}

export async function runMigrations(db: DB) {
    if (!ranMigration) {
        migrate(db, { migrationsFolder: path.join(process.cwd(), 'migrations') });
        ranMigration = true;
    }
}

export async function getDb(): Promise<DB> {
    if (cachedDB) {
        return cachedDB;
    }

    cachedDB = drizzle(connection(), { schema });
    await runMigrations(cachedDB);

    return cachedDB;
}
