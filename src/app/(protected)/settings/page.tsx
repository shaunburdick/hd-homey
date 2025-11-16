import Link from 'next/link';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';

export default function SettingsPage() {
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

            <h2>System Settings</h2>
            <p><em>Coming soon...</em></p>
        </RoleGuard>
    );
}
