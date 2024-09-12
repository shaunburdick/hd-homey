'use server';

import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { redirect } from 'next/navigation';
import { getTunerErrors, isTunerValid } from '@/lib/database/validate';

export async function createTuner(prevState: unknown, formData: FormData) {
    const db = await getDb();

    const newTuner = {
        name: formData.get('name'),
        path: formData.get('path')
    };

    if (isTunerValid(newTuner)) {
        const result = await db.insert(tuners).values(newTuner).returning();
        redirect(`/tuners/${result[0].id}`);
    } else {
        const errors = getTunerErrors(newTuner);
        return [...errors].map(e => ({ path: e.path, message: e.message }));
    }
}
