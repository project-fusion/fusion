'use client'

import { useEffect, useState } from 'react'

/**
 * Which tier's API a reference page documents.
 */
export type ApiTier = 'headless' | 'styled'

/**
 * The API tier preference, as a value React can render from.
 */
export function useApiTier(): ApiTier {
  const [tier, setTier] = useState<ApiTier>('styled')

  useEffect(() => {
    const read = (): void => {
      setTier(document.documentElement.dataset.apiTier === 'headless' ? 'headless' : 'styled')
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
