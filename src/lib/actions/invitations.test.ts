/**
 * Unit tests for invitation server actions (SPEC-010)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { InvitationFormState } from './invitations';
import {
    createInvitation,
    revokeInvitation,
    listInvitations,
} from './invitations';
import { InvitationStatus } from '@/lib/invitations/types';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
import type { DB } from '@/lib/database/db';

let testDb: DB;

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
    connection: vi.fn(() => ({})),
}));

const { refreshDb } = setupTestDatabase();

// Mock auth helpers
const mockRequireAdmin = vi.fn();
vi.mock('@/lib/auth/helpers', () => ({
    requireAdmin: () => mockRequireAdmin(),
}));

// Mock revalidatePath
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

// Test constants
const TEST_ADMIN_ID = 'test-admin-uuid';
const INITIAL_FORM_STATE: InvitationFormState = { errors: {} };
const UNAUTHORIZED_ERROR = 'Unauthorized';
const CANNOT_BE_REVOKED = 'cannot be revoked';
const FUTURE_EXPIRY = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const ROLE_VIEWER = 'viewer';

describe('Invitation Server Actions', () => {
    beforeEach(async () => {
        testDb = await refreshDb({ seed: true });
        vi.clearAllMocks();

        // Default: mock admin session
        mockRequireAdmin.mockResolvedValue({
            user: { id: TEST_ADMIN_ID, role: 'admin' }
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('createInvitation()', () => {
        it('should create invitation with valid data', async () => {
            const formData = new FormData();
            formData.set('role', ROLE_VIEWER);
            formData.set('note', 'Test invitation');

            const initialState= INITIAL_FORM_STATE;
            const result = await createInvitation(initialState, formData);

            expect(result.success).toBe(true);
            expect(result.errors).toEqual({});
            expect(result.invitation).toBeDefined();
            expect(result.invitation?.token).toBeDefined();
            expect(result.invitation?.url).toContain('/invite/');
            expect(result.invitation?.url).toContain(result.invitation?.token);
        });

        it('should create invitation without note', async () => {
            const formData = new FormData();
            formData.set('role', 'admin');

            const initialState= INITIAL_FORM_STATE;
            const result = await createInvitation(initialState, formData);

            expect(result.success).toBe(true);
            expect(result.invitation).toBeDefined();
        });

        it('should reject unauthorized user when creating invitation', async () => {
            mockRequireAdmin.mockRejectedValue(new Error(UNAUTHORIZED_ERROR));

            const formData = new FormData();
            formData.set('role', ROLE_VIEWER);

            const initialState= INITIAL_FORM_STATE;
            const result = await createInvitation(initialState, formData);

            expect(result.success).toBe(false);
            expect(result.errors.authorization).toBeDefined();
            expect(result.errors.authorization[0]).toContain(UNAUTHORIZED_ERROR);
        });

        it('should validate role field', async () => {
            const formData = new FormData();
            formData.set('role', 'invalid-role');

            const initialState= INITIAL_FORM_STATE;
            const result = await createInvitation(initialState, formData);

            expect(result.success).toBe(false);
            expect(result.errors.role).toBeDefined();
            expect(result.errors.role[0]).toContain('Invalid role');
        });

        it('should validate missing role', async () => {
            const formData = new FormData();
            // No role set

            const initialState= INITIAL_FORM_STATE;
            const result = await createInvitation(initialState, formData);

            expect(result.success).toBe(false);
            expect(result.errors.role).toBeDefined();
        });

        it('should validate note length', async () => {
            const formData = new FormData();
            formData.set('role', ROLE_VIEWER);
            formData.set('note', 'a'.repeat(201)); // 201 characters

            const initialState= INITIAL_FORM_STATE;
            const result = await createInvitation(initialState, formData);

            expect(result.success).toBe(false);
            expect(result.errors.note).toBeDefined();
            expect(result.errors.note[0]).toContain('200 characters');
        });

        it('should accept note at max length', async () => {
            const formData = new FormData();
            formData.set('role', ROLE_VIEWER);
            formData.set('note', 'a'.repeat(200)); // Exactly 200 characters

            const initialState= INITIAL_FORM_STATE;
            const result = await createInvitation(initialState, formData);

            expect(result.success).toBe(true);
        });

        it('should store invitation in database', async () => {
            const formData = new FormData();
            formData.set('role', ROLE_VIEWER);
            formData.set('note', 'Database test');

            const initialState= INITIAL_FORM_STATE;
            const result = await createInvitation(initialState, formData);

            expect(result.success).toBe(true);

            // Verify in database
            const invitation = await testDb.query.invitations.findFirst({
                where: (inv, { eq }) => eq(inv.token, result.invitation?.token ?? '')
            });

            expect(invitation).toBeDefined();
            expect(invitation?.role).toBe('viewer');
            expect(invitation?.note).toBe('Database test');
            expect(invitation?.createdBy).toBe(TEST_ADMIN_ID);
        });
    });

    describe('revokeInvitation()', () => {
        it('should revoke pending invitation', async () => {
            // Create invitation first
            const { invitations } = await import('@/lib/database/schema');
            const [invitation] = await testDb.insert(invitations).values({
                token: 'test-token-revoke',
                role: ROLE_VIEWER,
                createdBy: TEST_ADMIN_ID,
                createdAt: new Date(),
                expiresAt: FUTURE_EXPIRY,
            }).returning();

            const result = await revokeInvitation(invitation.id);

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();

            // Verify in database
            const updated = await testDb.query.invitations.findFirst({
                where: (inv, { eq }) => eq(inv.id, invitation.id)
            });

            expect(updated?.revokedAt).toBeDefined();
            expect(updated?.revokedBy).toBe(TEST_ADMIN_ID);
        });

        it('should reject unauthorized user when revoking invitation', async () => {
            mockRequireAdmin.mockRejectedValue(new Error(UNAUTHORIZED_ERROR));

            const result = await revokeInvitation(999);

            expect(result.success).toBe(false);
            expect(result.error).toContain(UNAUTHORIZED_ERROR);
        });

        it('should handle non-existent invitation', async () => {
            const result = await revokeInvitation(99999);

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should reject revoking used invitation', async () => {
            // Create used invitation
            const { invitations } = await import('@/lib/database/schema');
            const [invitation] = await testDb.insert(invitations).values({
                token: 'test-token-used',
                role: ROLE_VIEWER,
                createdBy: TEST_ADMIN_ID,
                createdAt: new Date(),
                expiresAt: FUTURE_EXPIRY,
                usedAt: new Date(),
                usedBy: 'test-viewer-uuid',
            }).returning();

            const result = await revokeInvitation(invitation.id);

            expect(result.success).toBe(false);
            expect(result.error).toContain(CANNOT_BE_REVOKED);
        });

        it('should reject revoking expired invitation', async () => {
            // Create expired invitation
            const { invitations } = await import('@/lib/database/schema');
            const [invitation] = await testDb.insert(invitations).values({
                token: 'test-token-expired',
                role: ROLE_VIEWER,
                createdBy: TEST_ADMIN_ID,
                createdAt: new Date('2020-01-01'),
                expiresAt: new Date('2020-01-02'), // Expired
            }).returning();

            const result = await revokeInvitation(invitation.id);

            expect(result.success).toBe(false);
            expect(result.error).toContain(CANNOT_BE_REVOKED);
        });

        it('should reject revoking already revoked invitation', async () => {
            // Create revoked invitation
            const { invitations } = await import('@/lib/database/schema');
            const [invitation] = await testDb.insert(invitations).values({
                token: 'test-token-already-revoked',
                role: ROLE_VIEWER,
                createdBy: TEST_ADMIN_ID,
                createdAt: new Date(),
                expiresAt: FUTURE_EXPIRY,
                revokedAt: new Date(),
                revokedBy: TEST_ADMIN_ID,
            }).returning();

            const result = await revokeInvitation(invitation.id);

            expect(result.success).toBe(false);
            expect(result.error).toContain(CANNOT_BE_REVOKED);
        });
    });

    describe('listInvitations()', () => {
        it('should list all invitations for admin', async () => {
            // Create test invitations
            const { invitations } = await import('@/lib/database/schema');
            await testDb.insert(invitations).values([
                {
                    token: 'token-1',
                    role: ROLE_VIEWER,
                    createdBy: TEST_ADMIN_ID,
                    createdAt: new Date(),
                    expiresAt: FUTURE_EXPIRY,
                },
                {
                    token: 'token-2',
                    role: 'admin',
                    note: 'Test note',
                    createdBy: TEST_ADMIN_ID,
                    createdAt: new Date(),
                    expiresAt: FUTURE_EXPIRY,
                },
            ]);

            const result = await listInvitations();

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.invitations).toBeDefined();
                expect(result.invitations.length).toBeGreaterThanOrEqual(2);

                // Check structure of first invitation
                const first = result.invitations[0];
                expect(first).toHaveProperty('id');
                expect(first).toHaveProperty('token');
                expect(first).toHaveProperty('role');
                expect(first).toHaveProperty('status');
                expect(first).toHaveProperty('creator');
                expect(first.creator).toHaveProperty('username');
            }
        });

        it('should include status in invitation list', async () => {
            const result = await listInvitations();

            expect(result.success).toBe(true);
            if (result.success && result.invitations.length > 0) {
                const statuses = result.invitations.map(inv => inv.status);
                // Status should be one of the valid values
                for (const status of statuses) {
                    expect(Object.values(InvitationStatus)).toContain(status);
                }
            }
        });

        it('should reject unauthorized user when listing invitations', async () => {
            mockRequireAdmin.mockRejectedValue(new Error(UNAUTHORIZED_ERROR));

            const result = await listInvitations();

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain(UNAUTHORIZED_ERROR);
            }
        });

        it('should handle empty invitation list', async () => {
            // Clean out all invitations
            const { invitations } = await import('@/lib/database/schema');
            await testDb.delete(invitations);

            const result = await listInvitations();

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.invitations).toEqual([]);
            }
        });

        it('should include creator information', async () => {
            // Create invitation
            const { invitations } = await import('@/lib/database/schema');
            await testDb.insert(invitations).values({
                token: 'token-with-creator',
                role: ROLE_VIEWER,
                createdBy: TEST_ADMIN_ID,
                createdAt: new Date(),
                expiresAt: FUTURE_EXPIRY,
            });

            const result = await listInvitations();

            expect(result.success).toBe(true);
            if (result.success) {
                const invitation = result.invitations.find(
                    inv => inv.token === 'token-with-creator'
                );
                expect(invitation).toBeDefined();
                expect(invitation?.creator).toBeDefined();
                expect(invitation?.creator.username).toBe('admin');
                expect(invitation?.creator.name).toBe('Admin User');
            }
        });
    });
});
