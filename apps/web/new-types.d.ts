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

// Image file declarations
declare module '*.webp' {
    const content: string;
    export default content;
}

declare module '*.png' {
    const content: string;
    export default content;
}

declare module '*.jpg' {
    const content: string;
    export default content;
}

declare module '*.jpeg' {
    const content: string;
    export default content;
}

declare module '*.svg' {
    const content: string;
    export default content;
}
