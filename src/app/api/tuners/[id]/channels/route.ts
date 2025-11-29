import { and, eq, isNull } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { notFound } from 'next/navigation';
import { channels, tuners } from '@/lib/database/schema';
import { getDb } from '@/lib/database/db';

export const dynamic = 'force-dynamic';

interface Params {
    id: string;
}

export async function GET(request: NextRequest, context: { params: Promise<Params> }) {
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

    const data = await db.query.channels.findMany({
        where: and(
            eq(channels.fk_tuner, parseInt((await context.params).id, 10)),
            isNull(channels.deleted_at)
        )
    });

    return Response.json({ data });
}
