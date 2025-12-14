import { createInsertSchema } from 'drizzle-typebox';
import { Value } from '@sinclair/typebox/value';
import { FormatRegistry, Type } from '@sinclair/typebox';
import { AuthRoles } from '../auth-roles';
import { tuners, user } from './schema';

FormatRegistry.Set('uri', (value) => URL.canParse(value));

export const insertTunerSchema = createInsertSchema(tuners, {
    name: Type.String({ minLength: 3 }),
    path: Type.String({ minLength: 3, format: 'uri' }),
    is_active: Type.Optional(Type.Boolean())
});
export const isTunerValid = (data: unknown) => Value.Check(insertTunerSchema, data);
export const getTunerErrors = (data: unknown) => Value.Errors(insertTunerSchema, data);

// Better-Auth user validation
export const insertUserSchema = createInsertSchema(user, {
    name: Type.String({ minLength: 3 }),
    email: Type.String({ minLength: 3 }), // email field stores username
    role: Type.Enum({ admin: AuthRoles.Admin, viewer: AuthRoles.Viewer })
});
export const isUserValid = (data: unknown) => Value.Check(insertUserSchema, data);
export const getUserErrors = (data: unknown) => Value.Errors(insertUserSchema, data);
