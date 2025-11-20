import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { Card } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';
import ChangePasswordForm from '@/components/change-password-form';
import { getDb } from '@/lib/database/db';
import { users } from '@/lib/database/schema';

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user) {
        return null;
    }

    // Fetch full user record to get timestamps
    const db = await getDb();
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    if (!user) {
        return null;
    }

    return (
        <PageContainer>
            <div className="mb-6">
                <h1 className="mb-2">My Profile</h1>
                <p className="text-secondary m-0">
                    Manage your account settings
                </p>
            </div>

            <div className="grid gap-5">
                <InfoCard
                    title="Account Information"
                    items={[
                        { label: 'Username', value: user.username },
                        { label: 'Display Name', value: user.name },
                        { label: 'Role', value: user.role === 'admin' ? 'Administrator' : 'Viewer' },
                        { label: 'Account Created', value: user.created_at.toLocaleString() },
                    ]}
                />

                <Card>
                    <h2 className="mt-0 mb-3">Change Password</h2>
                    <p className="text-secondary text-sm mb-4">
                        Update your password to keep your account secure
                    </p>
                    <ChangePasswordForm userId={session.user.id} />
                </Card>
            </div>
        </PageContainer>
    );
}
