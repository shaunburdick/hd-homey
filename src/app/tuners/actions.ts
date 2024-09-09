'use server';

import { getDb } from '@/lib/database/db';
import { isTunerValid, tuners } from '@/lib/database/schema';
import { redirect } from 'next/navigation';
import Logger from '@/lib/logger';

export async function createTuner(formData: FormData) {
    const db = await getDb();

    const newTuner = {
        name: formData.get('name'),
        path: formData.get('path')
    };

    Logger.info(newTuner, 'New Tuner');

    if (isTunerValid(newTuner)) {
        Logger.info(db.insert(tuners).values(newTuner).toSQL());
        const result = await db.insert(tuners).values(newTuner).returning();
        redirect(`/tuners/${result[0].id}`);
    }
}
