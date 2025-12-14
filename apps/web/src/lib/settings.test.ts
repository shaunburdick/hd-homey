import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DB } from './database/db';
import {
    generateStreamSecret,
    getSetting,
    getSettings,
    setSetting,
    setSettings,
} from './settings';
import { setupTestDatabase } from '@/test-utils/setup-test-db';

let testDb: DB;

vi.mock('./database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
}));

const { refreshDb } = setupTestDatabase();

describe('Settings', () => {
    beforeEach(async () => {
        testDb = await refreshDb();
    });

    describe('generateStreamSecret', () => {
        it('should generate a 64-character hex string', () => {
            const secret = generateStreamSecret();
            expect(secret).toHaveLength(64);
            expect(secret).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should generate unique secrets', () => {
            const secret1 = generateStreamSecret();
            const secret2 = generateStreamSecret();
            expect(secret1).not.toEqual(secret2);
        });

        it('should generate cryptographically random secrets', () => {
            const secrets = new Set();
            for (let i = 0; i < 10; i++) {
                secrets.add(generateStreamSecret());
            }
            expect(secrets.size).toBe(10);
        });
    });

    describe('getSetting', () => {
        it('should return null for non-existent setting', async () => {
            const value = await getSetting('non.existent');
            expect(value).toBeNull();
        });

        it('should return setting value', async () => {
            await setSetting('test.key', 'test-value');
            const value = await getSetting('test.key');
            expect(value).toBe('test-value');
        });
    });

    describe('setSetting', () => {
        it('should create new setting', async () => {
            await setSetting('new.key', 'new-value');
            const value = await getSetting('new.key');
            expect(value).toBe('new-value');
        });

        it('should update existing setting', async () => {
            const testKey = 'update.key';
            await setSetting(testKey, 'old-value');
            await setSetting(testKey, 'new-value');
            const value = await getSetting(testKey);
            expect(value).toBe('new-value');
        });
    });

    describe('getSettings', () => {
        it('should return empty object for empty keys array', async () => {
            const values = await getSettings([]);
            expect(values).toEqual({});
        });

        it('should return null for non-existent settings', async () => {
            const values = await getSettings(['non.existent1', 'non.existent2']);
            expect(values).toEqual({
                'non.existent1': null,
                'non.existent2': null,
            });
        });

        it('should return multiple settings in single query', async () => {
            await setSetting('batch.key1', 'value1');
            await setSetting('batch.key2', 'value2');
            await setSetting('batch.key3', 'value3');

            const values = await getSettings(['batch.key1', 'batch.key2', 'batch.key3']);
            expect(values).toEqual({
                'batch.key1': 'value1',
                'batch.key2': 'value2',
                'batch.key3': 'value3',
            });
        });

        it('should return mix of existing and non-existent settings', async () => {
            await setSetting('exists.key', 'exists-value');

            const values = await getSettings(['exists.key', 'missing.key']);
            expect(values).toEqual({
                'exists.key': 'exists-value',
                'missing.key': null,
            });
        });
    });

    describe('setSettings', () => {
        it('should do nothing for empty object', async () => {
            const {  settings: settingsTable } = await import('./database/schema');
            const beforeCount = (await testDb.select().from(settingsTable)).length;
            await setSettings({});
            const afterCount = (await testDb.select().from(settingsTable)).length;
            expect(afterCount).toBe(beforeCount);
        });

        it('should create multiple new settings', async () => {
            await setSettings({
                'multi.key1': 'value1',
                'multi.key2': 'value2',
                'multi.key3': 'value3',
            });

            const values = await getSettings(['multi.key1', 'multi.key2', 'multi.key3']);
            expect(values).toEqual({
                'multi.key1': 'value1',
                'multi.key2': 'value2',
                'multi.key3': 'value3',
            });
        });

        it('should update existing settings', async () => {
            await setSettings({
                'update.key1': 'old1',
                'update.key2': 'old2',
            });

            await setSettings({
                'update.key1': 'new1',
                'update.key2': 'new2',
            });

            const values = await getSettings(['update.key1', 'update.key2']);
            expect(values).toEqual({
                'update.key1': 'new1',
                'update.key2': 'new2',
            });
        });

        it('should handle mix of new and existing settings', async () => {
            await setSetting('existing.key', 'old-value');

            await setSettings({
                'existing.key': 'updated-value',
                'new.key': 'new-value',
            });

            const values = await getSettings(['existing.key', 'new.key']);
            expect(values).toEqual({
                'existing.key': 'updated-value',
                'new.key': 'new-value',
            });
        });
    });
});
