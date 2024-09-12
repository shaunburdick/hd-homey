import { relations, sql } from 'drizzle-orm';
import { text, integer, sqliteTable, unique } from 'drizzle-orm/sqlite-core';
import { AuthRoles } from '../auth';

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
});

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
}, (table) => {
    return {
        tuner: unique('tuner_guideNumber').on(table.fk_tuner, table.guideNumber),
    };
});

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
