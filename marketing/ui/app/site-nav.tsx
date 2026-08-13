'use client'

import type { HelixOpenChangeEvent } from '@helix-io/web'
import { useEffect, useState } from 'react'
import { FusionLogo } from './fusion-logo'

const LINKS = [
  { href: '#substrates', label: 'Substrates' },
  { href: '#verticals', label: 'Verticals' },
  { href: '#questions', label: 'Questions' },
]

/**
 * Site navigation, inline on wide screens and in a drawer on narrow ones.
 *
 * Three links plus a call to action do not fit beside a wordmark on a phone,
 * and a nav that scrolls sideways inside the header reads as broken rather than
 * as scrollable: the last item is cut mid-word with nothing to say it continues.
 *
 * The drawer is a real one. Focus is trapped inside it, Escape closes it, and
 * the page behind is covered, which is the difference between a menu and a
 * panel that happens to be on top.
 *
 * **The header and the drawer are siblings, and have to be.** `backdrop-filter`
 * on the header's material makes it a containing block for `position: fixed`
 * descendants, so a drawer rendered inside it is positioned against the header
 * rather than the viewport and comes out one header tall. Any overlay belonging
 * to a translucent surface has to live beside it, not in it.
 *
 * That is also why this component owns the header rather than being slotted
 * into one: the two have to be emitted together to stay siblings.
 */
export function SiteNav() {
  const [narrow, setNarrow] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 48rem)')
    const sync = () => setNarrow(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  if (!narrow) {
    return (
      <>
        {LINKS.map((link) => (
          <helix-link appearance="quiet" href={link.href} key={link.href}>
            {link.label}
          </helix-link>
        ))}
        <helix-button appearance="primary" href="mailto:hello@fusion.dev" size="sm" slot="actions">
          Get in touch
        </helix-button>
      </>
    )
  }

  return (
    <helix-flex align="center" gap="2xs" slot="actions">
      <helix-button appearance="subtle" onClick={() => setOpen(true)} size="sm">
        Menu
      </helix-button>

      <helix-drawer
        label="Site navigation"
        onOpenChange={(event: HelixOpenChangeEvent) => setOpen(event.detail.open)}
        open={open}
        placement="end"
      >
        <helix-flex direction="column" gap="lg" style={{ padding: '1.5rem' }}>
          <helix-flex direction="column" gap="sm">
            {LINKS.map((link) => (
              <helix-link href={link.href} key={link.href} onClick={() => setOpen(false)} size="lg">
                {link.label}
              </helix-link>
            ))}
          </helix-flex>
          <helix-button appearance="primary" href="mailto:hello@fusion.dev" size="lg">
            Get in touch
          </helix-button>
        </helix-flex>
      </helix-drawer>
    </helix-flex>
  )
}
