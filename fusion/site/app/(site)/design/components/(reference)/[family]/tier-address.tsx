'use client'

import { useEffect } from 'react'

/**
 * Keeps `?tier=` describing the tier the page is actually showing.
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
