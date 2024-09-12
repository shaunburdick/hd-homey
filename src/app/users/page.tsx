import { getDb } from '@/lib/database/db';
import { isNull } from 'drizzle-orm';
import Link from 'next/link';
import { users } from '@/lib/database/schema';

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
                {userList.map(user => <li><Link href={`/users/${user.id}`}>{user.name}</Link></li>)}
            </ul>
            <p><Link href='/users/new'>Add User</Link></p>
        </>
    );
}
