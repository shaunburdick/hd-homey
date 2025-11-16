import Link from 'next/link';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';
import { getStreamSecretInfo, regenerateAppStreamSecret } from '@/lib/actions/settings';
import StreamSecretManager from '@/components/stream-secret-manager';

export default async function SettingsPage() {
    const secretInfo = await getStreamSecretInfo();

    return (
        <RoleGuard allowedRoles={[AuthRoles.Admin]}>
            <h1>Settings</h1>
            <p>Administrative settings and user management</p>

            <hr />

            <h2>User Management</h2>
            <ul>
                <li><Link href="/users">Manage Users</Link> - View, add, and edit users</li>
            </ul>

            <hr />

            <h2>Stream Authentication</h2>
            <StreamSecretManager 
                secretPreview={secretInfo?.preview || 'Not available'}
                regenerateAction={regenerateAppStreamSecret}
            />
        </RoleGuard>
    );
}
