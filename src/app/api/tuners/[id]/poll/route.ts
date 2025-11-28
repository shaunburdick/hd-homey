import { and, eq, isNull } from 'drizzle-orm';
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { tuners } from '@/lib/database/schema';
import { getDb } from '@/lib/database/db';
import { HDTuner } from '@/lib/hdhr/tuner';
import Logger from '@/lib/logger';

interface Params {
    id: string;
}

export async function GET(request: NextRequest, context: { params: Promise<Params> }) {
    // Require authentication for polling (channel scans can be resource intensive)
    const session = await auth.api.getSession({
        headers: await headers()
    });
    if (session?.user === null) {
        Logger.warn('Unauthorized poll attempt');
        return Response.json(
            { error: 'Unauthorized', message: 'Authentication required' },
            { status: 401 }
        );
    }

    const db = await getDb();

    const tuner = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, parseInt((await context.params).id, 10)),
            isNull(tuners.deleted_at)
        )
    });

    if (tuner === undefined) {
        notFound();
    }

    const hdTuner = new HDTuner(tuner.path);
    const data = await hdTuner.updateLineup(db, tuner.id);

    return Response.json({ data });
}
