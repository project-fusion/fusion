'use client'

import { useEffect, useState } from 'react'

/*
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
 * **Kept out of the spec runner by not being rendered there**, which replaced a
 * `window.location.pathname` test in this file. The sniff worked and put a route
 * into a component that has no other reason to know about routes; the structural
 * fix was read as needing a root layout per route group, and it did not. This
 * returns `null` and is a leaf, so where it renders is the whole of the
 * decision: `(site)`'s layout, the theme builder's layout, and the sandbox
 * *page* rather than the sandbox layout, which is an ancestor of `specs/`.
 * `fusion spec`'s `isolated` fails if the specs document ever registers the
 * library again, whichever way it is kept out.
 */

/**
 * Registers every Helix element the site uses, after React has hydrated.
 *
 * **The effect buys load order, not hydration safety.** The definitions leave
 * the critical path and arrive after the page does, measured at 169ms against a
 * load event at 136. The window where a tag is unknown is what
 * `@fusion.dev/helix-styles/helix.css` covers, hiding `:not(:defined)` by visibility
 * so the page does not reflow when the definitions land.
 */
export function HelixElements(): null {
  const [, setRegistered] = useState(false)

  useEffect(() => {
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
