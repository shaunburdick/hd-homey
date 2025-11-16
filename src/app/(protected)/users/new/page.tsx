'use client';

import { useActionState } from 'react';
import { createUser } from '@/lib/actions/users';
import { AuthRoles } from '@/lib/auth-roles';

export default function Page() {
    const [state, formAction] = useActionState(createUser, null);

    return (
        <>
            <h1>New User</h1>
            <hr />
            <form action={formAction}>
                <p><label htmlFor='username'>User Name: </label><input name="username" /></p>
                <p><label htmlFor='name'>Name: </label><input name="name" /></p>
                <p><label htmlFor='password'>Password: </label><input name="password" type='password' /></p>
                <p>
                    <label htmlFor='role'>Role: </label>
                    <select name='role'>
                        <option value={AuthRoles.Admin}>Admin</option>
                        <option value={AuthRoles.Viewer}>Viewer</option>
                    </select>
                </p>
                <div aria-live="polite">{state?.map(err => <p>{err.path}: {err.message}</p>)}</div>
                <button type="submit">Create User</button>
            </form>
        </>
    );
}
