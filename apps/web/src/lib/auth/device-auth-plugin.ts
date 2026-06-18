/**
 * Better-Auth Plugin for Device Code Authentication
 *
 * This plugin adds a device code polling endpoint to Better-Auth, allowing
 * TV/mobile apps to check authorization status and receive session tokens.
 *
 * Endpoints added:
 * - GET /auth/device/poll - Poll for authorization status and get session token
 *
 * Note: The /api/auth/device/code and /api/auth/device/authorize endpoints
 * are implemented as Next.js route handlers since they need custom database
 * access for device codes table.
 */

import { createAuthEndpoint } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/lib/database/db';
import { deviceCodes } from '@/lib/database/schema';

/** Length of the device code string */
const DEVICE_CODE_LENGTH = 6;

type DeviceCodeRecord = Awaited<ReturnType<typeof findDeviceCode>>;

// Better-Auth context type for the poll endpoint
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- createAuthEndpoint ctx is library-typed
type PollCtx = any;

/**
 * Find a device code record with its authorizer info
 */
async function findDeviceCode(code: string) {
    const db = await getDb();
    return await db.query.deviceCodes.findFirst({
        where: eq(deviceCodes.code, code.toUpperCase()),
        with: {
            authorizer: {
                columns: {
                    id: true,
                    username: true,
                    role: true,
                },
            },
        },
    });
}

/**
 * Mark an expired device code as expired in the database
 */
async function markCodeAsExpired(code: string): Promise<void> {
    const db = await getDb();
    await db.update(deviceCodes)
        .set({ status: 'expired' })
        .where(eq(deviceCodes.code, code.toUpperCase()));
}

/**
 * Check whether a device code has passed its expiration time
 */
function isCodeExpired(deviceCode: NonNullable<DeviceCodeRecord>): boolean {
    return new Date() > new Date(deviceCode.expiresAt);
}

/**
 * Check whether the authorized device code has a valid authorizer
 */
function isAuthorizerMissing(deviceCode: NonNullable<DeviceCodeRecord>): boolean {
    return (
        deviceCode.authorizer === null ||
        deviceCode.authorizer === undefined ||
        deviceCode.authorizedBy === null ||
        deviceCode.authorizedBy === undefined ||
        deviceCode.authorizedBy.length === 0
    );
}

/**
 * Handle the 'authorized' status case — creates a session and returns the token
 */
async function handleAuthorizedStatus(
    ctx: PollCtx,
    deviceCode: NonNullable<DeviceCodeRecord>
): Promise<unknown> {
    if (isAuthorizerMissing(deviceCode)) {
        return await ctx.json({ error: 'Authorization error' }, { status: 500 });
    }

    // Create session using Better-Auth internal adapter
    // This is the official way to programmatically create sessions
    const session = await ctx.context.internalAdapter.createSession(
        deviceCode.authorizedBy,
        false // rememberMe = false (session only lasts for session duration)
    );

    const isTokenMissing = session?.token === null ||
        session?.token === undefined ||
        session?.token.length === 0;

    if (isTokenMissing) {
        return await ctx.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Return success with session token
    return await ctx.json({
        status: 'authorized',
        token: session.token,
        expiresAt: session.expiresAt.getTime(), // Convert Date to milliseconds timestamp
        user: {
            username: deviceCode.authorizer?.username,
            role: deviceCode.authorizer?.role,
        },
    });
}

/**
 * Handle an expired device code, optionally updating its status in the DB
 */
async function handleExpiredCode(
    { ctx, deviceCode, code }: { ctx: PollCtx; deviceCode: NonNullable<DeviceCodeRecord>; code: string }
): Promise<unknown> {
    if (deviceCode.status === 'pending') {
        await markCodeAsExpired(code);
    }
    return await ctx.json({ status: 'expired' });
}

/**
 * Dispatch the poll response based on device code status
 */
async function dispatchPollResponse(
    { ctx, deviceCode, code }: { ctx: PollCtx; deviceCode: NonNullable<DeviceCodeRecord>; code: string }
): Promise<unknown> {
    if (isCodeExpired(deviceCode)) {
        return await handleExpiredCode({ ctx, deviceCode, code });
    }

    switch (deviceCode.status) {
        case 'pending':
            return await ctx.json({ status: 'pending' });
        case 'denied':
            return await ctx.json({ status: 'denied' });
        case 'authorized':
            return await handleAuthorizedStatus(ctx, deviceCode);
        case 'expired':
            return await ctx.json({ status: 'expired' });
        default:
            return await ctx.json({ error: 'Unknown status' }, { status: 500 });
    }
}

export const deviceAuth = () => {
    return {
        id: 'device-auth',
        endpoints: {
            devicePoll: createAuthEndpoint(
                '/device/poll',
                {
                    method: 'GET',
                    query: z.object({
                        code: z.string().length(DEVICE_CODE_LENGTH),
                    }),
                },
                async (ctx) => {
                    const { code } = ctx.query;
                    const deviceCode = await findDeviceCode(code);

                    if (deviceCode === null || deviceCode === undefined) {
                        return await ctx.json({ error: 'Invalid code' }, { status: 404 });
                    }

                    return await dispatchPollResponse({ ctx, deviceCode, code });
                }
            ),
        },
    };
};
