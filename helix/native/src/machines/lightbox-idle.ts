/**
 * The chrome that hides while a reader is still, as the web's
 * `IdleController` hides it: `idle-delay` after the last touch or key, and
 * back at once on the next. A wait of zero keeps it up, and a closed viewer
 * is never idle.
 */
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { Stop } from '@fusion.dev/helix-core/capabilities/types'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Whether the chrome rests hidden, and what wakes it. */
export interface Idle {
  readonly resting: boolean
  /** The reader is there: the chrome comes back, and the wait starts again. */
  readonly stir: () => void
}

/** Hosts the wait, `delay` milliseconds, while the viewer is `open`. */
export const useIdle = (delay: number, open: boolean): Idle => {
  const [resting, setResting] = useState(false)
  const pending = useRef<Stop | undefined>(undefined)
  const latest = useRef({ delay, open })
  latest.current = { delay, open }
  const stir = useCallback(() => {
    pending.current?.()
    pending.current = undefined
    setResting(false)
    const { delay: wait, open: shown } = latest.current
    if (shown && wait > 0) {
      pending.current = timers().timeout(wait, () => {
        pending.current = undefined
        setResting(true)
      })
    }
  }, [])
  /* The chrome starts up as the viewer opens, and the wait with it. */
  useEffect(() => {
    pending.current?.()
    pending.current = undefined
    setResting(false)
    if (open && delay > 0) {
      pending.current = timers().timeout(delay, () => {
        pending.current = undefined
        setResting(true)
      })
    }
    return () => pending.current?.()
  }, [delay, open])
  return { resting: resting && open, stir }
}
