import { and, eq, isNull } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { notFound } from 'next/navigation';
import { tuners } from '@/lib/database/schema';
import { getDb } from '@/lib/database/db';
import { getTunerErrors, isTunerValid } from '@/lib/database/validate';
import Logger from '@/lib/logger';

interface Params {
    id: string;
}

export async function GET(request: NextRequest, context: { params: Promise<Params> }) {
    const db = await getDb();

    const data = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, parseInt((await context.params).id, 10)),
            isNull(tuners.deleted_at)
        )
    });

    if (data === null || data === undefined) {
        notFound();
    }

    return Response.json({ data });
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = await getDb();
        const { id } = await params;
        const formData = await request.formData();

        // Get the tuner to update
        const tuner = await db.query.tuners.findFirst({
            where: and(
                eq(tuners.id, parseInt(id, 10)),
                isNull(tuners.deleted_at)
            )
        });

        if (tuner === undefined) {
            return Response.json(
                { error: 'Tuner not found' },
                { status: 404 }
            );
        }

        const nameValue = formData.get('name');
        const pathValue = formData.get('path');
        
        const updateData = {
            name: (nameValue !== null && nameValue !== '') ? nameValue.toString() : tuner.name,
            path: (pathValue !== null && pathValue !== '') ? pathValue.toString() : tuner.path,
            is_active: formData.has('is_active'),
            modified_at: new Date()
        };

        if (isTunerValid(updateData)) {
            await db.update(tuners)
                .set(updateData)
                .where(eq(tuners.id, tuner.id));

            return Response.redirect(new URL(`/tuners/${id}`, request.url));
        } else {
            const errors = getTunerErrors(updateData);
            Logger.error('Invalid tuner data: %o', [...errors]);
            return Response.json(
                { errors: [...errors].map(e => ({ path: e.path, message: e.message })) },
                { status: 400 }
            );
        }
    } catch (error) {
        Logger.error('Error updating tuner: %s', error);
        return Response.json(
            { error: 'Failed to update tuner' },
            { status: 500 }
        );
    }
}
