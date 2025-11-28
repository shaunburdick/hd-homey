import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser, updateUser } from './users';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
import { AuthRoles } from '@/lib/auth-roles';
import type { DB } from '@/lib/database/db';
import * as authModule from '@/lib/auth/helpers';

// Mock Next.js functions
vi.mock('next/navigation', () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT: ${url}`);
    })
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}));

let testDb: DB;

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
}));

const { refreshDb } = setupTestDatabase();

describe('User Actions', () => {
    // Test constants
    const TEST_ADMIN_USERNAME = 'admin';
    const TEST_ADMIN_NAME = 'Admin User';
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
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue({
                user: {
                    id: '1',
                    username: TEST_ADMIN_USERNAME,
                    name: TEST_ADMIN_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            const formData = new FormData();
            formData.append('username', 'newuser');
            formData.append('name', 'New User');
            formData.append('password', 'password123');
            formData.append('role', AuthRoles.Viewer);

            try {
                await createUser(null, formData);
                // Should redirect, so we shouldn't reach here
                expect.fail('Expected redirect to be thrown');
            } catch (error) {
                // Verify redirect was called
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('NEXT_REDIRECT');
                expect((error as Error).message).toContain('/users/');
            }

            // Verify user was created in database
            const { users } = await import('@/lib/database/schema');
            const { eq } = await import('drizzle-orm');
            const createdUser = testDb.select().from(users).where(eq(users.username, 'newuser')).get();

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
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue({
                user: {
                    id: '1',
                    username: TEST_ADMIN_USERNAME,
                    name: TEST_ADMIN_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

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
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue({
                user: {
                    id: '1',
                    username: TEST_ADMIN_USERNAME,
                    name: TEST_ADMIN_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

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

            const { users } = await import('@/lib/database/schema');
            const { eq } = await import('drizzle-orm');
            const createdUser = testDb.select().from(users).where(eq(users.username, username)).get();

            expect(createdUser).toBeDefined();
            expect(createdUser?.passHash).not.toBe(plainPassword);
            expect(createdUser?.passHash).toMatch(/^\$2[ab]\$/); // bcrypt format
        });
    });

    describe('updateUser', () => {
        it('should update user when authenticated as admin', async () => {
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue({
                user: {
                    id: '1',
                    username: TEST_ADMIN_USERNAME,
                    name: TEST_ADMIN_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            // Get existing user ID
            const { users } = await import('@/lib/database/schema');
            const existingUser = testDb.select().from(users).limit(1).get();
            if (existingUser === undefined) {
                throw new Error(TEST_SETUP_ERROR);
            }

            const formData = new FormData();
            formData.append('id', existingUser.id.toString());
            formData.append('name', TEST_UPDATED_NAME);
            formData.append('is_active', TEST_ACTIVE_VALUE);

            try {
                await updateUser(null, formData);
                expect.fail('Expected redirect to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('NEXT_REDIRECT');
                expect((error as Error).message).toContain(`/users/${existingUser.id}`);
            }

            // Verify user was updated
            const { eq } = await import('drizzle-orm');
            const updatedUser = testDb.select().from(users).where(eq(users.id, existingUser.id)).get();
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
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue({
                user: {
                    id: '1',
                    username: TEST_ADMIN_USERNAME,
                    name: TEST_ADMIN_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            const formData = new FormData();
            formData.append('id', 'invalid');
            formData.append('name', TEST_UPDATED_NAME);

            const result = await updateUser(null, formData);

            expect(result).toEqual([
                { path: 'id', message: 'Invalid user ID' }
            ]);
        });

        it('should update password only when provided', async () => {
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue({
                user: {
                    id: '1',
                    username: TEST_ADMIN_USERNAME,
                    name: TEST_ADMIN_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            const { users } = await import('@/lib/database/schema');
            const existingUser = testDb.select().from(users).limit(1).get();
            if (existingUser === undefined) {
                throw new Error(TEST_SETUP_ERROR);
            }
            const originalPasswordHash = existingUser.passHash;

            // Update without password
            const formData1 = new FormData();
            formData1.append('id', existingUser.id.toString());
            formData1.append('name', 'Name Change 1');
            formData1.append('is_active', TEST_ACTIVE_VALUE);

            try {
                await updateUser(null, formData1);
            } catch {
                // Expected redirect
            }

            const { eq } = await import('drizzle-orm');
            const afterUpdate1 = testDb.select().from(users).where(eq(users.id, existingUser.id)).get();
            expect(afterUpdate1?.passHash).toBe(originalPasswordHash); // Password unchanged

            // Update with password
            const formData2 = new FormData();
            formData2.append('id', existingUser.id.toString());
            formData2.append('name', 'Name Change 2');
            formData2.append('password', 'newPassword123');
            formData2.append('is_active', TEST_ACTIVE_VALUE);

            try {
                await updateUser(null, formData2);
            } catch {
                // Expected redirect
            }

            const afterUpdate2 = testDb.select().from(users).where(eq(users.id, existingUser.id)).get();
            expect(afterUpdate2?.passHash).not.toBe(originalPasswordHash); // Password changed
            expect(afterUpdate2?.passHash).toMatch(/^\$2[ab]\$/);
        });

        it('should update is_active status correctly', async () => {
            vi.spyOn(authModule, 'requireAdmin').mockResolvedValue({
                user: {
                    id: '1',
                    username: TEST_ADMIN_USERNAME,
                    name: TEST_ADMIN_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            const { users } = await import('@/lib/database/schema');
            const { eq } = await import('drizzle-orm');
            const existingUser = testDb.select().from(users).limit(1).get();
            if (existingUser === undefined) {
                throw new Error(TEST_SETUP_ERROR);
            }

            // Deactivate user
            const formData = new FormData();
            formData.append('id', existingUser.id.toString());
            formData.append('name', existingUser.name);
            formData.append('is_active', 'false');

            try {
                await updateUser(null, formData);
            } catch {
                // Expected redirect
            }

            const updatedUser = testDb.select().from(users).where(eq(users.id, existingUser.id)).get();
            expect(updatedUser?.is_active).toBe(false);
        });
    });
});
