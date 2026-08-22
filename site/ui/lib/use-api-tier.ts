'use client'

import { useEffect, useState } from 'react'

/**
 * Which tier's API a reference page documents.
 *
 * `styled` is the default because it is the tier almost everyone consumes, and
 * because it is a superset: the styled element extends the base one, so its
 * tables already contain every member the base tables would show. A reader who
 * has not expressed a preference is better served by the larger, more common
 * answer than by being asked a question they have no reason to have an opinion
 * about yet.
 *
 * Declared here rather than beside the drawer that writes it, because there are
 * now two readers: the drawer sets it and the sandbox filters on it. A union
 * written out twice is a union that eventually disagrees with itself.
 */
export type ApiTier = 'base' | 'styled'

/**
 * The API tier preference, as a value React can render from.
 *
 * **Read off the document rather than out of storage.** `Preferences` writes
 * both: `localStorage` so the choice survives a reload, and
 * `document.documentElement.dataset.apiTier` so CSS can act on it before
 * anything hydrates. The attribute is the one that is authoritative at render
 * time, because it is already correct on the first paint, and reading storage
 * here would be a second source that disagrees for as long as it takes the two
 * to be set.
 *
 * **Styled is the absence of the attribute**, which is the same resting state
 * the stylesheet asks about, so a document nobody has expressed a preference on
 * reads as the common answer rather than as unknown.
 *
 * **`useState` seeded to `styled` and corrected in an effect**, not read during
 * render. The server has no document, so reading one during render is a
 * hydration mismatch on every page that uses this; the effect runs after the
 * first commit, where the two trees have already agreed.
 *
 * The observer is what makes it live: the preferences drawer sets the attribute
 * on the same document, with no event to listen for, and a reader changing tiers
 * expects the page under the drawer to follow.
 */
export function useApiTier(): ApiTier {
  const [tier, setTier] = useState<ApiTier>('styled')

  useEffect(() => {
    const read = (): void => {
      setTier(document.documentElement.dataset.apiTier === 'base' ? 'base' : 'styled')
    }
    read()
    const watching = new MutationObserver(read)
    watching.observe(document.documentElement, {
      attributeFilter: ['data-api-tier'],
      attributes: true,
    })
    return () => watching.disconnect()
  }, [])

  return tier
}
