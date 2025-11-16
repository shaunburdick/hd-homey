'use client';

import { useActionState } from 'react';
import { updateUser } from '@/lib/actions/users';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';

interface User {
    id: number;
    name: string;
    username: string;
    is_active: boolean;
}

interface UserEditFormProps {
    user: User;
}

export default function UserEditForm({ user }: UserEditFormProps) {
    const [state, formAction] = useActionState(updateUser, null);

    return (
        <RoleGuard allowedRoles={[AuthRoles.Admin]}>
            <form action={formAction}>
                <input type="hidden" name="id" value={user.id} />

                <p>
                    <label htmlFor="name">Display Name: </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        defaultValue={user.name}
                        required
                    />
                </p>

                <p>
                    <label htmlFor="password">New Password: </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Leave blank to keep current password"
                    />
                    <br />
                    <small>Leave blank if you don't want to change the password</small>
                </p>

                <p>
                    <label htmlFor="is_active">
                        <input
                            id="is_active"
                            name="is_active"
                            type="checkbox"
                            value="true"
                            defaultChecked={user.is_active}
                        />
                        {' '}User is active
                    </label>
                    <br />
                    <small>Inactive users cannot sign in</small>
                </p>

                {state && Array.isArray(state) && state.length > 0 && (
                    <div aria-live="polite" style={{ color: 'red' }}>
                        <p><strong>Errors:</strong></p>
                        <ul>
                            {state.map((err, idx) => (
                                <li key={idx}>{err.path}: {err.message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <button type="submit">Update User</button>
            </form>
        </RoleGuard>
    );
}
