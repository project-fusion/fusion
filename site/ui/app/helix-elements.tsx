'use client'

import { useEffect, useState } from 'react'

/**
 * Registers every Helix element the site uses, after React has hydrated.
 *
 * A custom element registers as a side effect of importing its module, and a
 * server component's imports never reach the browser. This is the only client
 * component on the site: pages stay server components, because an unregistered
 * tag is an unknown element in the HTML that upgrades when the definition
 * lands.
 *
 * **The import is in an effect, and the timing is the whole point.** Imported
 * at module scope the definitions arrive before React hydrates, so every
 * element upgrades first and writes its own state onto itself: `data-checked`
 * on a checked box, `data-open` on an open section, a reflected property's
 * value on anything carrying one. React then walks a DOM that has gained
 * attributes since the server wrote it, cannot tell an element's own
 * bookkeeping from a server/client disagreement, and reports a hydration
 * mismatch listing all of them.
 *
 * Measured rather than reasoned about: the served HTML contains none of those
 * attributes, `curl` finding zero `data-checked` and zero `data-open` against a
 * console listing both. The server and the client never disagreed; the elements
 * had simply already run.
 *
 * An effect runs after hydration, so React commits against the markup the
 * server actually sent and the elements upgrade into a tree nobody is checking
 * any more. The window where a tag is unknown is what `@helix-io/styled/elements.css`
 * already covers, hiding `:not(:defined)` by visibility so the page does not
 * reflow when the definitions land.
 */
export function HelixElements(): null {
  const [, setRegistered] = useState(false)

  useEffect(() => {
    let live = true
    void Promise.all([import('@helix-io/styled'), import('@helix-io/sandbox/specs')]).then(() => {
      if (live) {
        setRegistered(true)
      }
    })
    return () => {
      live = false
    }
  }, [])

  return null
}
