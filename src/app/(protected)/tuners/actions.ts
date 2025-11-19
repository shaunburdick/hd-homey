'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { getTunerErrors, isTunerValid } from '@/lib/database/validate';
import { requireAdmin } from '@/lib/auth';

export async function createTuner(prevState: unknown, formData: FormData) {
    // Check authorization
    try {
        await requireAdmin();
    } catch (error) {
        return [{ path: 'authorization', message: error instanceof Error ? error.message : 'Unauthorized' }];
    }

    const db = await getDb();

    const newTuner = {
        name: formData.get('name'),
        path: formData.get('path')
    };

    if (isTunerValid(newTuner)) {
        const result = await db.insert(tuners).values(newTuner).returning();
        revalidatePath('/tuners');
        redirect(`/tuners/${result[0].id}`);
    } else {
        const errors = getTunerErrors(newTuner);
        return [...errors].map(e => ({ path: e.path, message: e.message }));
    }
}

export async function updateTuner(prevState: unknown, formData: FormData) {
    // Check authorization
    try {
        await requireAdmin();
    } catch (error) {
        return [{ path: 'authorization', message: error instanceof Error ? error.message : 'Unauthorized' }];
    }

    const db = await getDb();
    const id = parseInt(formData.get('id') as string, 10);

    if (!id || isNaN(id) || id === 0) {
        return [{ path: 'id', message: 'Invalid tuner ID' }];
    }

    const name = formData.get('name') as string;
    const path = formData.get('path') as string;
    const is_active = formData.get('is_active') === 'on';

    const updatedTuner = { name, path, is_active };

    if (isTunerValid(updatedTuner)) {
        await db.update(tuners).set({
            name,
            path,
            is_active,
            modified_at: new Date()
        }).where(eq(tuners.id, id));

        revalidatePath(`/tuners/${id}`);
        revalidatePath('/tuners');
        redirect(`/tuners/${id}`);
    } else {
        const errors = getTunerErrors(updatedTuner);
        return [...errors].map(e => ({ path: e.path, message: e.message }));
    }
}
