import { signin } from '../actions';

export default async function SignIn() {
    return (
        <form action={signin}>
            <p>
                <label>
                    Username
                    <input name="username" type="text" />
                </label>
            </p>
            <p>
                <label>
                    Password
                    <input name="password" type="password" />
                </label>
            </p>
            <button>Sign In</button>
        </form>
    );
}
