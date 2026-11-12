import { describe, it, expect, vi, afterEach } from 'vitest';

const VERSION_JSON_MODULE = '../../version.json';

describe('getVersionMetadata validation', () => {
    afterEach(() => {
        vi.doUnmock(VERSION_JSON_MODULE);
        vi.resetModules();
    });

    it('throws when version.json is incomplete', async () => {
        vi.resetModules();
        vi.doMock(VERSION_JSON_MODULE, () => ({
            default: { version: '1.0.0-beta.6' },
        }));

        const { getVersionMetadata } = await import('./version');

        expect(() => getVersionMetadata()).toThrow(/Invalid build metadata/);
    });

    it('throws when environment is not a known value', async () => {
        vi.resetModules();
        vi.doMock(VERSION_JSON_MODULE, () => ({
            default: {
                version: '1.0.0-beta.6',
                commit: 'abc1234',
                branch: 'main',
                buildDate: '2026-06-20T13:00:00.000Z',
                environment: 'staging',
            },
        }));

        const { getVersionMetadata } = await import('./version');

        expect(() => getVersionMetadata()).toThrow(/Invalid build metadata/);
    });
});
