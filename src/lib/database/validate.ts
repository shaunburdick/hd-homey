import { createInsertSchema } from 'drizzle-typebox';
import { Value } from '@sinclair/typebox/value';
import { FormatRegistry, Type } from '@sinclair/typebox';
import { AuthRoles } from '../auth';
import { tuners, users } from './schema';

FormatRegistry.Set('uri', (value) => URL.canParse(value));

export const insertTunerSchema = createInsertSchema(tuners, {
    name: Type.String({ minLength: 3 }),
    path: Type.String({ minLength: 3, format: 'uri' }),
    is_active: Type.Optional(Type.Boolean())
});
export const isTunerValid = (data: unknown) => Value.Check(insertTunerSchema, data);
export const getTunerErrors = (data: unknown) => Value.Errors(insertTunerSchema, data);

export const insertUserSchema = createInsertSchema(users, {
    name: Type.String({ minLength: 3 }),
    username: Type.String({ minLength: 3 }),
    passHash: Type.String({ minLength: 60, maxLength: 60 }),
    role: Type.Enum({ admin: AuthRoles.Admin, viewer: AuthRoles.Viewer })
});
export const isUserValid = (data: unknown) => Value.Check(insertUserSchema, data);
export const getUserErrors = (data: unknown) => Value.Errors(insertUserSchema, data);
