import type { User as HDUser } from './lib/database/schema';

declare module 'next-auth' {

    interface User extends Omit<HDUser, 'id'> {
        id: string;
    }

    /**
     * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: HDUser
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        username: string;
        role: string;
    }
}
