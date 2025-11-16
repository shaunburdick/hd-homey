import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import UserEditForm from './UserEditForm';
import { getDb } from '@/lib/database/db';
import { users } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';

interface PageParams {
    id: string
};

export default async function Page(props: { params: Promise<PageParams> }) {
    const params = await props.params;
    const db = await getDb();

    const user = await db.query.users.findFirst({
        where: and(
            eq(users.id, parseInt(params.id, 10)),
            isNull(users.deleted_at)
        )
    });

    if (!user) {
        notFound();
    }

    return (
        <>
            <h1>{user.name}</h1>
            <p><Link href="/users">← Back to Users</Link></p>

            <hr />

            <h2>User Information</h2>
            <dl>
                <dt><strong>Username:</strong></dt>
                <dd>{user.username}</dd>

                <dt><strong>Display Name:</strong></dt>
                <dd>{user.name}</dd>

                <dt><strong>Role:</strong></dt>
                <dd>{user.role}</dd>

                <dt><strong>Status:</strong></dt>
                <dd>{user.is_active ? 'Active' : 'Inactive'}</dd>

                <dt><strong>Created:</strong></dt>
                <dd>{user.created_at.toLocaleString()}</dd>

                <dt><strong>Last Modified:</strong></dt>
                <dd>{user.modified_at.toLocaleString()}</dd>
            </dl>

            <hr />

            <AdminLink href={`/users/${user.id}/edit`}>
                <h2>Edit User</h2>
            </AdminLink>

            <UserEditForm user={user} />
        </>
    );
}
