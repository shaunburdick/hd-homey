import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, index } from 'drizzle-orm/sqlite-core';
import { AuthRoles } from '../auth';

export const users = sqliteTable('users', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    username: text('username', { length: 255 }).notNull(),
    name: text('name', { length: 255 }).notNull(),
    passHash: text('passHash').notNull(),
    role: text('role', { enum: [AuthRoles.Admin, AuthRoles.Viewer] }).notNull(),
    is_active: integer('id', { mode: 'boolean' }).default(true),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    deleted_at: integer('deleted_at', { mode: 'timestamp' })
});

export const tuners = sqliteTable('tuners', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    name: text('name', { length: 255 }).notNull(),
    path: text('path').notNull(),
    is_active: integer('id', { mode: 'boolean' }).default(true),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    deleted_at: integer('deleted_at', { mode: 'timestamp' })
});

export const channels = sqliteTable('channels', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    fk_tuner: integer('fk_tuner', { mode: 'number' }).notNull().references(() => tuners.id),
    guideNumber: text('guideNumber').notNull(),
    guideName: text('guideName').notNull(),
    videoCodec: text('videoCodec').notNull(),
    audioCodec: text('audioCodec').notNull(),
    hd: integer('hd', { mode: 'number' }).notNull(),
    url: text('url').notNull(),
    is_active: integer('id', { mode: 'boolean' }).default(true),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    modified_at: integer('modified_at', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
    deleted_at: integer('deleted_at', { mode: 'timestamp' })
}, (table) => {
    return {
        tuner: index('tuner').on(table.fk_tuner)
    };
});

// export const users = pgTable(
//     "users",
//     {
//       id: serial("id").primaryKey().notNull(),
//       auth_provider_name: varchar("auth_provider_name", {
//         length: 255,
//       }).notNull(),
//       auth_provider_id: varchar("auth_provider_id", { length: 255 }).notNull(),
//       employee_id: varchar("employee_id", { length: 255 }).notNull(),
//       name: varchar("name", { length: 255 }).notNull(),
//       address: varchar("address", { length: 255 }),
//       notes: text("notes"),
//       is_active: boolean("is_active").default(true).notNull(),
//       created_at: timestamp("created_at", { mode: "string" })
//         .defaultNow()
//         .notNull(),
//       modified_at: timestamp("modified_at", { mode: "string" })
//         .defaultNow()
//         .notNull(),
//       deleted_at: timestamp("deleted_at", { mode: "string" }),
//     },
//     (table) => {
//       return {
//         auth_provider_id_active: index("auth_provider_id_active").on(
//           table.auth_provider_id,
//           table.is_active
//         ),
//       };
//     }
//   );
