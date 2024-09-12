'use client';

import { useFormState } from 'react-dom';
import { createTuner } from '../actions';

export default function NewTunerPage() {
    const [state, formAction] = useFormState(createTuner, null);

    return (
        <>
            <h1>New Tuner</h1>
            <hr />
            <form action={formAction}>
                <p><label htmlFor='name'>Name: </label><input name="name" /></p>
                <p><label htmlFor='path'>Path: </label><input name="path" /></p>
                <p aria-live="polite">{state?.map(err => <p>{err.path}: {err.message}</p>)}</p>
                <button type="submit">Create Tuner</button>
            </form>
        </>
    );
}
