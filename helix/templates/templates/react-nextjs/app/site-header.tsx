'use client'

/*
 * **A handler is what makes this a client component**, and so does `usePathname`:
 * a server component's output is serialized, and a function cannot be. The bar
 * is rendered from the layout, so it stays in place across a navigation and is
 * built once.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

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
   * Every Helix token is written once as a `light-dark()` pair, so
   * `color-scheme` decides which half resolves. `data-color-mode` sets it, and
   * since `color-scheme` inherits, the attribute works on any element: put it
   * on a panel for a light preview inside a dark page.
   *
   * `system` removes the attribute. Writing out whichever mode is current would
   * hold the page there when the system's own setting changed.
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
      {/* The wordmark is the way back to the first page, as a wordmark usually
          is, so there is no third destination in the bar saying the same thing.
          It is also the only name of the project on the screen: the landing
          page leads with what the starter is.

          The mark is a placeholder for your own, and it is drawn in
          `--helix-color-brand-mark`, the token for the brand as a graphic. */}
      <Link className="wordmark" data-link="quiet" href="/" slot="start">
        <helix-icon name="cube" />
        <helix-text variant="body-strong">__PROJECT_NAME__</helix-text>
      </Link>

      {/* The links are yours. Navigation owns the marker that travels between
          them and renders no anchors of its own, since a router renders its
          own, which could not sit inside this shadow root. The base layer
          styles them, `aria-current="page"` included. */}
      <helix-navigation label="Pages">
        <Link aria-current={path === '/overview' ? 'page' : undefined} href="/overview">
          Overview
        </Link>
        <Link aria-current={path === '/join' ? 'page' : undefined} href="/join">
          Join
        </Link>
      </helix-navigation>

      {/* An icon with no words has no accessible name until it is given one,
          which is why this is its own element. */}
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
