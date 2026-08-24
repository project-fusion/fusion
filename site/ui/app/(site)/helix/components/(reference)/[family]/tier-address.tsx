'use client'

import { useEffect } from 'react'

/**
 * Keeps `?tier=` describing the tier the page is actually showing.
 *
 * The parameter was only ever read here. A page arriving with `?tier=headless`
 * forces the attribute and documents the headless API, which is the half that makes
 * a link work, but flipping the same choice in the drawer left the address
 * alone. So a reader looking at the headless tables copied a URL that said nothing
 * about tiers, and whoever opened it got their own preference: exactly the
 * failure the parameter exists to prevent, arrived at from the other direction.
 * See 245.
 *
 * **The sandbox settled this argument already** and this is the same answer, so
 * that one concept does not get two behaviors on top of nearly getting two
 * names. The address describes what is on the page, whichever control put it
 * there, and styled is the absence, so an ordinary reference URL stays clean.
 *
 * **The address is written on a change and never on arrival**, which is what
 * protects a deliberate `?tier=styled`. That link is aimed at a reader whose own
 * preference is base, and styled being the absence means any pass that mirrors
 * the resting state deletes it. The page loads describing itself already, so
 * there is nothing to say until somebody says something.
 *
 * **Which is why this observes the attribute rather than calling `useApiTier`.**
 * That hook seeds `styled` and corrects itself in an effect, since the server
 * has no document to read, and a seed is indistinguishable from a reading once
 * it reaches a dependency array: the pin died within a frame of the load. Under
 * StrictMode it died anyway with a ref guarding the first pass, because the
 * effect runs twice and the guard is spent on the first. Reading the attribute
 * here makes the first value a fact rather than a placeholder, and re-reading it
 * on every mount is idempotent, so the double invocation is not a case.
 *
 * **Never written back to storage, and `replaceState` rather than `push`.**
 * Following somebody's link must not re-set your own drawer, which is why the
 * server component forces the attribute for this page only. And a tier is a
 * property of the page rather than a place on it: a reader who toggled twice
 * wants Back to leave the component, not to walk them through tiers.
 */
export function TierAddress(): null {
  useEffect(() => {
    const read = (): string =>
      document.documentElement.dataset.apiTier === 'headless' ? 'headless' : 'styled'

    /* What the page loaded showing, which the address already describes. */
    let showing = read()

    const watching = new MutationObserver(() => {
      const now = read()
      if (now === showing) {
        return
      }
      showing = now
      const params = new URLSearchParams(window.location.search)
      if (now === 'headless') {
        params.set('tier', 'headless')
      } else {
        params.delete('tier')
      }
      const query = params.size > 0 ? `?${params}` : ''
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${query}${window.location.hash}`,
      )
    })
    watching.observe(document.documentElement, {
      attributeFilter: ['data-api-tier'],
      attributes: true,
    })
    return () => watching.disconnect()
  }, [])

  return null
}
