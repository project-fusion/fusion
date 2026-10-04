import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core'
import { Pathname } from './pathname'

/** What the page can follow, in the order the control cycles them. */
const MODES = ['system', 'light', 'dark'] as const

type Mode = (typeof MODES)[number]

/** The glyph each mode is announced and drawn with. */
const MARKS: Record<Mode, string> = { dark: 'moon', light: 'sun', system: 'monitor' }

/**
 * The bar across the top: the wordmark, the destinations, and the color mode.
 *
 * `CUSTOM_ELEMENTS_SCHEMA` is what lets Angular compile a template holding
 * tags it does not know. It turns off the unknown-element check for this
 * template alone, so keep it on the components that render Helix.
 *
 * **A tag of its own, drawn as no box.** Selected by an attribute on
 * `helix-app-header`, the component would leave that attribute on a Helix
 * element, which Helix diagnostics reports as one the element does not take.
 * `display: contents` makes the bar a child of the shell's column again, which
 * a sticky header needs: it sticks only within its parent's box.
 */
@Component({
  host: { style: 'display: contents' },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-site-header',
  templateUrl: './site-header.html',
})
export class SiteHeader {
  protected readonly path = inject(Pathname).current
  protected readonly marks = MARKS
  /* `system` is the resting state, the mode the page follows until the control is pressed. */
  protected readonly mode = signal<Mode>('system')

  /**
   * One attribute, two modes, and no second stylesheet.
   *
   * Every Helix token is written once as a `light-dark()` pair, so
   * `color-scheme` decides which half resolves. `data-color-mode` sets it, and
   * since `color-scheme` inherits, the attribute works on any element: put it
   * on a panel for a light preview inside a dark page.
   *
   * `system` removes the attribute. Writing out whichever mode is current would
   * hold the page there when the system's own setting changed.
   */
  protected cycle(): void {
    const next = MODES[(MODES.indexOf(this.mode()) + 1) % MODES.length] ?? 'system'
    this.mode.set(next)
    if (next === 'system') {
      delete document.documentElement.dataset['colorMode']
      return
    }
    document.documentElement.dataset['colorMode'] = next
  }
}
