/**
 * Unit tests for sse-connection-tracker.ts
 *
 * Tests connection limit enforcement and registration/deregistration lifecycle.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    canOpenConnection,
    registerConnection,
    unregisterConnection,
    getTotalConnectionCount,
    MAX_CONNECTIONS_PER_USER,
    MAX_CONNECTIONS_GLOBAL,
} from './sse-connection-tracker';

// =============================================================================
// Helpers
// =============================================================================

/** Drain all connections for a user by unregistering `count` subscriber IDs */
function drainUser(userId: string, ids: string[]): void {
    for (const id of ids) {
        unregisterConnection(userId, id);
    }
}

// =============================================================================
// Tests
// =============================================================================

describe('sse-connection-tracker', () => {
    // The module uses module-level state, so we drain between tests
    beforeEach(() => {
        // Since the module is a singleton, we can't reset it directly.
        // Instead, we use unique userIds per test to isolate state.
    });

    describe('canOpenConnection', () => {
        it('allows a connection when the user has no existing connections', () => {
            expect(canOpenConnection('fresh-user-1')).toBe(true);
        });

        it('allows connections up to the per-user limit', () => {
            const userId = 'per-user-limit-test';
            const ids: string[] = [];

            for (let i = 0; i < MAX_CONNECTIONS_PER_USER; i++) {
                expect(canOpenConnection(userId)).toBe(true);
                const subId = `sub-${i}`;
                registerConnection(userId, subId);
                ids.push(subId);
            }

            // One over the limit
            expect(canOpenConnection(userId)).toBe(false);

            drainUser(userId, ids);
        });

        it('allows a connection again after dropping below the per-user limit', () => {
            const userId = 'per-user-recover-test';
            const ids: string[] = [];

            for (let i = 0; i < MAX_CONNECTIONS_PER_USER; i++) {
                const subId = `sub-recover-${i}`;
                registerConnection(userId, subId);
                ids.push(subId);
            }

            expect(canOpenConnection(userId)).toBe(false);

            // Release one
            unregisterConnection(userId, ids[0]);
            ids.shift();

            expect(canOpenConnection(userId)).toBe(true);

            drainUser(userId, ids);
        });
    });

    describe('registerConnection / unregisterConnection', () => {
        it('increments and decrements the total connection count', () => {
            const userId = 'count-test-user';
            const before = getTotalConnectionCount();

            registerConnection(userId, 'sub-count-1');
            expect(getTotalConnectionCount()).toBe(before + 1);

            registerConnection(userId, 'sub-count-2');
            expect(getTotalConnectionCount()).toBe(before + 2);

            unregisterConnection(userId, 'sub-count-1');
            expect(getTotalConnectionCount()).toBe(before + 1);

            unregisterConnection(userId, 'sub-count-2');
            expect(getTotalConnectionCount()).toBe(before);
        });

        it('is a no-op when unregistering an unknown userId', () => {
            expect(() => unregisterConnection('nonexistent-user', 'any-id')).not.toThrow();
        });

        it('is a no-op when unregistering an unknown subscriberId', () => {
            const userId = 'partial-unreg-user';
            registerConnection(userId, 'real-sub');
            expect(() => unregisterConnection(userId, 'nonexistent-sub')).not.toThrow();
            unregisterConnection(userId, 'real-sub');
        });

        it('cleans up userId entry when last connection is removed', () => {
            const userId = 'cleanup-user-x';
            registerConnection(userId, 'cleanup-sub-1');
            unregisterConnection(userId, 'cleanup-sub-1');

            // After cleanup, user can open a fresh connection (entry was deleted)
            expect(canOpenConnection(userId)).toBe(true);
        });
    });

    describe('constants', () => {
        it('exports the expected limit constants', () => {
            expect(MAX_CONNECTIONS_PER_USER).toBe(5);
            expect(MAX_CONNECTIONS_GLOBAL).toBe(50);
        });
    });
});
