import { relations, sql } from 'drizzle-orm';
import { text, integer, sqliteTable, unique } from 'drizzle-orm/sqlite-core';
// import type { AdapterAccountType } from 'next-auth/adapters';
import { AuthRoles } from '../auth-roles';


export const users = sqliteTable('users', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    username: text('username', { length: 255 }).notNull(),
    name: text('name', { length: 255 }).notNull(),
    passHash: text('passHash').notNull(),
    role: text('role', { enum: [AuthRoles.Admin, AuthRoles.Viewer] }).notNull(),
    is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    deleted_at: integer('deleted_at', { mode: 'timestamp' })
}, (table) => [
    unique('username_unique').on(table.username)
]);

export type User = typeof users.$inferSelect;

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

// Auth

// export const accounts = sqliteTable(
//     'account',
//     {
//         userId: text('userId')
//             .notNull()
//             .references(() => users.id, { onDelete: 'cascade' }),
//         type: text('type').$type<AdapterAccountType>().notNull(),
//         provider: text('provider').notNull(),
//         providerAccountId: text('providerAccountId').notNull(),
//         refresh_token: text('refresh_token'),
//         access_token: text('access_token'),
//         expires_at: integer('expires_at'),
//         token_type: text('token_type'),
//         scope: text('scope'),
//         id_token: text('id_token'),
//         session_state: text('session_state'),
//     },
//     (account) => ({
//         compoundKey: primaryKey({
//             columns: [account.provider, account.providerAccountId],
//         }),
//     })
// );

// export const sessions = sqliteTable('session', {
//     sessionToken: text('sessionToken').primaryKey(),
//     userId: text('userId')
//         .notNull()
//         .references(() => users.id, { onDelete: 'cascade' }),
//     expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
// });

// export const verificationTokens = sqliteTable(
//     'verificationToken',
//     {
//         identifier: text('identifier').notNull(),
//         token: text('token').notNull(),
//         expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
//     },
//     (verificationToken) => ({
//         compositePk: primaryKey({
//             columns: [verificationToken.identifier, verificationToken.token],
//         }),
//     })
// );

// export const authenticators = sqliteTable(
//     'authenticator',
//     {
//         credentialID: text('credentialID').notNull().unique(),
//         userId: text('userId')
//             .notNull()
//             .references(() => users.id, { onDelete: 'cascade' }),
//         providerAccountId: text('providerAccountId').notNull(),
//         credentialPublicKey: text('credentialPublicKey').notNull(),
//         counter: integer('counter').notNull(),
//         credentialDeviceType: text('credentialDeviceType').notNull(),
//         credentialBackedUp: integer('credentialBackedUp', {
//             mode: 'boolean',
//         }).notNull(),
//         transports: text('transports'),
//     },
//     (authenticator) => ({
//         compositePK: primaryKey({
//             columns: [authenticator.userId, authenticator.credentialID],
//         }),
//     })
// );
