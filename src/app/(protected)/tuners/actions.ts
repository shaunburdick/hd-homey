'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { tuners, channels } from '@/lib/database/schema';
import { getTunerErrors, isTunerValid } from '@/lib/database/validate';
import { requireAdmin } from '@/lib/auth';
import { HDTuner } from '@/lib/hdhr/tuner';
import Logger from '@/lib/logger';

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
        const tunerId = result[0].id;

        // Automatically scan for channels on new tuner
        try {
            const hdTuner = new HDTuner(result[0].path);
            await hdTuner.updateLineup(db, tunerId);
            Logger.info({ tunerId, channelCount: 'scanned' }, 'Initial channel scan completed for new tuner');
        } catch (error) {
            // Log error but don't fail tuner creation
            Logger.error({ tunerId, error }, 'Failed to scan channels on tuner creation');
        }

        revalidatePath('/tuners');
        redirect(`/tuners/${tunerId}`);
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

    if (isNaN(id) || id === 0) {
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

export async function deleteTuner(prevState: unknown, formData: FormData) {
    // Check authorization
    try {
        await requireAdmin();
    } catch (error) {
        return [{ path: 'authorization', message: error instanceof Error ? error.message : 'Unauthorized' }];
    }

    const db = await getDb();
    const id = parseInt(formData.get('id') as string, 10);

    if (isNaN(id) || id === 0) {
        return [{ path: 'id', message: 'Invalid tuner ID' }];
    }

    // Soft delete tuner and all its channels by setting deleted_at timestamp
    const deletedAt = new Date();

    await db.update(tuners).set({
        deleted_at: deletedAt,
        modified_at: deletedAt
    }).where(eq(tuners.id, id));

    // Also soft delete all channels belonging to this tuner
    await db.update(channels).set({
        deleted_at: deletedAt,
        modified_at: deletedAt,
        is_active: false
    }).where(eq(channels.fk_tuner, id));

    Logger.info({ tunerId: id }, 'Tuner and its channels soft deleted');

    revalidatePath('/tuners');
    redirect('/tuners');
}

export interface ValidationResult {
    success: boolean;
    message: string;
    channelCount?: number;
    error?: string;
}

export async function validateTunerConnection(prevState: unknown, formData: FormData): Promise<ValidationResult> {
    try {
        await requireAdmin();
    } catch (error) {
        return {
            success: false,
            message: 'Unauthorized',
            error: error instanceof Error ? error.message : 'Unauthorized'
        };
    }

    const path = formData.get('path') as string | null;

    if (path === null || path === '') {
        return {
            success: false,
            message: 'Tuner URL is required',
            error: 'No path provided'
        };
    }

    try {
        new URL(path);
    } catch {
        return {
            success: false,
            message: 'Invalid URL format',
            error: 'Please provide a valid URL (e.g., http://192.168.1.100)'
        };
    }

    try {
        const tuner = new HDTuner(path);
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });

        const lineup = await Promise.race([
            tuner.lineup(),
            timeoutPromise
        ]);

        if (!Array.isArray(lineup)) {
            return {
                success: false,
                message: 'Invalid response from device',
                error: 'Device did not return a valid channel lineup'
            };
        }

        return {
            success: true,
            message: `Successfully connected! Found ${lineup.length} channel${lineup.length !== 1 ? 's' : ''}`,
            channelCount: lineup.length
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('timeout')) {
            return {
                success: false,
                message: 'Connection timeout',
                error: 'Could not reach the tuner. Please check the URL and your network connection.'
            };
        }

        if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
            return {
                success: false,
                message: 'Connection failed',
                error: 'Could not connect to the tuner. Please verify the URL is correct and the device is powered on.'
            };
        }

        return {
            success: false,
            message: 'Connection test failed',
            error: errorMessage
        };
    }
}
