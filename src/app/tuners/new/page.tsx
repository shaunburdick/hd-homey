import { createTuner } from '../actions';

export default function NewTunerPage() {

    return (
        <>
            <h1>New Tuner</h1>
            <hr />
            <form action={createTuner}>
                <input name="name" />
                <input name="path" />
                <button type="submit">Create Tuner</button>
            </form>
        </>
    );
}
