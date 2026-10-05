import { createSignal } from 'solid-js'
import { pathname } from './routes.ts'

/** What the page can follow, in the order the control cycles them. */
const MODES = ['system', 'light', 'dark'] as const

type Mode = (typeof MODES)[number]

/** The glyph each mode is announced and drawn with. */
const MARKS: Record<Mode, string> = { dark: 'moon', light: 'sun', system: 'monitor' }

/**
 * The bar across the top: the wordmark, the destinations, and the color mode.
 */
export function SiteHeader() {
  /* `system` is the resting state, the mode the page follows until the control is pressed. */
  const [mode, setMode] = createSignal<Mode>('system')

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
  const cycle = () => {
    const next = MODES[(MODES.indexOf(mode()) + 1) % MODES.length] ?? 'system'
    setMode(next)
    if (next === 'system') {
      delete document.documentElement.dataset.colorMode
      return
    }
    document.documentElement.dataset.colorMode = next
  }

  return (
    <helix-app-header material="glass" sticky>
      {/* The wordmark is the way back to the first page, so there is no third
          destination in the bar saying the same thing. It names the library the
          starter is built on, and it is the place for your own name or logo. */}
      <a class="wordmark" data-link="quiet" href="#/" slot="start">
        <helix-text variant="body-strong">Helix</helix-text>
      </a>

      {/* The links are yours. Navigation owns the marker that travels between
          them and renders no anchors of its own. The base layer styles them,
          `aria-current="page"` included. */}
      <helix-navigation label="Pages">
        <a aria-current={pathname() === '/overview' ? 'page' : undefined} href="#/overview">
          Overview
        </a>
        <a aria-current={pathname() === '/join' ? 'page' : undefined} href="#/join">
          Join
        </a>
      </helix-navigation>

      {/* An icon with no words has no accessible name until it is given one,
          which is why this is its own element. */}
      <helix-icon-button
        label={`Color mode: ${mode()}`}
        onClick={cycle}
        slot="end"
        title={`Color mode: ${mode()}`}
      >
        <helix-icon name={MARKS[mode()]} />
      </helix-icon-button>
    </helix-app-header>
  )
}
