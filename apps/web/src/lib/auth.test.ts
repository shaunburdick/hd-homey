import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAdmin, requireRole, AuthRoles } from './auth/helpers';
import { auth, resolveUseSecureCookies } from './auth/auth';
import { createMockSession } from '@/test-utils/mock-auth';

// Test constants
const NOT_AUTHENTICATED_ERROR = 'Not authenticated';

// Mock the auth module — we only mock `auth` for the helper tests,
// but keep the actual `resolveUseSecureCookies` function for unit testing
vi.mock('./auth/auth', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Needed to spread module
    const mod = await importOriginal() as object;
    return {
        ...mod,
        auth: {
            api: {
                getSession: vi.fn()
            }
        },
    };
});

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

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- mock type coercion
            vi.mocked(auth.api.getSession).mockResolvedValue(invalidSession as never);

            await expect(requireAdmin()).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
        });

        it('should validate role matches exactly', async () => {
            const mockSession = createMockSession({
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- mock type coercion
                role: 'invalid-role' as AuthRoles,
            });

            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            await expect(requireRole(AuthRoles.Admin)).rejects.toThrow();
        });

        it('should handle expired or missing session', async () => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- mock type coercion
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

describe('resolveUseSecureCookies', () => {
    describe('default behavior (no AUTH_SECURE_COOKIES override)', () => {
        it('should return true when NODE_ENV is production', () => {
            expect(resolveUseSecureCookies(undefined, 'production')).toBe(true);
        });

        it('should return false when NODE_ENV is development', () => {
            expect(resolveUseSecureCookies(undefined, 'development')).toBe(false);
        });

        it('should return false when NODE_ENV is test', () => {
            expect(resolveUseSecureCookies(undefined, 'test')).toBe(false);
        });

        it('should return false when NODE_ENV is undefined', () => {
            // eslint-disable-next-line unicorn/no-useless-undefined -- Explicitly testing default param behavior
            expect(resolveUseSecureCookies(undefined, undefined)).toBe(false);
        });

        it('should treat empty string as unset and fall back to NODE_ENV', () => {
            expect(resolveUseSecureCookies('', 'production')).toBe(true);
            expect(resolveUseSecureCookies('', 'development')).toBe(false);
        });
    });

    describe('with AUTH_SECURE_COOKIES override', () => {
        it('should return false when AUTH_SECURE_COOKIES is "false" in production', () => {
            // This is the fix for Issue #35
            expect(resolveUseSecureCookies('false', 'production')).toBe(false);
        });

        it('should return false when AUTH_SECURE_COOKIES is "false" in development', () => {
            expect(resolveUseSecureCookies('false', 'development')).toBe(false);
        });

        it('should return true when AUTH_SECURE_COOKIES is "true" in development', () => {
            expect(resolveUseSecureCookies('true', 'development')).toBe(true);
        });

        it('should return true when AUTH_SECURE_COOKIES is "true" in production', () => {
            expect(resolveUseSecureCookies('true', 'production')).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should treat unknown values as false (case-sensitive)', () => {
            expect(resolveUseSecureCookies('TRUE', 'production')).toBe(false);
            expect(resolveUseSecureCookies('FALSE', 'production')).toBe(false);
            expect(resolveUseSecureCookies('yes', 'production')).toBe(false);
            expect(resolveUseSecureCookies('1', 'production')).toBe(false);
            expect(resolveUseSecureCookies('invalid', 'production')).toBe(false);
        });

        it('should handle undefined NODE_ENV when override is absent', () => {
            // eslint-disable-next-line unicorn/no-useless-undefined -- Explicitly testing default param behavior
            expect(resolveUseSecureCookies(undefined, undefined)).toBe(false);
        });

        it('should handle undefined NODE_ENV when override is set', () => {
            // eslint-disable-next-line unicorn/no-useless-undefined -- Explicitly testing default param behavior
            expect(resolveUseSecureCookies('false', undefined)).toBe(false);
            // eslint-disable-next-line unicorn/no-useless-undefined -- Explicitly testing default param behavior
            expect(resolveUseSecureCookies('true', undefined)).toBe(true);
        });
    });
});
