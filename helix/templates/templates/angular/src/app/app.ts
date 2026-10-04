import { Component, inject } from '@angular/core'
import { Landing } from './landing'
import { Overview } from './overview'
import { Pathname } from './pathname'
import { SignupForm } from './signup-form'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

/**
 * The shell, and the switch between the three pages.
 *
 * Helix components are custom elements, so you write the tags directly. There
 * is no wrapper package and nothing to import per component: `src/main.ts`
 * registers them once, and every tag in the app is real from then on.
 *
 * **A page and the footer are each a component on the element it draws**,
 * selected by an attribute: `footer[app-site-footer]`, and a `div` for each
 * page. A tag of their own would put an element between the shell and what
 * they draw, which the shell's column and `app.css` would then have to know
 * about. The header is the exception, and `site-header.ts` says why.
 */
@Component({
  imports: [Landing, Overview, SignupForm, SiteFooter, SiteHeader],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly path = inject(Pathname).current
}
