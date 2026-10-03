'use client'

import { initTheme, type ThemeEngine } from '@fusion.dev/helix-theme'
import { type RefObject, useEffect, useRef } from 'react'
import { siteScheme } from '@/utils/site-scheme/site-scheme'
import { THEME_ENGINE } from '@/utils/theme-engine/theme-engine'
import { propertiesOf, type SentTheme, sentIntent } from './scope-theme'

/** Which mode a hero is shown in: the site's, or light or dark whatever the site is. */
export type Mode = 'site' | 'light' | 'dark'

/** The brand choice that is a whole theme from the builder rather than a color. */
export const YOURS = 'yours'

/**
 * Paints a hero's scope from its brand and mode controls: nothing where both
 * follow the site.
 *
 * **Swapped in one step, once the new values exist**, rather than cleared and
 * repainted: the engine loads asynchronously, and clearing first showed the
 * site's theme for a moment between any two choices, and on arrival between
 * the server's paint of a sent theme and the same values derived again.
 */
export function useScopeTheme(
  scope: RefObject<HTMLElement | null>,
  { brand, mode, sent }: { brand: string | null; mode: Mode; sent?: SentTheme | undefined },
): void {
  const engine = useRef<Promise<ThemeEngine> | null>(null)
  useEffect(() => {
    const node = scope.current
    if (!node) {
      return
    }
    const scheme = mode === 'site' ? siteScheme() : mode
    /* **The mode as the token layer takes it**, which is `data-color-mode`:
       the site's `light-dark()` is compiled into a shim that resolves
       through it, so `color-scheme` alone moved the scrollbars and left
       every token on its light arm, and the switcher did nothing a reader
       could see unless a brand was picked, which paints its colors outright. */
    node.style.colorScheme = mode === 'site' ? '' : scheme
    if (mode === 'site') {
      delete node.dataset.colorMode
    } else {
      node.dataset.colorMode = scheme
    }
    const paint = (values: Record<string, string>): void => {
      for (const name of [...node.style]) {
        if (name.startsWith('--helix-') && !(name in values)) {
          node.style.removeProperty(name)
        }
      }
      for (const [name, value] of Object.entries(values)) {
        node.style.setProperty(name, value)
      }
      /* **Marked as a theme, or the seeds are read by nothing.** The radii,
         the spacing and the series colors are derived from the seeds by
         `helix/styles` wherever `data-helix-theme` is, and only there: painted
         on an unmarked scope they sat unread and a sent radius of 90 still
         drew 4px corners. **And marked for a mode of its own**, since the
         tokens are resolved where they are declared, so a mode set on this
         scope moves them only where they are declared again here. Unmarked
         when following the site in everything, whose own values at the root
         a re-derivation here would override. */
      node.toggleAttribute('data-helix-theme', Object.keys(values).length > 0 || mode !== 'site')
    }
    const intent =
      brand === YOURS && sent ? sentIntent(sent.settings, scheme) : brand ? { brand, scheme } : null
    if (!intent) {
      paint({})
      return
    }
    let live = true
    engine.current ??= initTheme(THEME_ENGINE)
    engine.current
      .then((loaded) => {
        if (live) {
          paint(propertiesOf(loaded.derive(intent)))
        }
      })
      .catch(() => {
        /* Forgotten, so the next brand pressed loads it again: kept, one
           failed load left every swatch doing nothing for the visit. */
        engine.current = null
      })
    return () => {
      live = false
    }
  }, [brand, mode, scope, sent])
}
