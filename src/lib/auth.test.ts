import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAdmin, requireRole, AuthRoles } from './auth/helpers';
import { auth } from './auth/auth';
import { createMockSession } from '@/test-utils/mock-auth';

// Test constants
const NOT_AUTHENTICATED_ERROR = 'Not authenticated';

// Mock the auth module
vi.mock('./auth/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn()
        }
    },
}));

describe('Authorization Helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('requireRole', () => {
        it('should return session when user has required role', async () => {
            const mockSession = createMockSession({
                role: AuthRoles.Admin,
            });

            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            const result = await requireRole(AuthRoles.Admin);
            expect(result).toEqual(mockSession);
        });

        it('should throw error when user is not authenticated', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(null);

            await expect(requireRole(AuthRoles.Admin)).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
        });

        it('should throw error when user does not have required role', async () => {
            const mockSession = createMockSession({
                role: AuthRoles.Viewer,
            });

            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            await expect(requireRole(AuthRoles.Admin)).rejects.toThrow('Unauthorized: requires admin role');
        });

        it('should allow viewer role when viewer is required', async () => {
            const mockSession = createMockSession({
                role: AuthRoles.Viewer,
            });

            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            const result = await requireRole(AuthRoles.Viewer);
            expect(result).toEqual(mockSession);
        });

        it('should throw error with specific role name in message', async () => {
            const mockSession = createMockSession({
                role: AuthRoles.Admin,
            });

            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            try {
                await requireRole(AuthRoles.Viewer);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('viewer');
            }
        });
    });

    describe('requireAdmin', () => {
        it('should return session when user is admin', async () => {
            const mockSession = createMockSession({
                role: AuthRoles.Admin,
            });

            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            const result = await requireAdmin();
            expect(result).toEqual(mockSession);
        });

        it('should throw error when user is not admin', async () => {
            const mockSession = createMockSession({
                role: AuthRoles.Viewer,
            });

            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            await expect(requireAdmin()).rejects.toThrow('Unauthorized: requires admin role');
        });

        it('should throw error when user is not authenticated', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(null);

            await expect(requireAdmin()).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
        });

        it('should be alias for requireRole(AuthRoles.Admin)', async () => {
            const adminSession = createMockSession({
                role: AuthRoles.Admin,
            });

            vi.mocked(auth.api.getSession).mockResolvedValue(adminSession);

            const requireAdminResult = await requireAdmin();
            const requireRoleResult = await requireRole(AuthRoles.Admin);

            expect(requireAdminResult).toEqual(requireRoleResult);
        });
    });

    describe('Authorization Security', () => {
        it('should not accept session without user object', async () => {
            const invalidSession = {
                session: {
                    id: 'session-1',
                    userId: 'user-1',
                    expiresAt: new Date(),
                    token: 'token',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                user: null,
            };

            vi.mocked(auth.api.getSession).mockResolvedValue(invalidSession as never);

            await expect(requireAdmin()).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
        });

        it('should validate role matches exactly', async () => {
            const mockSession = createMockSession({
                role: 'invalid-role' as AuthRoles,
            });

            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            await expect(requireRole(AuthRoles.Admin)).rejects.toThrow();
        });

        it('should handle expired or missing session', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(undefined as never);

            await expect(requireAdmin()).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
        });
    });

    describe('AuthRoles enum', () => {
        it('should have Admin and Viewer roles', () => {
            expect(AuthRoles.Admin).toBeDefined();
            expect(AuthRoles.Viewer).toBeDefined();
        });

        it('should have distinct role values', () => {
            expect(AuthRoles.Admin).not.toBe(AuthRoles.Viewer);
        });

        it('should have string role values', () => {
            expect(typeof AuthRoles.Admin).toBe('string');
            expect(typeof AuthRoles.Viewer).toBe('string');
        });
    });
});
