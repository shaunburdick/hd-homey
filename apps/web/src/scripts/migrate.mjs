import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

const DB_PATH = process.env.HD_HOMEY_DB_PATH || './data/db/hd_homey.db';

// In Docker standalone build, migrations are at /app/migrations
// In development, they're relative to the project root
// Use absolute path in production to avoid working directory issues
const MIGRATIONS_PATH = process.env.NODE_ENV === 'production'
    ? '/app/migrations'
    : './migrations';

console.log('Starting database migrations...');
console.log(`Database path: ${DB_PATH}`);
console.log(`Migrations path: ${MIGRATIONS_PATH}`);

try {
    const sqlite = new Database(DB_PATH);
    const db = drizzle(sqlite);

    await migrate(db, { migrationsFolder: MIGRATIONS_PATH });

    console.log('Database migrations completed successfully');
    process.exit(0);
} catch (error) {
    console.error('Failed to run database migrations:', error);
    process.exit(1);
}
