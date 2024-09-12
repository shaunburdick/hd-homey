import { createInsertSchema } from 'drizzle-typebox';
import { Value } from '@sinclair/typebox/value';
import { FormatRegistry, Type } from '@sinclair/typebox';
import { tuners, users } from './schema';

FormatRegistry.Set('uri', (value) => URL.canParse(value));

export const insertTunerSchema = createInsertSchema(tuners, {
    name: Type.String({ minLength: 3 }),
    path: Type.String({ minLength: 3, format: 'uri' })
});
export const isTunerValid = (data: unknown) => Value.Check(insertTunerSchema, data);
export const getTunerErrors = (data: unknown) => Value.Errors(insertTunerSchema, data);

export const insertUserSchema = createInsertSchema(users, {
    name: Type.String({ minLength: 3 }),
    username: Type.String({ minLength: 3 }),
});
export const isUserValid = (data: unknown) => Value.Check(insertUserSchema, data);
export const getUserErrors = (data: unknown) => Value.Errors(insertUserSchema, data);
