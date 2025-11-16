'use server';

import { auth } from '@/auth';
import { AuthRoles } from '@/lib/auth-roles';
import { regenerateStreamSecret, getStreamSecret } from '@/lib/settings';
import { revalidatePath } from 'next/cache';
import Logger from '@/lib/logger';

export interface FormState {
  errors: Record<string, string[]>;
  success?: boolean;
}

/**
 * Regenerate the application stream secret (invalidates all stream tokens)
 * Admin only
 */
export async function regenerateAppStreamSecret(
  state: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  
  if (!session?.user || session.user.role !== AuthRoles.Admin) {
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
  const session = await auth();
  
  if (!session?.user || session.user.role !== AuthRoles.Admin) {
    return null;
  }
  
  try {
    const secret = await getStreamSecret();
    // Only show first/last 8 characters
    const preview = `${secret.slice(0, 8)}...${secret.slice(-8)}`;
    return { preview };
  } catch (err) {
    Logger.error({ err }, 'Failed to get stream secret info');
    return null;
  }
}
