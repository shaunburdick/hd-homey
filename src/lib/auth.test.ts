import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from 'next-auth';
import { requireAdmin, requireRole, AuthRoles } from './auth';
import * as authModule from '@/auth';

// Test constants
const TEST_ADMIN = 'admin';
const TEST_VIEWER_ROLE = 'viewer';
const ADMIN_USER_NAME = 'Admin User';
const VIEWER_USER_NAME = 'Viewer User';
const NOT_AUTHENTICATED_ERROR = 'Not authenticated';

// Mock the auth module
vi.mock('@/auth', () => ({
    auth: vi.fn()
}));

describe('Authorization Helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('requireRole', () => {
        it('should return session when user has required role', async () => {
            const mockSession: Session = {
                user: {
                    id: '1',
                    username: TEST_ADMIN,
                    name: ADMIN_USER_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession as never);

            const result = await requireRole(AuthRoles.Admin);
            expect(result).toEqual(mockSession);
        });

        it('should throw error when user is not authenticated', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue(null as never);

            await expect(requireRole(AuthRoles.Admin)).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
        });

        it('should throw error when user does not have required role', async () => {
            const mockSession: Session = {
                user: {
                    id: '1',
                    username: TEST_VIEWER_ROLE,
                    name: VIEWER_USER_NAME,
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession as never);

            await expect(requireRole(AuthRoles.Admin)).rejects.toThrow('Unauthorized: requires admin role');
        });

        it('should allow viewer role when viewer is required', async () => {
            const mockSession: Session = {
                user: {
                    id: '2',
                    username: TEST_VIEWER_ROLE,
                    name: VIEWER_USER_NAME,
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession as never);

            const result = await requireRole(AuthRoles.Viewer);
            expect(result).toEqual(mockSession);
        });

        it('should throw error with specific role name in message', async () => {
            const mockSession: Session = {
                user: {
                    id: '1',
                    username: TEST_ADMIN,
                    name: ADMIN_USER_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession as never);

            try {
                await requireRole(AuthRoles.Viewer);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain(TEST_VIEWER_ROLE);
            }
        });
    });

    describe('requireAdmin', () => {
        it('should return session when user is admin', async () => {
            const mockSession: Session = {
                user: {
                    id: '1',
                    username: TEST_ADMIN,
                    name: ADMIN_USER_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession as never);

            const result = await requireAdmin();
            expect(result).toEqual(mockSession);
        });

        it('should throw error when user is not admin', async () => {
            const mockSession: Session = {
                user: {
                    id: '2',
                    username: TEST_VIEWER_ROLE,
                    name: VIEWER_USER_NAME,
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession as never);

            await expect(requireAdmin()).rejects.toThrow('Unauthorized: requires admin role');
        });

        it('should throw error when user is not authenticated', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue(null as never);

            await expect(requireAdmin()).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
        });

        it('should be alias for requireRole(AuthRoles.Admin)', async () => {
            const adminSession: Session = {
                user: {
                    id: '1',
                    username: TEST_ADMIN,
                    name: ADMIN_USER_NAME,
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(adminSession as never);

            const requireAdminResult = await requireAdmin();
            const requireRoleResult = await requireRole(AuthRoles.Admin);

            expect(requireAdminResult).toEqual(requireRoleResult);
        });
    });

    describe('Authorization Security', () => {
        it('should not accept session without user object', async () => {
            const invalidSession: Partial<Session> = {
                user: null,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(invalidSession as never);

            await expect(requireAdmin()).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
        });

        it('should validate role matches exactly', async () => {
            const mockSession: Session = {
                user: {
                    id: '1',
                    username: 'user',
                    name: 'User',
                    role: 'invalid-role' as AuthRoles,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession as never);

            await expect(requireRole(AuthRoles.Admin)).rejects.toThrow();
        });

        it('should handle expired or missing session', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue(undefined as never);

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
