import { isNull } from 'drizzle-orm';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { users } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';

export default async function Page() {
    const db = await getDb();
    const userList = await db.query.users.findMany({
        where: isNull(users.deleted_at)
    });

    return (
        <>
            <h1>Users</h1>
            <p>A list of users</p>
            <ul>
                {userList.map(user => <li key={user.id}><Link href={`/users/${user.id}`}>{user.name}</Link></li>)}
            </ul>
            <p><AdminLink href='/users/new'>Add User</AdminLink></p>
        </>
    );
}
