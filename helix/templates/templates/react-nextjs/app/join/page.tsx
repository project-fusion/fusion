import { SignupForm } from '../signup-form'

/**
 * A real route under `app/`, which is what the App Router gives you and the Vite
 * template has to stand in for with a hash.
 *
 * The page itself is still a server component: the form is the client component,
 * because the form is the part with handlers on it.
 */
export default function Page() {
  return <SignupForm />
}
