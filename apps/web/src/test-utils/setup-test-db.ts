import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@/lib/database/schema';
import type { DB } from '@/lib/database/db';

/**
 * Create an in-memory SQLite database for testing with migrations applied
 */
export function createTestDatabase(): DB {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });

    // Run migrations (relative to apps/web working directory)
    migrate(db, { migrationsFolder: './migrations' });

    return db;
}

/**
 * Seed test database with initial data
 */
export async function seedTestDatabase(db: DB) {
    const { user, account, tuners, channels } = schema;
    const { AuthRoles } = await import('@/lib/auth-roles');
    const { generateHashPassword } = await import('@/lib/user');

    // Insert test users (Better-Auth format with username)
    const [adminUser] = db.insert(user).values({
        id: 'test-admin-uuid',
        username: 'admin',
        email: 'admin@local.hdhomey.app',
        emailVerified: false,
        name: 'Admin User',
        role: AuthRoles.Admin,
        isActive: true
    }).returning().all();

    const [viewerUser] = db.insert(user).values({
        id: 'test-viewer-uuid',
        username: 'viewer',
        email: 'viewer@local.hdhomey.app',
        emailVerified: false,
        name: 'Viewer User',
        role: AuthRoles.Viewer,
        isActive: true
    }).returning().all();

    // Insert account credentials for test users
    const testPassword = await generateHashPassword('testpassword123');

    db.insert(account).values([
        {
            id: 'test-admin-account',
            userId: adminUser.id,
            accountId: adminUser.id,
            providerId: 'credential',
            password: testPassword,
        },
        {
            id: 'test-viewer-account',
            userId: viewerUser.id,
            accountId: viewerUser.id,
            providerId: 'credential',
            password: testPassword,
        }
    ]).run();

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
    const { user, account, verification, tuners, channels } = schema;

    // Delete in reverse order due to foreign keys
    db.delete(channels).run();
    db.delete(tuners).run();
    db.delete(account).run(); // Delete accounts before users (foreign key)
    db.delete(verification).run();
    db.delete(user).run();
}

/**
 * Setup test database helper - creates fresh database and optionally mocks getDb()
 *
 * This helper simplifies test setup by handling database creation and mocking.
 * The mock MUST be set up at module level for vi.mock() hoisting to work properly.
 *
 * @returns Object with testDb ref and refreshDb function
 *
 * @example
 * // At top of test file
 * import { setupTestDatabase } from '@/test-utils/setup-test-db';
 *
 * // Create test database reference
 * let testDb: DB;
 *
 * // Mock getDb() - MUST be at module level for hoisting
 * vi.mock('@/lib/database/db', () => ({
 *     getDb: vi.fn(() => Promise.resolve(testDb))
 * }));
 *
 * const { refreshDb } = setupTestDatabase();
 *
 * describe('My Tests', () => {
 *   beforeEach(async () => {
 *     testDb = await refreshDb({ seed: true });
 *   });
 * });
 */
export function setupTestDatabase() {
    return {
        /**
         * Creates a fresh database instance with migrations.
         * Call this in beforeEach to get a clean database for each test.
         *
         * @param options.seed - Whether to seed the database with test data (default: false)
         * @returns The created database instance
         */
        async refreshDb(options?: { seed?: boolean }): Promise<DB> {
            const db = createTestDatabase();
            if (options?.seed === true) {
                await seedTestDatabase(db);
            }
            return db;
        },
    };
}
