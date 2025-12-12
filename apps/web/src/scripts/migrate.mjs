/* eslint-disable no-console, no-undef */
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

const DB_PATH = process.env.HD_HOMEY_DB_PATH || './data/db/hd_homey.db';

console.log('Starting database migrations...');

try {
    const sqlite = new Database(DB_PATH);
    const db = drizzle(sqlite);

    await migrate(db, { migrationsFolder: './migrations' });

    console.log('Database migrations completed successfully');
    process.exit(0);
} catch (error) {
    console.error('Failed to run database migrations:', error);
    process.exit(1);
}
