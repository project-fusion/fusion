import { useEffect, useState } from 'react'
import { type Platform, readPlatform } from '@/utils/platform/platform'

/**
 * The platform preference, as a value React can render from.
 *
 * Read from `data-platform` on the document, which the pre-paint script writes
 * from storage and the preferences drawer writes when the reader chooses. The
 * first render is always `web`, as the server's is, so hydration matches.
 */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('web')

  useEffect(() => {
    const read = (): void => {
      setPlatform(readPlatform(document.documentElement))
    }
    read()
    const watching = new MutationObserver(read)
    watching.observe(document.documentElement, {
      attributeFilter: ['data-platform'],
      attributes: true,
    })
    return () => watching.disconnect()
  }, [])

  return platform
}
