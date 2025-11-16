'use client';

import { useActionState } from 'react';
import { createFirstUser } from './actions';

export default function GetStarted() {
    const [state, formAction] = useActionState(createFirstUser, null);

    return (
        <main>
            <h1>Welcome to HD Homey!</h1>
            <p>Let's get started by creating your admin account.</p>

            <form action={formAction}>
                <h2>Create Admin Account</h2>

                <p>
                    <label htmlFor='username'>Username: </label>
                    <input
                        id='username'
                        name='username'
                        type='text'
                        required
                        autoComplete='username'
                    />
                </p>

                <p>
                    <label htmlFor='name'>Display Name: </label>
                    <input
                        id='name'
                        name='name'
                        type='text'
                        required
                        autoComplete='name'
                    />
                </p>

                <p>
                    <label htmlFor='password'>Password: </label>
                    <input
                        id='password'
                        name='password'
                        type='password'
                        required
                        autoComplete='new-password'
                    />
                </p>

                {/* Display errors if any */}
                {state && Array.isArray(state) && state.length > 0 && (
                    <div aria-live="polite" style={{ color: 'red' }}>
                        <p><strong>Please fix the following errors:</strong></p>
                        <ul>
                            {state.map((err, idx) => (
                                <li key={idx}>{err.path}: {err.message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <button type='submit'>Create Admin Account</button>
            </form>

            <hr />
            <p><small>This account will have full administrative access to HD Homey.</small></p>
        </main>
    );
}
