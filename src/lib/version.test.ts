import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getVersion', () => {
    let originalEnv: typeof process.env;

    beforeEach(() => {
        originalEnv = process.env;
        vi.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should return version from npm_package_version environment variable when available', async () => {
        process.env.npm_package_version = '2.0.0-test';

        const { getVersion } = await import('./version');

        expect(getVersion()).toBe('2.0.0-test');
    });

    it('should return version from version.json when npm_package_version is not available', async () => {
        delete process.env.npm_package_version;

        const { getVersion } = await import('./version');
        const version = getVersion();

        expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should return fallback version when neither source is available', async () => {
        delete process.env.npm_package_version;

        vi.doMock('../../version.json', () => {
            throw new Error('File not found');
        });

        const { getVersion } = await import('./version');

        expect(getVersion()).toBe('1.0.0-beta.5');
    });
});
