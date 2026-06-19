'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/auth';
import type { Session } from '@/lib/auth/types';
import { AuthRoles } from '@/lib/auth-roles';
import { regenerateStreamSecret, getStreamSecret } from '@/lib/settings';
import Logger from '@/lib/logger';
import type { FormState } from '@/lib/errors';

/** Number of preview characters to show at start and end of secret */
const SECRET_PREVIEW_CHARS = 8;

/**
 * Regenerate the application stream secret (invalidates all stream tokens)
 * Admin only
 */
export async function regenerateAppStreamSecret(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    void prevState;
    void formData;
    const rawSession = await auth.api.getSession({
        headers: await headers()
    });
    const session = rawSession as unknown as Session | null;

    if (session?.user?.role !== AuthRoles.Admin) {
        return { errors: { auth: ['Admin access required'] } };
    }

    try {
        await regenerateStreamSecret();
        Logger.info({ actor: session.user.id }, 'Stream secret regenerated');
        revalidatePath('/settings');

        return { errors: {}, success: true };
    } catch (err) {
        Logger.error({ err }, 'Failed to regenerate stream secret');
        return { errors: { form: ['Failed to regenerate stream secret'] } };
    }
}

/**
 * Get stream secret info (for display, returns partial key only)
 * Admin only
 */
export async function getStreamSecretInfo(): Promise<{ preview: string } | null> {
    const rawSession = await auth.api.getSession({
        headers: await headers()
    });
    const session = rawSession as unknown as Session | null;

    if (session?.user?.role !== AuthRoles.Admin) {
        return null;
    }

    try {
        const secret = await getStreamSecret();
        // Only show first/last N characters
        const preview = `${secret.slice(0, SECRET_PREVIEW_CHARS)}...${secret.slice(-SECRET_PREVIEW_CHARS)}`;
        return { preview };
    } catch (err) {
        Logger.error({ err }, 'Failed to get stream secret info');
        return null;
    }
}
