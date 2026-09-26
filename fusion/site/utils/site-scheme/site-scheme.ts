'use client'

import { useEffect, useState } from 'react'

/** Light or dark, which is what a theme is derived in and a preview shows. */
export type Scheme = 'dark' | 'light'

/**
 * What the site is showing: the mode a reader chose on it, or their system's
 * where they chose none. Light where there is no document to ask, as on the
 * server.
 */
export const siteScheme = (): Scheme => {
  if (typeof document === 'undefined') {
    return 'light'
  }
  const chosen = document.documentElement.dataset.colorMode
  if (chosen === 'dark' || chosen === 'light') {
    return chosen
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * The site's mode, kept current: a reader choosing one on the site, or their
 * system turning dark at dusk, moves it. **Light for the first render**, which
 * is what the server rendered, and the real mode once the page can ask.
 */
export function useSiteScheme(): Scheme {
  const [scheme, setScheme] = useState<Scheme>('light')
  useEffect(() => {
    const follow = (): void => setScheme(siteScheme())
    follow()
    const modes = new MutationObserver(follow)
    modes.observe(document.documentElement, {
      attributeFilter: ['data-color-mode'],
      attributes: true,
    })
    const query = matchMedia('(prefers-color-scheme: dark)')
    query.addEventListener('change', follow)
    return () => {
      modes.disconnect()
      query.removeEventListener('change', follow)
    }
  }, [])
  return scheme
}
