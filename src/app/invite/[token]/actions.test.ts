/**
 * Unit tests for invitation redemption server action (SPEC-010)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import type { RedeemFormState } from './actions';
import { redeemInvitation } from './actions';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
import type { DB } from '@/lib/database/db';

let testDb: DB;

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
    connection: vi.fn(() => ({})),
}));

const { refreshDb } = setupTestDatabase();

// Mock auth signIn
const mockSignInUsername = vi.fn();
vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            signInUsername: (...args: unknown[]) => mockSignInUsername(...args),
        },
    },
}));

// Mock headers
vi.mock('next/headers', () => ({
    headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// Mock redirect and isRedirectError
const mockRedirect = vi.fn(() => {
    const error = new Error('NEXT_REDIRECT');
    (error as Error & { digest?: string }).digest = 'NEXT_REDIRECT';
    throw error;
});

vi.mock('next/navigation', () => ({
    redirect: () => mockRedirect(),
}));

vi.mock('next/dist/client/components/redirect-error', () => ({
    isRedirectError: (error: unknown) =>
        error instanceof Error &&
        ((error as Error & { digest?: string }).digest === 'NEXT_REDIRECT' || error.message === 'NEXT_REDIRECT'),
}));

// Test constants
const TEST_ADMIN_ID = 'test-admin-uuid';
const INITIAL_FORM_STATE: RedeemFormState = { errors: {} };
const VALID_PASSWORD = 'testpass123';
const FUTURE_EXPIRY = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

describe('redeemInvitation()', () => {
    beforeEach(async () => {
        testDb = await refreshDb({ seed: true });
        vi.clearAllMocks();
        mockSignInUsername.mockResolvedValue({ data: {}, error: null });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully redeem valid invitation', async () => {
        // Create valid invitation
        const { invitations } = await import('@/lib/database/schema');
        const [invitation] = await testDb.insert(invitations).values({
            token: 'valid-token-123',
            role: 'viewer',
            createdBy: TEST_ADMIN_ID,
            createdAt: new Date(),
            expiresAt: FUTURE_EXPIRY,
        }).returning();

        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'newuser');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        // Should redirect on success
        await expect(
            redeemInvitation(invitation.token, INITIAL_FORM_STATE, formData)
        ).rejects.toThrow('NEXT_REDIRECT');

        // Verify user was created
        const { user } = await import('@/lib/database/schema');
        const createdUser = await testDb.query.user.findFirst({
            where: eq(user.username, 'newuser')
        });

        expect(createdUser).toBeDefined();
        expect(createdUser?.username).toBe('newuser');
        expect(createdUser?.name).toBe('New User');
        expect(createdUser?.role).toBe('viewer');
        expect(createdUser?.isActive).toBe(true);

        // Verify invitation was marked as used
        const updatedInvitation = await testDb.query.invitations.findFirst({
            where: eq(invitations.token, invitation.token)
        });

        expect(updatedInvitation?.usedAt).toBeDefined();
        expect(updatedInvitation?.usedBy).toBe(createdUser?.id);

        // Verify sign in was called
        expect(mockSignInUsername).toHaveBeenCalledWith(
            expect.objectContaining({
                body: {
                    username: 'newuser',
                    password: VALID_PASSWORD,
                }
            })
        );
    });

    it('should validate name is required', async () => {
        const formData = new FormData();
        formData.set('username', 'newuser');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.name).toBeDefined();
        expect(result.errors.name[0]).toContain('required');
    });

    it('should validate name minimum length', async () => {
        const formData = new FormData();
        formData.set('name', 'A'); // Too short
        formData.set('username', 'newuser');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.name).toBeDefined();
        expect(result.errors.name[0]).toContain('at least 2 characters');
    });

    it('should validate name maximum length', async () => {
        const formData = new FormData();
        formData.set('name', 'a'.repeat(101)); // Too long
        formData.set('username', 'newuser');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.name).toBeDefined();
        expect(result.errors.name[0]).toContain('100 characters');
    });

    it('should validate username is required', async () => {
        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.username).toBeDefined();
        expect(result.errors.username[0]).toContain('required');
    });

    it('should validate username minimum length', async () => {
        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'ab'); // Too short
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.username).toBeDefined();
        expect(result.errors.username[0]).toContain('at least 3 characters');
    });

    it('should validate username maximum length', async () => {
        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'a'.repeat(51)); // Too long
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.username).toBeDefined();
        expect(result.errors.username[0]).toContain('50 characters');
    });

    it('should validate username format', async () => {
        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'user@invalid'); // Invalid characters
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.username).toBeDefined();
        expect(result.errors.username[0]).toContain('letters, numbers');
    });

    it('should validate password is required', async () => {
        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'newuser');
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.password).toBeDefined();
        expect(result.errors.password[0]).toContain('required');
    });

    it('should validate password minimum length', async () => {
        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'newuser');
        formData.set('password', 'short'); // Too short
        formData.set('passwordConfirm', 'short');

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.password).toBeDefined();
        expect(result.errors.password[0]).toContain('at least 8 characters');
    });

    it('should validate password maximum length', async () => {
        const longPassword = 'a'.repeat(101);
        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'newuser');
        formData.set('password', longPassword);
        formData.set('passwordConfirm', longPassword);

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.password).toBeDefined();
        expect(result.errors.password[0]).toContain('100 characters');
    });

    it('should validate password confirmation is required', async () => {
        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'newuser');
        formData.set('password', VALID_PASSWORD);
        // No passwordConfirm

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.passwordConfirm).toBeDefined();
        expect(result.errors.passwordConfirm[0]).toContain('required');
    });

    it('should validate passwords match', async () => {
        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'newuser');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', 'different-password');

        const result = await redeemInvitation('any-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.passwordConfirm).toBeDefined();
        expect(result.errors.passwordConfirm[0]).toContain('do not match');
    });

    it('should reject invalid invitation token', async () => {
        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'newuser');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation('invalid-token', INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.invitation).toBeDefined();
        expect(result.errors.invitation[0]).toContain('Invalid invitation');
    });

    it('should reject expired invitation', async () => {
        // Create expired invitation
        const { invitations } = await import('@/lib/database/schema');
        const [invitation] = await testDb.insert(invitations).values({
            token: 'expired-token',
            role: 'viewer',
            createdBy: TEST_ADMIN_ID,
            createdAt: new Date('2020-01-01'),
            expiresAt: new Date('2020-01-02'), // Expired
        }).returning();

        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'newuser');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation(invitation.token, INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.invitation).toBeDefined();
        expect(result.errors.invitation[0]).toContain('expired');
    });

    it('should reject already used invitation', async () => {
        // Create used invitation
        const { invitations } = await import('@/lib/database/schema');
        const [invitation] = await testDb.insert(invitations).values({
            token: 'used-token',
            role: 'viewer',
            createdBy: TEST_ADMIN_ID,
            createdAt: new Date(),
            expiresAt: FUTURE_EXPIRY,
            usedAt: new Date(),
            usedBy: 'test-viewer-uuid',
        }).returning();

        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'newuser');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation(invitation.token, INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.invitation).toBeDefined();
        expect(result.errors.invitation[0]).toContain('already been used');
    });

    it('should reject revoked invitation', async () => {
        // Create revoked invitation
        const { invitations } = await import('@/lib/database/schema');
        const [invitation] = await testDb.insert(invitations).values({
            token: 'revoked-token',
            role: 'viewer',
            createdBy: TEST_ADMIN_ID,
            createdAt: new Date(),
            expiresAt: FUTURE_EXPIRY,
            revokedAt: new Date(),
            revokedBy: TEST_ADMIN_ID,
        }).returning();

        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'newuser');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation(invitation.token, INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.invitation).toBeDefined();
        expect(result.errors.invitation[0]).toContain('revoked');
    });

    it('should reject duplicate username', async () => {
        // Create valid invitation
        const { invitations } = await import('@/lib/database/schema');
        const [invitation] = await testDb.insert(invitations).values({
            token: 'valid-token-dup',
            role: 'viewer',
            createdBy: TEST_ADMIN_ID,
            createdAt: new Date(),
            expiresAt: FUTURE_EXPIRY,
        }).returning();

        const formData = new FormData();
        formData.set('name', 'New User');
        formData.set('username', 'admin'); // Already exists in seeded data
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        const result = await redeemInvitation(invitation.token, INITIAL_FORM_STATE, formData);

        expect(result.success).toBe(false);
        expect(result.errors.username).toBeDefined();
        expect(result.errors.username[0]).toContain('already exists');
    });

    it('should inherit role from invitation', async () => {
        // Create admin invitation
        const { invitations } = await import('@/lib/database/schema');
        const [invitation] = await testDb.insert(invitations).values({
            token: 'admin-invite',
            role: 'admin',
            createdBy: TEST_ADMIN_ID,
            createdAt: new Date(),
            expiresAt: FUTURE_EXPIRY,
        }).returning();

        const formData = new FormData();
        formData.set('name', 'New Admin');
        formData.set('username', 'newadmin');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        await expect(
            redeemInvitation(invitation.token, INITIAL_FORM_STATE, formData)
        ).rejects.toThrow('NEXT_REDIRECT');

        // Verify user has admin role
        const { user } = await import('@/lib/database/schema');
        const createdUser = await testDb.query.user.findFirst({
            where: eq(user.username, 'newadmin')
        });

        expect(createdUser?.role).toBe('admin');
    });

    it('should create account record with hashed password', async () => {
        // Create valid invitation
        const { invitations } = await import('@/lib/database/schema');
        const [invitation] = await testDb.insert(invitations).values({
            token: 'password-test',
            role: 'viewer',
            createdBy: TEST_ADMIN_ID,
            createdAt: new Date(),
            expiresAt: FUTURE_EXPIRY,
        }).returning();

        const formData = new FormData();
        formData.set('name', 'Password User');
        formData.set('username', 'passworduser');
        formData.set('password', VALID_PASSWORD);
        formData.set('passwordConfirm', VALID_PASSWORD);

        await expect(
            redeemInvitation(invitation.token, INITIAL_FORM_STATE, formData)
        ).rejects.toThrow('NEXT_REDIRECT');

        // Verify account record exists with hashed password
        const { user, account } = await import('@/lib/database/schema');
        const createdUser = await testDb.query.user.findFirst({
            where: eq(user.username, 'passworduser')
        });

        expect(createdUser).toBeDefined();

        const userAccount = await testDb.query.account.findFirst({
            where: eq(account.userId, createdUser?.id ?? '')
        });

        expect(userAccount).toBeDefined();
        expect(userAccount?.password).toBeDefined();
        expect(userAccount?.password).not.toBe(VALID_PASSWORD); // Should be hashed
        expect(userAccount?.password?.length).toBeGreaterThan(20); // Hashed passwords are long
        expect(userAccount?.providerId).toBe('credential');
    });
});
