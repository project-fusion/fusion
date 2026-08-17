'use client'

import type { HelixDrawer } from '@helix-io/web'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useHelixEvent } from '../lib/use-helix-event'
import { PreferencesDrawer } from './preferences'
import { VERTICALS } from './verticals'
import { Wordmark } from './wordmark'

/**
 * Site navigation: the verticals, centered in the masthead.
 *
 * Plain links inside a `Navigation`, marked with `aria-current` and styled by the
 * `` recipe. Not tabs, because a tab controls a panel and
 * announces itself inside a `tablist`, and these are routes. Not a toggle group
 * either, which is a radio group and would announce a set of destinations as a
 * set of choices. The look was the only part navigation ever wanted from
 * either.
 *
 * The header's regions are named for where they are rather than what is in
 * them, so the wordmark is `start` and the actions are `end`. The `<nav>`
 * landmark and the traveling marker belong to `Navigation`.
 *
 * The current item comes from the pathname, so it is right on a cold load of
 * any URL rather than only after a click.
 *
 * **The header and the drawers are siblings, and have to be.** A filter, which
 * `backdrop-filter` is, makes an element a containing block for
 * `position: fixed` descendants: a drawer rendered inside the header is
 * positioned against the header, comes out one header tall, and shoves the
 * layout around. That is also why this component owns the header rather than
 * being slotted into one, and why the header is flat by default.
 */
export function SiteNav() {
  const pathname = usePathname()
  const [narrow, setNarrow] = useState(false)
  const [open, setOpen] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const nav = useRef<HelixDrawer>(null)

  // Bound from an effect. A Helix event given to React as a prop is never
  // listened for on a page that was server-rendered. See `useHelixEvent`.
  useHelixEvent(nav, 'helix-close', () => {
    setOpen(false)
  })
  useHelixEvent(nav, 'helix-open', () => {
    setOpen(true)
  })

  useEffect(() => {
    const query = window.matchMedia('(max-width: 48rem)')
    const sync = () => setNarrow(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  // The deepest matching vertical, so `/design/components/card` still marks
  // Design rather than nothing.
  const current =
    VERTICALS.map((vertical) => vertical.href)
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] ?? ''

  return (
    <>
      <helix-app-header sticky>
        <a data-link="quiet" href="/" slot="start">
          <Wordmark />
        </a>

        {!narrow && (
          <helix-navigation label="Verticals">
            {VERTICALS.map((vertical) => (
              <Link
                aria-current={current === vertical.href ? 'page' : undefined}
                href={vertical.href}
                key={vertical.href}
              >
                {vertical.label}
              </Link>
            ))}
          </helix-navigation>
        )}

        <helix-tooltip content="Preferences" placement="bottom" slot="end">
          <helix-icon-button label="Preferences" onClick={() => setPrefsOpen(true)}>
            <helix-icon name="gear"></helix-icon>
          </helix-icon-button>
        </helix-tooltip>

        {narrow && (
          <helix-button appearance="tertiary" onClick={() => setOpen(true)} slot="end">
            Menu
          </helix-button>
        )}
      </helix-app-header>

      <PreferencesDrawer onOpenChange={setPrefsOpen} open={prefsOpen} />

      <helix-drawer label="Site navigation" open={open} placement="end" ref={nav}>
        <helix-flex align="start" direction="column" gap="lg">
          {VERTICALS.map((vertical) => (
            <a
              data-link
              data-link-size="lg"
              href={vertical.href}
              key={vertical.href}
              onClick={() => setOpen(false)}
            >
              {vertical.label}
            </a>
          ))}
          <a data-button="primary" data-density="lg" href="mailto:hello@fusion.dev">
            Get in touch
          </a>
        </helix-flex>
      </helix-drawer>
    </>
  )
}
