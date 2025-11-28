import { describe, it, expect, vi, beforeEach } from 'vitest';
import { changePassword  } from './profile';
import type { FormState } from './profile';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
import { AuthRoles } from '@/lib/auth-roles';
import type { DB } from '@/lib/database/db';
import { auth } from '@/lib/auth/auth';
import { generateHashPassword, verifyPassword } from '@/lib/user';
import { createMockSession } from '@/test-utils/mock-auth';

let testDb: DB;

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
}));

vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        }
    },
}));

const { refreshDb } = setupTestDatabase();

describe('Profile Actions', () => {
    const TEST_USER_ID = 'test-user-uuid-1';
    const TEST_PASSWORD = 'currentPassword123';
    const TEST_NEW_PASSWORD = 'newPassword456';

    beforeEach(async () => {
        testDb = await refreshDb({ seed: true });
        vi.clearAllMocks();
    });

    describe('changePassword', () => {
        it('should successfully change password with valid inputs', async () => {
            // Mock authenticated session
            const mockSession = createMockSession({
                id: TEST_USER_ID,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            // Get the user and set a known password in the account table
            const { account } = await import('@/lib/database/schema');
            const { eq } = await import('drizzle-orm');
            const hashedPassword = await generateHashPassword(TEST_PASSWORD);

            // Insert or update account with password
            await testDb
                .insert(account)
                .values({
                    id: 'account-1',
                    userId: TEST_USER_ID,
                    accountId: TEST_USER_ID,
                    providerId: 'credential',
                    password: hashedPassword,
                })
                .onConflictDoUpdate({
                    target: account.id,
                    set: { password: hashedPassword }
                })
                .run();

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID);
            formData.append('currentPassword', TEST_PASSWORD);
            formData.append('newPassword', TEST_NEW_PASSWORD);
            formData.append('confirmPassword', TEST_NEW_PASSWORD);

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBe(true);
            expect(result.errors).toEqual({} as never);

            // Verify password was changed in account table
            const updatedAccount = testDb.select().from(account).where(eq(account.userId, TEST_USER_ID)).get();
            expect(updatedAccount).toBeDefined();

            if (updatedAccount?.password !== undefined && updatedAccount.password !=== null) {
                const passwordValid = await verifyPassword(updatedAccount.password, TEST_NEW_PASSWORD);
                expect(passwordValid).toBe(true);
            }
        });

        it('should fail when current password is incorrect', async () => {
            const mockSession = createMockSession({
                id: TEST_USER_ID,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID);
            formData.append('currentPassword', 'wrongPassword');
            formData.append('newPassword', TEST_NEW_PASSWORD);
            formData.append('confirmPassword', TEST_NEW_PASSWORD);

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors.currentPassword).toEqual(['Current password is incorrect']);
        });

        it('should fail when passwords do not match', async () => {
            const mockSession = createMockSession({
                id: TEST_USER_ID,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID);
            formData.append('currentPassword', TEST_PASSWORD);
            formData.append('newPassword', TEST_NEW_PASSWORD);
            formData.append('confirmPassword', 'differentPassword');

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors.confirmPassword).toEqual(['Passwords do not match']);
        });

        it('should fail when new password is too short', async () => {
            const mockSession = createMockSession({
                id: TEST_USER_ID,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID);
            formData.append('currentPassword', TEST_PASSWORD);
            formData.append('newPassword', 'short');
            formData.append('confirmPassword', 'short');

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors.newPassword).toEqual(['Password must be at least 8 characters']);
        });

        it('should fail when user is not authenticated', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(null);

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID);
            formData.append('currentPassword', TEST_PASSWORD);
            formData.append('newPassword', TEST_NEW_PASSWORD);
            formData.append('confirmPassword', TEST_NEW_PASSWORD);

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors._form).toEqual(['You must be logged in to change your password']);
        });

        it('should fail when trying to change another user\'s password', async () => {
            const mockSession = createMockSession({
                id: TEST_USER_ID,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            const formData = new FormData();
            formData.append('userId', 'different-user-id'); // Different user ID
            formData.append('currentPassword', TEST_PASSWORD);
            formData.append('newPassword', TEST_NEW_PASSWORD);
            formData.append('confirmPassword', TEST_NEW_PASSWORD);

            const result: FormState = await changePassword({ errors: {} }, formData);

            expect(result.success).toBeUndefined();
            expect(result.errors._form).toEqual(['You can only change your own password']);
        });

        it('should fail when required fields are empty', async () => {
            const mockSession = createMockSession({
                id: TEST_USER_ID,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            const formData = new FormData();
            formData.append('userId', TEST_USER_ID);
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
