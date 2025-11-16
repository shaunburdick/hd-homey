import crypto from 'crypto';
import { getDb } from './database/db';
import { settings } from './database/schema';
import { eq } from 'drizzle-orm';
import Logger from './logger';

/**
 * Get a setting value from database
 */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const db = await getDb();
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, key)
    });
    return setting?.value || null;
  } catch (err) {
    Logger.error({ err, key }, 'Failed to get setting');
    return null;
  }
}

/**
 * Set a setting value in database
 */
export async function setSetting(key: string, value: string): Promise<void> {
  try {
    const db = await getDb();
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, modified_at: new Date() }
      });
  } catch (err) {
    Logger.error({ err, key }, 'Failed to set setting');
    throw err;
  }
}

/**
 * Generate a random stream secret
 */
export function generateStreamSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get the current stream secret (generates one if missing)
 */
export async function getStreamSecret(): Promise<string> {
  let secret = await getSetting('stream_secret');
  
  if (!secret) {
    Logger.warn('Stream secret not found, generating new one');
    secret = generateStreamSecret();
    await setSetting('stream_secret', secret);
  }
  
  return secret;
}

/**
 * Regenerate the stream secret (invalidates all tokens)
 */
export async function regenerateStreamSecret(): Promise<string> {
  const newSecret = generateStreamSecret();
  await setSetting('stream_secret', newSecret);
  Logger.info('Stream secret regenerated');
  return newSecret;
}
