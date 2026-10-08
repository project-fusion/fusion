import { useEffect, useState } from 'react'
import type { Motion } from '@/utils/motion/motion'

/**
 * The motion preference, as a value React can render from.
 *
 * Read from `data-motion` on the document, which the pre-paint script writes
 * from storage and the preferences drawer writes when the reader chooses.
 */
export function useMotion(): Motion {
  const [motion, setMotion] = useState<Motion>('on')

  useEffect(() => {
    const read = (): void => {
      setMotion(document.documentElement.dataset.motion === 'off' ? 'off' : 'on')
    }
    read()
    const watching = new MutationObserver(read)
    watching.observe(document.documentElement, {
      attributeFilter: ['data-motion'],
      attributes: true,
    })
    return () => watching.disconnect()
  }, [])

  return motion
}
