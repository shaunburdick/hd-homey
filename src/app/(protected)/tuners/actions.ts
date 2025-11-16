'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
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
