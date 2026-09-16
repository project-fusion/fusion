import { Overview } from './overview.js'
import { usePathname } from './routes.js'
import { SignupForm } from './signup-form.js'
import { SiteHeader } from './site-header.js'

/**
 * The shell, and the switch between the two pages.
 *
 * Helix components are custom elements, so you write the tags directly. There is
 * no wrapper package and nothing to import per component: `src/main.tsx`
 * registers them once and every tag in the app is real from then on.
 */
export function App() {
  const path = usePathname()
  return (
    <>
      <SiteHeader />
      <main className="page">{path === '/join' ? <SignupForm /> : <Overview />}</main>
    </>
  )
}
