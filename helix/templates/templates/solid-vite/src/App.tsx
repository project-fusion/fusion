import { Dynamic } from 'solid-js/web'
import { Landing } from './landing.tsx'
import { Overview } from './overview.tsx'
import { pathname } from './routes.ts'
import { SignupForm } from './signup-form.tsx'
import { SiteFooter } from './site-footer.tsx'
import { SiteHeader } from './site-header.tsx'

/** The page for each path, in the order the bar offers them. */
const PAGES = {
  '/': Landing,
  '/join': SignupForm,
  '/overview': Overview,
}

/**
 * The shell, and the switch between the three pages.
 *
 * Helix components are custom elements, so you write the tags directly. There
 * is no wrapper package and nothing to import per component: `src/main.tsx`
 * registers them once, and every tag in the app is real from then on.
 */
export function App() {
  /* The bar, the route, and the footer, in a column the height of the window.
     `app.css` says why the footer is worth having and why the column is flex. */
  return (
    <div class="shell">
      <SiteHeader />
      <main class="page">
        <Dynamic component={PAGES[pathname() as keyof typeof PAGES] ?? Landing} />
      </main>
      <SiteFooter />
    </div>
  )
}
