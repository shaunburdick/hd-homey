import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import Logger from '@/lib/logger';
import { HDTuner } from '@/lib/hdhr/tuner';

export const dynamic = 'force-dynamic';

/** Radix for parsing integer route parameters */
const DECIMAL_RADIX = 10;

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Require authentication (middleware protects this route, but double-check)
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (session?.user === null) {
            Logger.warn('Unauthorized poll request attempt');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const db = await getDb();
        const { id } = await params;

        // Verify tuner exists
        const tuner = await db.query.tuners.findFirst({
            where: and(
                eq(tuners.id, parseInt(id, DECIMAL_RADIX)),
                isNull(tuners.deleted_at)
            )
        });

        if (!tuner) {
            return NextResponse.json(
                { error: 'Tuner not found' },
                { status: 404 }
            );
        }

        // Refresh channels
        const hdTuner = new HDTuner(tuner.path);
        await hdTuner.updateLineup(db, tuner.id);

        // Redirect back to the tuner page
        // Use NEXTAUTH_URL or fallback to request headers for proper redirect
        const baseUrl = process.env.NEXTAUTH_URL ||
                       `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;
        return NextResponse.redirect(new URL(`/tuners/${id}`, baseUrl));

    } catch (error) {
        Logger.error('Error refreshing channels: %s', error);
        return NextResponse.json(
            { error: 'Failed to refresh channels' },
            { status: 500 }
        );
    }
}
