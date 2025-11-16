import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAdmin, requireRole, AuthRoles } from './auth';
import * as authModule from '@/auth';

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
            const mockSession = {
                user: {
                    id: '1',
                    username: 'admin',
                    name: 'Admin User',
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession);

            const result = await requireRole(AuthRoles.Admin);
            expect(result).toEqual(mockSession);
        });

        it('should throw error when user is not authenticated', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue(null);

            await expect(requireRole(AuthRoles.Admin)).rejects.toThrow('Not authenticated');
        });

        it('should throw error when user does not have required role', async () => {
            const mockSession = {
                user: {
                    id: '1',
                    username: 'viewer',
                    name: 'Viewer User',
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession);

            await expect(requireRole(AuthRoles.Admin)).rejects.toThrow('Unauthorized: requires admin role');
        });

        it('should allow viewer role when viewer is required', async () => {
            const mockSession = {
                user: {
                    id: '2',
                    username: 'viewer',
                    name: 'Viewer User',
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession);

            const result = await requireRole(AuthRoles.Viewer);
            expect(result).toEqual(mockSession);
        });

        it('should throw error with specific role name in message', async () => {
            const mockSession = {
                user: {
                    id: '1',
                    username: 'admin',
                    name: 'Admin User',
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession);

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
            const mockSession = {
                user: {
                    id: '1',
                    username: 'admin',
                    name: 'Admin User',
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession);

            const result = await requireAdmin();
            expect(result).toEqual(mockSession);
        });

        it('should throw error when user is not admin', async () => {
            const mockSession = {
                user: {
                    id: '2',
                    username: 'viewer',
                    name: 'Viewer User',
                    role: AuthRoles.Viewer,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession);

            await expect(requireAdmin()).rejects.toThrow('Unauthorized: requires admin role');
        });

        it('should throw error when user is not authenticated', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue(null);

            await expect(requireAdmin()).rejects.toThrow('Not authenticated');
        });

        it('should be alias for requireRole(AuthRoles.Admin)', async () => {
            const adminSession = {
                user: {
                    id: '1',
                    username: 'admin',
                    name: 'Admin User',
                    role: AuthRoles.Admin,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(adminSession);

            const requireAdminResult = await requireAdmin();
            const requireRoleResult = await requireRole(AuthRoles.Admin);

            expect(requireAdminResult).toEqual(requireRoleResult);
        });
    });

    describe('Authorization Security', () => {
        it('should not accept session without user object', async () => {
            const invalidSession = {
                user: null,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(invalidSession as never);

            await expect(requireAdmin()).rejects.toThrow('Not authenticated');
        });

        it('should validate role matches exactly', async () => {
            const mockSession = {
                user: {
                    id: '1',
                    username: 'user',
                    name: 'User',
                    role: 'invalid-role' as AuthRoles,
                    is_active: true
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            vi.spyOn(authModule, 'auth').mockResolvedValue(mockSession);

            await expect(requireRole(AuthRoles.Admin)).rejects.toThrow();
        });

        it('should handle expired or missing session', async () => {
            vi.spyOn(authModule, 'auth').mockResolvedValue(undefined as never);

            await expect(requireAdmin()).rejects.toThrow('Not authenticated');
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
