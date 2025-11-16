import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@/lib/database/schema';
import type { DB } from '@/lib/database/db';

/**
 * Create an in-memory SQLite database for testing
 */
export function createTestDatabase(): DB {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });

    // Run migrations
    migrate(db, { migrationsFolder: './migrations' });

    return db;
}

/**
 * Seed test database with initial data
 */
export async function seedTestDatabase(db: DB) {
    const { users, tuners, channels } = schema;
    const { AuthRoles } = await import('@/lib/auth-roles');

    // Insert test users
    const [adminUser] = db.insert(users).values({
        username: 'admin',
        name: 'Admin User',
        passHash: '$2b$10$testhashedpassword', // bcrypt hash of "password"
        role: AuthRoles.Admin,
        is_active: true
    }).returning().all();

    const [viewerUser] = db.insert(users).values({
        username: 'viewer',
        name: 'Viewer User',
        passHash: '$2b$10$testhashedpassword',
        role: AuthRoles.Viewer,
        is_active: true
    }).returning().all();

    // Insert test tuner
    const [tuner] = db.insert(tuners).values({
        name: 'Test HDHomeRun',
        path: 'http://192.168.20.25',
        is_active: true
    }).returning().all();

    // Insert test channels
    const testChannels = db.insert(channels).values([
        {
            fk_tuner: tuner.id,
            guideNumber: '3.1',
            guideName: 'WSTMNBC',
            videoCodec: 'MPEG2',
            audioCodec: 'AC3',
            hd: 1,
            url: 'http://192.168.20.25:5004/auto/v3.1',
            is_active: true
        },
        {
            fk_tuner: tuner.id,
            guideNumber: '5.1',
            guideName: 'WTVHCBS',
            videoCodec: 'MPEG2',
            audioCodec: 'AC3',
            hd: 1,
            url: 'http://192.168.20.25:5004/auto/v5.1',
            is_active: true
        }
    ]).returning().all();

    return {
        users: [adminUser, viewerUser],
        tuners: [tuner],
        channels: testChannels
    };
}

/**
 * Clean up test database
 */
export function cleanupTestDatabase(db: DB) {
    const { users, tuners, channels } = schema;

    // Delete in reverse order due to foreign keys
    db.delete(channels).run();
    db.delete(tuners).run();
    db.delete(users).run();
}
