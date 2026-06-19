import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import Config from '../lib/config';
import Logger from '../lib/logger';

async function runMigrations() {
    Logger.info('Starting database migrations...');

    try {
        const sqlite = new Database(Config.DB_PATH);
        const db = drizzle(sqlite);

        // Migrations are at ./migrations relative to apps/web working directory
        const migrationsPath = resolve(process.cwd(), './migrations');
        migrate(db, { migrationsFolder: migrationsPath });

        Logger.info('Database migrations completed successfully');
        process.exit(0);
    } catch (error) {
        Logger.error('Failed to run database migrations: %s', error);
        process.exit(1);
    }
}

void runMigrations();
