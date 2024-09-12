import type { User } from 'next-auth';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verifyPassword } from '@/lib/user';
import { getDb } from '@/lib/database/db';
import { and, eq, isNull } from 'drizzle-orm';
import { users } from './lib/database/schema';
import Config from './lib/config';

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                username: { label: 'Username' },
                password: { label: 'Password', type: 'password' }
            },
            authorize: async (credentials) => {
                let user = null;

                if (typeof credentials.username === 'string' && typeof credentials.password === 'string') {

                    // logic to verify if the user exists
                    const db = await getDb();
                    const foundUser = await db.query.users.findFirst({
                        where: and(
                            eq(users.username, credentials.username),
                            eq(users.is_active, true),
                            isNull(users.deleted_at)
                        )
                    });

                    if (!foundUser) {
                        // No user found, so this is their first attempt to login
                        // meaning this is also the place you could do registration
                        throw new Error('User not found.');
                    }

                    // verify the password
                    if (await verifyPassword(foundUser?.passHash, credentials.password)) {
                        user = foundUser as User;
                    } else {
                        throw new Error('Password mismatch');
                    }
                } else {
                    throw new Error('Invalid/Missing username or password');
                }

                // return user object with their profile data
                return user;
            }
        })
    ],
    callbacks: {
        session({ session, user }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    ...user,
                },
            };
        },
    },
    secret: Config.AUTH_SECRET
});
