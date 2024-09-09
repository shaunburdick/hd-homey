import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, index } from 'drizzle-orm/sqlite-core';
import { AuthRoles } from '../auth';
import { createInsertSchema } from 'drizzle-typebox';
import { Value } from '@sinclair/typebox/value';

export const users = sqliteTable('users', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    username: text('username', { length: 255 }).notNull(),
    name: text('name', { length: 255 }).notNull(),
    passHash: text('passHash').notNull(),
    role: text('role', { enum: [AuthRoles.Admin, AuthRoles.Viewer] }).notNull(),
    is_active: integer('is_active', { mode: 'boolean' }).default(true),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    deleted_at: integer('deleted_at', { mode: 'timestamp' })
});

export const tuners = sqliteTable('tuners', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    name: text('name', { length: 255 }).notNull(),
    path: text('path').notNull(),
    is_active: integer('is_active', { mode: 'boolean' }).default(true),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    deleted_at: integer('deleted_at', { mode: 'timestamp' })
});

export const insertTunerSchema = createInsertSchema(tuners);
export const isTunerValid = (data: unknown) => Value.Check(insertTunerSchema, data);

export const channels = sqliteTable('channels', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    fk_tuner: integer('fk_tuner', { mode: 'number' }).notNull().references(() => tuners.id),
    guideNumber: text('guideNumber').notNull(),
    guideName: text('guideName').notNull(),
    videoCodec: text('videoCodec').notNull(),
    audioCodec: text('audioCodec').notNull(),
    hd: integer('hd', { mode: 'number' }).notNull(),
    url: text('url').notNull(),
    is_active: integer('is_active', { mode: 'boolean' }).default(true),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    deleted_at: integer('deleted_at', { mode: 'timestamp' })
}, (table) => {
    return {
        tuner: index('tuner').on(table.fk_tuner)
    };
});
