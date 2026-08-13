'use client'

import type { HelixOpenChangeEvent } from '@helix-io/web'
import { useEffect, useState } from 'react'
import { FusionLogo } from './fusion-logo'
import { Preferences } from './preferences'

/** The verticals, in the order the company is organised. Design leads. */
const VERTICALS = [
  { href: '#design', label: 'Design' },
  { href: '#mind', label: 'Mind' },
  { href: '#energy', label: 'Energy' },
  { href: '#capital', label: 'Capital' },
]

/**
 * Site navigation: the verticals, centred in the banner.
 *
 * A toggle group in `nav` mode: the items are real links inside a navigation
 * landmark, and the selection is marked by an indicator that travels between
 * them. Not tabs, and the difference is not cosmetic: a tab controls a panel
 * and announces itself inside a `tablist`, so borrowing the role would promise
 * panels that do not exist. The moving marker is the part that was wanted, and
 * it does not require the wrong semantics to get.
 *
 * **The header and the drawer are siblings, and have to be.** `backdrop-filter`
 * on the header's material makes it a containing block for `position: fixed`
 * descendants, so a drawer rendered inside it is positioned against the header
 * rather than the viewport and comes out one header tall. Any overlay belonging
 * to a translucent surface has to live beside it, not in it. That is also why
 * this component owns the header rather than being slotted into one.
 */
export function SiteNav() {
  const [narrow, setNarrow] = useState(false)
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')

  useEffect(() => {
    const query = window.matchMedia('(max-width: 48rem)')
    const sync = () => setNarrow(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  // Marks the section being read, so the nav says where you are rather than
  // only where you can go.
  useEffect(() => {
    const sections = VERTICALS.map((entry) => document.querySelector(entry.href)).filter(Boolean)
    if (sections.length === 0) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible[0]?.target.id) {
          setCurrent(`#${visible[0].target.id}`)
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    for (const section of sections) {
      observer.observe(section as Element)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <helix-app-header nav-align="center">
        <helix-link appearance="quiet" href="/" slot="brand">
          <helix-flex align="center" gap="xs" inline>
            <FusionLogo size="1.5rem" />
            <helix-text class="wordmark" appearance="body-strong">
              Fusion
            </helix-text>
          </helix-flex>
        </helix-link>

        {!narrow && (
          <helix-toggle-group appearance="plain" label="Verticals" nav value={current}>
            {VERTICALS.map((entry) => (
              <helix-toggle-group-item href={entry.href} key={entry.href} value={entry.href}>
                {entry.label}
              </helix-toggle-group-item>
            ))}
          </helix-toggle-group>
        )}

        <Preferences />

        {narrow ? (
          <helix-button appearance="subtle" onClick={() => setOpen(true)} size="sm" slot="actions">
            Menu
          </helix-button>
        ) : (
          <helix-button
            appearance="primary"
            href="mailto:hello@fusion.dev"
            size="sm"
            slot="actions"
          >
            Get in touch
          </helix-button>
        )}
      </helix-app-header>

      <helix-drawer
        label="Site navigation"
        onOpenChange={(event: HelixOpenChangeEvent) => setOpen(event.detail.open)}
        open={open}
        placement="end"
      >
        <helix-flex align="start" class="navDrawer" direction="column" gap="lg">
          {VERTICALS.map((entry) => (
            <helix-link href={entry.href} key={entry.href} onClick={() => setOpen(false)} size="lg">
              {entry.label}
            </helix-link>
          ))}
          <helix-button appearance="primary" href="mailto:hello@fusion.dev" size="lg">
            Get in touch
          </helix-button>
        </helix-flex>
      </helix-drawer>
    </>
  )
}
