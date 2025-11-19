import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { and, eq, isNull } from 'drizzle-orm';
import { users } from './lib/database/schema';
import Config from './lib/config';
import { getDb } from '@/lib/database/db';
import { verifyPassword } from '@/lib/user';

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
                    if (await verifyPassword(foundUser.passHash, credentials.password)) {
                        // Convert id to string for NextAuth compatibility
                        user = {
                            ...foundUser,
                            id: String(foundUser.id)
                        };
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
        jwt({ token, user }) {
            // Persist user data to JWT token on sign in
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
            }
            return token;
        },
        session({ session, token }) {
            // Add user data from token to session
            if (token && session.user) {
                session.user.id = Number(token.id);
                session.user.username = token.username;
                session.user.role = token.role;
            }
            return session;
        },
    },
    secret: Config.AUTH_SECRET
});
