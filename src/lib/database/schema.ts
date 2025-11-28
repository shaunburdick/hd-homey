import { relations, sql } from 'drizzle-orm';
import { text, integer, sqliteTable, unique } from 'drizzle-orm/sqlite-core';
import { AuthRoles } from '../auth-roles';

// ===================================
// Better-Auth Tables (NEW)
// ===================================

/**
 * Better-Auth user table
 * Replaces old 'users' table with Better-Auth native schema
 */
export const user = sqliteTable('user', {
    id: text('id').primaryKey(), // UUID from Better-Auth
    email: text('email').notNull().unique(), // Required by Better-Auth (stores username for compatibility)
    emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
    name: text('name').notNull(),
    image: text('image'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),

    // Custom HD Homey fields
    role: text('role', { enum: [AuthRoles.Admin, AuthRoles.Viewer] }).notNull().default(AuthRoles.Viewer),
    isActive: integer('isActive', { mode: 'boolean' }).notNull().default(true),
    deletedAt: integer('deletedAt', { mode: 'timestamp' }),
});

export type User = typeof user.$inferSelect;

/**
 * Better-Auth account table
 * Stores password hashes and OAuth tokens
 */
export const account = sqliteTable('account', {
    id: text('id').primaryKey(),
    userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(), // 'credential' for username/password
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
    refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
    scope: text('scope'),
    password: text('password'), // Hashed password for credential provider
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/**
 * Better-Auth verification table
 * For email verification (future feature)
 */
export const verification = sqliteTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// NO session table - using JWT/Stateless sessions

// ===================================
// HD Homey Tables (UNCHANGED)
// ===================================

export const tuners = sqliteTable('tuners', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    name: text('name', { length: 255 }).notNull(),
    path: text('path').notNull(),
    last_scanned: integer('last_scanned', { mode: 'timestamp' }),
    is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    deleted_at: integer('deleted_at', { mode: 'timestamp' })
});

export type Tuner = typeof tuners.$inferSelect;

export const channels = sqliteTable('channels', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    fk_tuner: integer('fk_tuner', { mode: 'number' }).notNull().references(() => tuners.id),
    guideNumber: text('guideNumber').notNull(),
    guideName: text('guideName').notNull(),
    videoCodec: text('videoCodec').notNull(),
    audioCodec: text('audioCodec').notNull(),
    hd: integer('hd', { mode: 'number' }).notNull(),
    url: text('url').notNull(),
    is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    deleted_at: integer('deleted_at', { mode: 'timestamp' })
}, (table) => [
    unique('tuner_guideNumber').on(table.fk_tuner, table.guideNumber),
]);

export type Channel = typeof channels.$inferSelect;

export const tunerRelations = relations(tuners, ({ many }) => ({
    channels: many(channels)
}));

export const channelRelations = relations(channels, ({ one }) => ({
    tuners: one(tuners, {
        fields: [channels.fk_tuner],
        references: [tuners.id]
    })
}));

// Settings
export const settings = sqliteTable('settings', {
    key: text('key', { length: 255 }).primaryKey(),
    value: text('value').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export type Setting = typeof settings.$inferSelect;
