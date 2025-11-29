import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser, updateUser } from './users';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
import { AuthRoles } from '@/lib/auth-roles';
import type { DB } from '@/lib/database/db';
import * as authModule from '@/lib/auth/helpers';

// Mock Next.js functions
const REDIRECT_ERROR_CODE = 'NEXT_REDIRECT';
vi.mock('next/navigation', () => ({
    redirect: vi.fn((url: string) => {
        const error = new Error(`${REDIRECT_ERROR_CODE}: ${url}`) as Error & { digest: string };
        error.digest = REDIRECT_ERROR_CODE;
        throw error;
    })
}));

vi.mock('next/dist/client/components/redirect-error', () => ({
    isRedirectError: vi.fn((error: unknown) => {
        return (error as { digest?: string } | null)?.digest === REDIRECT_ERROR_CODE;
    })
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}));

let testDb: DB;

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
    connection: vi.fn(() => ({})), // Mock connection for auth.ts
}));

const { refreshDb } = setupTestDatabase();

// Helper to create a mock session
function createMockSession(overrides?: Record<string, unknown>) {
    return {
        user: {
            id: 'test-admin-uuid',
            username: 'admin',
            name: 'Admin User',
            email: 'admin@local.hdhomey.app',
            emailVerified: false,
            role: AuthRoles.Admin,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...((overrides?.user as Record<string, unknown> | undefined) ?? {}),
        },
        session: {
            id: 'session-1',
            userId: 'test-admin-uuid',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            token: 'test-token',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...((overrides?.session as Record<string, unknown> | undefined) ?? {}),
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ...overrides,
    };
}

describe('User Actions', () => {
    // Test constants
    const TEST_UPDATED_NAME = 'Updated Name';
    const TEST_ACTIVE_VALUE = 'true';
    const TEST_SETUP_ERROR = 'Test setup failed: no user found';

    beforeEach(async () => {
        testDb = await refreshDb({ seed: true });
        vi.clearAllMocks();
    });

    describe('createUser', () => {
        it('should create a new user when authenticated as admin', async () => {
            // Mock admin session
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue(createMockSession());

            const formData = new FormData();
            formData.append('username', 'newuser');
            formData.append('name', 'New User');
            formData.append('password', 'password123');
            formData.append('role', AuthRoles.Viewer);

            // Call createUser - redirect mock will throw
            await expect(createUser(null, formData)).rejects.toThrow('NEXT_REDIRECT');

            // Verify user was created in database
            const { user } = await import('@/lib/database/schema');
            const { eq } = await import('drizzle-orm');
            const createdUser = testDb.select().from(user).where(eq(user.username, 'newuser')).get();

            expect(createdUser).toBeDefined();
            expect(createdUser?.name).toBe('New User');
            expect(createdUser?.role).toBe(AuthRoles.Viewer);
        });

        it('should reject creation when not authenticated as admin', async () => {
            // Mock unauthorized
            vi.spyOn(authModule, 'requireAdmin').mockRejectedValue(new Error('Unauthorized'));

            const formData = new FormData();
            formData.append('username', 'newuser');
            formData.append('name', 'New User');
            formData.append('password', 'password123');
            formData.append('role', AuthRoles.Viewer);

            const result = await createUser(null, formData);

            expect(result).toEqual([
                { path: 'authorization', message: 'Unauthorized' }
            ]);
        });

        it('should return validation errors for invalid user data', async () => {
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue(createMockSession());

            const formData = new FormData();
            // Missing required fields
            formData.append('username', '');
            formData.append('name', '');
            formData.append('password', '');
            formData.append('role', AuthRoles.Viewer);

            const result = await createUser(null, formData);

            // Should return validation errors (not redirect)
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            // Check that we got error objects with path and message
            expect(result.every(e => 'path' in e && 'message' in e)).toBe(true);
        });

        it('should hash password before storing', async () => {
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue(createMockSession());

            const plainPassword = 'mySecretPassword123';
            const username = 'secureuser';
            const formData = new FormData();
            formData.append('username', username);
            formData.append('name', 'Secure User');
            formData.append('password', plainPassword);
            formData.append('role', AuthRoles.Viewer);

            try {
                await createUser(null, formData);
            } catch {
                // Expected redirect
            }

            // Password is stored in account table (Better-Auth pattern)
            const { user, account } = await import('@/lib/database/schema');
            const { eq } = await import('drizzle-orm');
            const createdUser = testDb.select().from(user).where(eq(user.username, username)).get();
            expect(createdUser).toBeDefined();

            // Check password in account table
            if (createdUser === undefined) {
                throw new Error('User creation failed');
            }
            const userAccount = testDb.select().from(account).where(eq(account.userId, createdUser.id)).get();
            expect(userAccount).toBeDefined();
            expect(userAccount?.password).not.toBe(plainPassword);
            // Better-Auth uses scrypt with format: salt:hash (both hex strings)
            expect(userAccount?.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/i);
        });
    });

    describe('updateUser', () => {
        it('should update user when authenticated as admin', async () => {
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue(createMockSession());

            // Get existing user ID from seeded data
            const { user } = await import('@/lib/database/schema');
            const existingUser = testDb.select().from(user).limit(1).get();
            if (existingUser === undefined) {
                throw new Error(TEST_SETUP_ERROR);
            }

            const formData = new FormData();
            formData.append('id', existingUser.id);
            formData.append('name', TEST_UPDATED_NAME);
            formData.append('is_active', TEST_ACTIVE_VALUE);

            // Call updateUser - redirect mock will throw
            await expect(updateUser(null, formData)).rejects.toThrow('NEXT_REDIRECT');

            // Verify user was updated
            const { eq } = await import('drizzle-orm');
            const updatedUser = testDb.select().from(user).where(eq(user.id, existingUser.id)).get();
            expect(updatedUser?.name).toBe(TEST_UPDATED_NAME);
        });

        it('should reject update when not authenticated as admin', async () => {
            vi.spyOn(authModule, 'requireAdmin').mockRejectedValue(new Error('Unauthorized'));

            const formData = new FormData();
            formData.append('id', '1');
            formData.append('name', TEST_UPDATED_NAME);
            formData.append('is_active', TEST_ACTIVE_VALUE);

            const result = await updateUser(null, formData);

            expect(result).toEqual([
                { path: 'authorization', message: 'Unauthorized' }
            ]);
        });

        it('should return error for invalid user ID', async () => {
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue(createMockSession());

            const formData = new FormData();
            formData.append('id', '');
            formData.append('name', TEST_UPDATED_NAME);

            const result = await updateUser(null, formData);

            expect(result).toEqual([
                { path: 'id', message: 'Invalid user ID' }
            ]);
        });

        it('should update password only when provided', async () => {
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue(createMockSession());

            const { user, account } = await import('@/lib/database/schema');
            const { eq } = await import('drizzle-orm');

            const existingUser = testDb.select().from(user).limit(1).get();
            if (existingUser === undefined) {
                throw new Error(TEST_SETUP_ERROR);
            }

            // Get original password from account table
            const originalAccount = testDb.select().from(account)
                .where(eq(account.userId, existingUser.id))
                .get();
            const originalPasswordHash = originalAccount?.password;

            // Update without password
            const formData1 = new FormData();
            formData1.append('id', existingUser.id);
            formData1.append('name', 'Name Change 1');
            formData1.append('is_active', TEST_ACTIVE_VALUE);

            try {
                await updateUser(null, formData1);
            } catch {
                // Expected redirect
            }

            const afterUpdate1 = testDb.select().from(account)
                .where(eq(account.userId, existingUser.id))
                .get();
            expect(afterUpdate1?.password).toBe(originalPasswordHash); // Password unchanged

            // Update with password
            const formData2 = new FormData();
            formData2.append('id', existingUser.id);
            formData2.append('name', 'Name Change 2');
            formData2.append('password', 'newPassword123');
            formData2.append('is_active', TEST_ACTIVE_VALUE);

            try {
                await updateUser(null, formData2);
            } catch {
                // Expected redirect
            }

            const afterUpdate2 = testDb.select().from(account)
                .where(eq(account.userId, existingUser.id))
                .get();
            expect(afterUpdate2?.password).not.toBe(originalPasswordHash); // Password changed
            // Better-Auth uses scrypt with format: salt:hash (both hex strings)
            expect(afterUpdate2?.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/i);
        });

        it('should update is_active status correctly', async () => {
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue(createMockSession());

            const { user } = await import('@/lib/database/schema');
            const { eq } = await import('drizzle-orm');
            const existingUser = testDb.select().from(user).limit(1).get();
            if (existingUser === undefined) {
                throw new Error(TEST_SETUP_ERROR);
            }

            // Deactivate user
            const formData = new FormData();
            formData.append('id', existingUser.id);
            formData.append('name', existingUser.name);
            formData.append('is_active', 'false');

            try {
                await updateUser(null, formData);
            } catch {
                // Expected redirect
            }

            const updatedUser = testDb.select().from(user).where(eq(user.id, existingUser.id)).get();
            expect(updatedUser?.isActive).toBe(false);
        });
    });
});
