'use server';

import * as crypto from 'crypto';

const PASSWORD_LENGTH = 256;
const SALT_LENGTH = 64;
const ITERATIONS = 10000;
const DIGEST = 'sha256';
const BYTE_TO_STRING_ENCODING = 'hex'; // this could be base64, for instance

/**
 * Generates a PersistedPassword given the password provided by the user.
 * This should be called when creating a user or redefining the password
 */
export async function generateHashPassword(password: string): Promise<string> {
    return new Promise<string>((accept, reject) => {
        const salt = crypto
            .randomBytes(SALT_LENGTH)
            .toString(BYTE_TO_STRING_ENCODING);
        crypto.pbkdf2(
            password,
            salt,
            ITERATIONS,
            PASSWORD_LENGTH,
            DIGEST,
            (error, hash) => {
                if (error) {
                    return reject(error);
                }

                accept(`${salt}.${hash.toString(BYTE_TO_STRING_ENCODING)}`);
            }
        );
    });
}

/**
 * Verifies the attempted password against the password information saved in
 * the database. This should be called when
 * the user tries to log in.
 */
export async function verifyPassword(persistedPassword: string, passwordAttempt: string): Promise<boolean> {
    return new Promise<boolean>((accept, reject) => {
        const [salt, hash] = persistedPassword.split('.');
        crypto.pbkdf2(
            passwordAttempt,
            salt,
            ITERATIONS,
            PASSWORD_LENGTH,
            DIGEST,
            (error, newHash) => {
                if (error) {
                    return reject(error);
                }

                accept(
                    hash === newHash.toString(BYTE_TO_STRING_ENCODING)
                );
            }
        );
    });
}
