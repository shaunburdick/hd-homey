import { and, eq, isNull } from 'drizzle-orm';
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { tuners } from '@/lib/database/schema';
import type { Tuner } from '@/lib/database/schema';
import { getDb } from '@/lib/database/db';
import type { DB } from '@/lib/database/db';
import { getTunerErrors, isTunerValid } from '@/lib/database/validate';
import { AuthRoles } from '@/lib/auth-roles';
import Logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Radix for parsing integer route parameters */
const DECIMAL_RADIX = 10;

interface Params {
    id: string;
}

interface TunerUpdateOptions {
    db: DB;
    tuner: Tuner;
    id: string;
    formData: FormData;
    request: Request;
}

/**
 * Apply validated update to a tuner record.
 * Returns a redirect on success or validation errors on failure.
 */
async function applyTunerUpdate({ db, tuner, id, formData, request }: TunerUpdateOptions) {
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
    }

    const errors = getTunerErrors(updateData);
    Logger.error('Invalid tuner data: %o', [...errors]);
    return Response.json(
        {
            errors: [...errors].map((validationError) => ({
                path: validationError.path,
                message: validationError.message,
            }))
        },
        { status: 400 }
    );
}

export async function GET(request: NextRequest, context: { params: Promise<Params> }) {
    const { id } = await context.params;
    const db = await getDb();

    const data = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, parseInt(id, DECIMAL_RADIX)),
            isNull(tuners.deleted_at)
        )
    });

    if (data === undefined) {
        notFound();
    }

    return Response.json({ data });
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (session?.user?.role !== AuthRoles.Admin) {
            Logger.warn({ user: session?.user.email }, 'Unauthorized tuner update attempt');
            return Response.json(
                { error: 'Forbidden', message: 'Admin access required' },
                { status: 403 }
            );
        }

        const db = await getDb();
        const { id } = await params;
        const formData = await request.formData();

        const tuner = await db.query.tuners.findFirst({
            where: and(
                eq(tuners.id, parseInt(id, DECIMAL_RADIX)),
                isNull(tuners.deleted_at)
            )
        });

        if (tuner === undefined) {
            return Response.json(
                { error: 'Tuner not found' },
                { status: 404 }
            );
        }

        return await applyTunerUpdate({ db, tuner, id, formData, request });
    } catch (error) {
        Logger.error('Error updating tuner: %s', error);
        return Response.json(
            { error: 'Failed to update tuner' },
            { status: 500 }
        );
    }
}
