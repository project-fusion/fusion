'use client'

import { useEffect, useState } from 'react'

/**
 * The one route that must not have the library, and why it cannot say so itself.
 *
 * The spec runner imports a bundle per family from `public/specs`, and each of
 * those carries the family it tests: it has to, because
 * `run-browser-specs.mjs` runs the same bundles against a blank page in CI,
 * where nothing else registers anything. In the sandbox's iframe that is a
 * second registration of tags this component has already made, and the library
 * warns about it by name, once per tag, saying the page holds two copies of
 * Helix. It does, and this is the copy that should not be there:
 * `spec-frame.tsx` says in as many words that it imports no components, "because
 * loading every component would be loading 92 families to test one". A root
 * layout is above that intent and overrides it, since a child route cannot
 * un-render a parent's component.
 *
 * **A path test, which is a sniff, and the structural fix is a root layout of
 * its own.** Next supports one per top-level route group, and that is the
 * version with no condition in it, at the cost of moving every route in the app
 * into a group. `fusion spec`'s `isolated` fails if the specs document ever
 * registers the library again, whichever way it is kept out.
 */
const SPECS = '/helix/sandbox/specs'

/**
 * Registers every Helix element the site uses, after React has hydrated.
 *
 * A custom element registers as a side effect of importing its module, and a
 * server component's imports never reach the browser. This is the only client
 * component on the site: pages stay server components, because an unregistered
 * tag is an unknown element in the HTML that upgrades when the definition
 * lands.
 *
 * **The effect buys load order, not hydration safety.** The definitions leave
 * the critical path and arrive after the page does, measured at 169ms against a
 * load event at 136. The window where a tag is unknown is what
 * `@fusion.dev/helix/elements.css` covers, hiding `:not(:defined)` by visibility
 * so the page does not reflow when the definitions land.
 *
 * **What keeps hydration clean is that the four state mirrors are
 * `ElementInternals.states` entries**, which are not in the DOM at all, so an
 * element may upgrade whenever it likes and React finds the markup it rendered.
 * A timing fix could never have been that guarantee: an effect runs after
 * hydration only while hydration is one pass, and anything that splits it, a
 * streamed segment or a suspended boundary, puts an upgrade back inside the
 * window.
 */
export function HelixElements(): null {
  const [, setRegistered] = useState(false)

  useEffect(() => {
    if (window.location.pathname === SPECS) {
      return
    }
    let live = true
    void Promise.all([import('@fusion.dev/helix'), import('@fusion.dev/helix-sandbox/specs')]).then(
      () => {
        if (live) {
          setRegistered(true)
        }
      },
    )
    return () => {
      live = false
    }
  }, [])

  return null
}
