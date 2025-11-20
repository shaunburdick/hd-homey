import { describe, it, expect, vi, beforeEach } from 'vitest';
import { changePassword  } from './profile';
import type { FormState } from './profile';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
import { AuthRoles } from '@/lib/auth-roles';
import type { DB } from '@/lib/database/db';
import * as authModule from '@/auth';
import { generateHashPassword, verifyPassword } from '@/lib/user';

let testDb: DB;

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
}));

const { refreshDb } = setupTestDatabase();

describe('Profile Actions', () => {
    const TEST_USER_ID = 1;
    const TEST_PASSWORD = 'currentPassword123';
    const TEST_NEW_PASSWORD = 'newPassword456';

    beforeEach(async () => {
        testDb = await refreshDb({ seed: true });
        vi.clearAllMocks();
    });

    describe('changePassword', () => {
        it('should successfully change password with valid inputs', async () => {
            // Mock authenticated session
            vi.spyOn(authModule, 'auth').mockResolvedValue({
                user: {
                    id: TEST_USER_ID,
                    username: 'testuser',
                    name: 'Test User',
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            } as never);

            // Get the user and set a known password
            const { users } = await import('@/lib/database/schema');
            const { eq } = await import('drizzle-orm');
            const hashedPassword = await generateHashPassword(TEST_PASSWORD);

            await testDb
                .update(users)
                .set({ passHash: hashedPassword })
                .where(eq(users.id, TEST_USER_ID))
                .run();

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID.toString());
            formData.append('currentPassword', TEST_PASSWORD);
            formData.append('newPassword', TEST_NEW_PASSWORD);
            formData.append('confirmPassword', TEST_NEW_PASSWORD);

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBe(true);
            expect(result.errors).toEqual({} as never);

            // Verify password was changed
            const updatedUser = testDb.select().from(users).where(eq(users.id, TEST_USER_ID)).get();
            expect(updatedUser).toBeDefined();

            if (updatedUser !== undefined) {
                const passwordValid = await verifyPassword(updatedUser.passHash, TEST_NEW_PASSWORD);
                expect(passwordValid).toBe(true);
            }
        });

        it('should fail when current password is incorrect', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue({
                user: {
                    id: TEST_USER_ID,
                    username: 'testuser',
                    name: 'Test User',
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            } as never);

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID.toString());
            formData.append('currentPassword', 'wrongPassword');
            formData.append('newPassword', TEST_NEW_PASSWORD);
            formData.append('confirmPassword', TEST_NEW_PASSWORD);

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors.currentPassword).toEqual(['Current password is incorrect']);
        });

        it('should fail when passwords do not match', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue({
                user: {
                    id: TEST_USER_ID,
                    username: 'testuser',
                    name: 'Test User',
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            } as never);

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID.toString());
            formData.append('currentPassword', TEST_PASSWORD);
            formData.append('newPassword', TEST_NEW_PASSWORD);
            formData.append('confirmPassword', 'differentPassword');

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors.confirmPassword).toEqual(['Passwords do not match']);
        });

        it('should fail when new password is too short', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue({
                user: {
                    id: TEST_USER_ID,
                    username: 'testuser',
                    name: 'Test User',
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            } as never);

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID.toString());
            formData.append('currentPassword', TEST_PASSWORD);
            formData.append('newPassword', 'short');
            formData.append('confirmPassword', 'short');

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors.newPassword).toEqual(['Password must be at least 8 characters']);
        });

        it('should fail when user is not authenticated', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue(null as never);

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID.toString());
            formData.append('currentPassword', TEST_PASSWORD);
            formData.append('newPassword', TEST_NEW_PASSWORD);
            formData.append('confirmPassword', TEST_NEW_PASSWORD);

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors._form).toEqual(['You must be logged in to change your password']);
        });

        it('should fail when trying to change another user\'s password', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue({
                user: {
                    id: TEST_USER_ID,
                    username: 'testuser',
                    name: 'Test User',
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            } as never);

            const formData = new FormData();
            formData.append('userId', '999'); // Different user ID
            formData.append('currentPassword', TEST_PASSWORD);
            formData.append('newPassword', TEST_NEW_PASSWORD);
            formData.append('confirmPassword', TEST_NEW_PASSWORD);

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors._form).toEqual(['You can only change your own password']);
        });

        it('should fail when required fields are empty', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue({
                user: {
                    id: TEST_USER_ID,
                    username: 'testuser',
                    name: 'Test User',
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            } as never);

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID.toString());
            formData.append('currentPassword', '');
            formData.append('newPassword', '');
            formData.append('confirmPassword', '');

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors.currentPassword).toEqual(['Current password is required']);
            expect(result.errors.newPassword).toEqual(['New password is required']);
            expect(result.errors.confirmPassword).toEqual(['Please confirm your new password']);
        });
    });
});
