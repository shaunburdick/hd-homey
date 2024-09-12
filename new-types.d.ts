import type { User as HDUser } from './lib/database/schema';

declare module 'next-auth' {

    type User = HDUser;

    /**
     * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: User
    }
}
