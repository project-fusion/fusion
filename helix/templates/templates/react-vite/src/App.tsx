import { Landing } from './landing.js'
import { Overview } from './overview.js'
import { usePathname } from './routes.js'
import { SignupForm } from './signup-form.js'
import { SiteHeader } from './site-header.js'

/** What answers each path, in the order the bar offers them. */
const PAGES = {
  '/': Landing,
  '/join': SignupForm,
  '/overview': Overview,
}

/**
 * The shell, and the switch between the three pages.
 *
 * Helix components are custom elements, so you write the tags directly. There is
 * no wrapper package and nothing to import per component: `src/main.tsx`
 * registers them once and every tag in the app is real from then on.
 */
export function App() {
  const path = usePathname()
  const Page = PAGES[path as keyof typeof PAGES] ?? Landing
  return (
    <>
      <SiteHeader />
      <main className="page">
        <Page />
      </main>
    </>
  )
}
