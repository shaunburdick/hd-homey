/**
 * SSE Connection Tracker — per-user and global connection limits.
 *
 * Prevents unbounded resource consumption from users opening many
 * concurrent SSE streams. Works as a module-level singleton (same
 * pattern as the signal poller and transcoding session manager).
 *
 * @module lib/hdhr/sse-connection-tracker
 */

/** Maximum concurrent SSE connections per authenticated user */
export const MAX_CONNECTIONS_PER_USER = 5;

/** Maximum total concurrent SSE connections across all users */
export const MAX_CONNECTIONS_GLOBAL = 50;

/**
 * Per-user subscriber ID sets.
 * Key: userId, Value: set of active subscriberIds for that user.
 */
const userConnections = new Map<string, Set<string>>();

/**
 * Check whether a new SSE connection can be opened for the given user.
 *
 * Evaluates both the per-user limit and the global total limit.
 *
 * @param userId - Authenticated user ID from session
 * @returns `true` if a new connection is permitted; `false` if a limit is reached
 */
export function canOpenConnection(userId: string): boolean {
    const total = [...userConnections.values()].reduce((sum, set) => sum + set.size, 0);
    if (total >= MAX_CONNECTIONS_GLOBAL) {
        return false;
    }

    const userSet = userConnections.get(userId);
    if (userSet !== undefined && userSet.size >= MAX_CONNECTIONS_PER_USER) {
        return false;
    }

    return true;
}

/**
 * Register an active SSE connection for a user.
 *
 * Must be called after the poller's `subscribe` / `subscribeAll` returns
 * a valid `subscriberId`.
 *
 * @param userId - Authenticated user ID from session
 * @param subscriberId - Unique ID returned by the signal poller
 */
export function registerConnection(userId: string, subscriberId: string): void {
    const set = userConnections.get(userId) ?? new Set<string>();
    set.add(subscriberId);
    userConnections.set(userId, set);
}

/**
 * Unregister an SSE connection when the stream closes or is aborted.
 *
 * Safe to call multiple times for the same `subscriberId` — subsequent
 * calls after the first are no-ops.
 *
 * @param userId - Authenticated user ID from session
 * @param subscriberId - Unique ID returned by the signal poller
 */
export function unregisterConnection(userId: string, subscriberId: string): void {
    const set = userConnections.get(userId);
    if (set === undefined) {
        return;
    }
    set.delete(subscriberId);
    if (set.size === 0) {
        userConnections.delete(userId);
    }
}

/**
 * Total number of active connections across all users.
 * Exposed for testing and observability.
 */
export function getTotalConnectionCount(): number {
    return [...userConnections.values()].reduce((sum, set) => sum + set.size, 0);
}
