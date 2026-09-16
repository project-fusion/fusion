import { useState } from 'react'
import { Link, usePathname } from './routes.js'

/** What the page can follow, in the order the control cycles them. */
const MODES = ['system', 'light', 'dark'] as const

type Mode = (typeof MODES)[number]

/** The glyph each mode is announced and drawn with. */
const MARKS: Record<Mode, string> = { dark: 'moon', light: 'sun', system: 'monitor' }

/**
 * The bar across the top: the wordmark, the destinations, and the color mode.
 */
export function SiteHeader() {
  const path = usePathname()
  /* `system` is the resting state and what the markup is served in, so the
     control draws the same glyph on the server and on the first client paint. */
  const [mode, setMode] = useState<Mode>('system')

  /**
   * One attribute, two modes, and no second stylesheet.
   *
   * Every Helix token is written once as a `light-dark()` pair, so which half
   * resolves is decided by `color-scheme` and nothing else. `data-color-mode`
   * sets it, and because `color-scheme` inherits the attribute works on any
   * element, not only on the root: put it on a panel for a light preview inside
   * a dark page.
   *
   * `system` removes the attribute rather than writing out whichever mode is
   * current, which would freeze the page there the moment the reader's machine
   * changed.
   */
  const cycle = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length]
    setMode(next)
    if (next === 'system') {
      delete document.documentElement.dataset.colorMode
      return
    }
    document.documentElement.dataset.colorMode = next
  }

  return (
    <helix-app-header material="glass" sticky>
      <span slot="start">__PROJECT_NAME__</span>

      {/* The links are yours. Navigation owns the marker that travels between
          them and renders no anchors of its own, because a router renders its
          own and could not render them inside this shadow root. The base layer
          styles them, `aria-current="page"` included. */}
      <helix-navigation label="Pages">
        <Link aria-current={path === '/' ? 'page' : undefined} href="/">
          Overview
        </Link>
        <Link aria-current={path === '/join' ? 'page' : undefined} href="/join">
          Join
        </Link>
      </helix-navigation>

      {/* An icon with no words has no accessible name unless it is given one,
          which is the whole reason this is its own element rather than a button
          with a glyph in it. */}
      <helix-icon-button
        label={`Color mode: ${mode}`}
        onClick={cycle}
        slot="end"
        title={`Color mode: ${mode}`}
      >
        <helix-icon name={MARKS[mode]} />
      </helix-icon-button>
    </helix-app-header>
  )
}
