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

export const deviceAuth = () => {
    return {
        id: 'device-auth',
        endpoints: {
            devicePoll: createAuthEndpoint(
                '/device/poll',
                {
                    method: 'GET',
                    query: z.object({
                        code: z.string().length(6),
                    }),
                },
                async (ctx) => {
                    const { code } = ctx.query;

                    // Get database instance
                    const db = await getDb();

                    // Find the device code with authorizer information
                    const deviceCode = await db.query.deviceCodes.findFirst({
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

                    if (deviceCode === null || deviceCode === undefined) {
                        return await ctx.json({ error: 'Invalid code' }, { status: 404 });
                    }

                    // Check if code is expired
                    if (new Date() > new Date(deviceCode.expiresAt)) {
                        if (deviceCode.status === 'pending') {
                            await db.update(deviceCodes)
                                .set({ status: 'expired' })
                                .where(eq(deviceCodes.code, code.toUpperCase()));
                        }
                        return await ctx.json({ status: 'expired' });
                    }

                    // Return status based on device code state
                    switch (deviceCode.status) {
                        case 'pending':
                            return await ctx.json({ status: 'pending' });

                        case 'denied':
                            return await ctx.json({ status: 'denied' });

                        case 'authorized': {
                            // Defensive check: authorizer should always exist
                            if (
                                deviceCode.authorizer === null ||
                                deviceCode.authorizer === undefined ||
                                deviceCode.authorizedBy === null ||
                                deviceCode.authorizedBy === undefined ||
                                deviceCode.authorizedBy.length === 0
                            ) {
                                return await ctx.json(
                                    { error: 'Authorization error' },
                                    { status: 500 }
                                );
                            }

                            // Create session using Better-Auth internal adapter
                            // This is the official way to programmatically create sessions
                            const session = await ctx.context.internalAdapter.createSession(
                                deviceCode.authorizedBy,
                                false // rememberMe = false (session only lasts for session duration)
                            );

                            if (
                                session?.token === null ||
                                session?.token === undefined ||
                                session?.token.length === 0
                            ) {
                                return await ctx.json(
                                    { error: 'Failed to create session' },
                                    { status: 500 }
                                );
                            }

                            // Return success with session token
                            return await ctx.json({
                                status: 'authorized',
                                token: session.token,
                                expiresAt: session.expiresAt.getTime(), // Convert Date to milliseconds timestamp
                                user: {
                                    username: deviceCode.authorizer.username,
                                    role: deviceCode.authorizer.role,
                                },
                            });
                        }

                        case 'expired':
                            return await ctx.json({ status: 'expired' });

                        default:
                            return await ctx.json(
                                { error: 'Unknown status' },
                                { status: 500 }
                            );
                    }
                }
            ),
        },
    };
};
