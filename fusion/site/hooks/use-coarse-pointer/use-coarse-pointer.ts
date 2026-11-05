import { useEffect, useState } from 'react'

/**
 * Whether the main pointer is a finger, as a value React can render from.
 *
 * False on the server and on the first paint, then read from
 * `(pointer: coarse)` and kept in step when the pointer changes. A map on the
 * site reads it to set `gestures="cooperative"` on a touch screen, so one
 * finger scrolls the page and two fingers move the map.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    const query = matchMedia('(pointer: coarse)')
    const sync = (): void => setCoarse(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return coarse
}
