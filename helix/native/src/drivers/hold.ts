import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { Stop } from '@fusion.dev/helix-core/capabilities/types'
import { REPEAT_DELAY, REPEAT_EVERY } from '@fusion.dev/helix-core/number-field'
import { useCallback, useEffect, useMemo, useRef } from 'react'

/** A press that repeats while it is held: where it starts, and where it lets go. */
export interface Hold {
  /** Steps once, and starts repeating. */
  readonly start: () => void
  /** Stops repeating, as the finger lifts or the touch is taken away. */
  readonly stop: () => void
}

/** How long a hold waits before it repeats, and how often it repeats after that, in milliseconds. */
export interface HoldTimings {
  readonly delay: number
  readonly every: number
}

/** The web's Number Input's timings: React Aria's NumberField's 400 and 60. */
export const STEPPER_TIMINGS: HoldTimings = { delay: REPEAT_DELAY, every: REPEAT_EVERY }

/**
 * Repeats `step` while a press is held, on the timers capability: once at
 * the press, again after `delay`, and every `every` milliseconds after that,
 * as the web's stepper buttons repeat. **A step that moves nothing ends the
 * hold**, as a number reaching an end does, and `step` says whether it moved.
 *
 * The fake clock of a spec or a conformance scenario moves a hold, since
 * each wait is a timeout the capability holds.
 */
export const holdToRepeat = (step: () => boolean, timings: HoldTimings = STEPPER_TIMINGS): Hold => {
  let waiting: Stop | undefined
  const stop = (): void => {
    waiting?.()
    waiting = undefined
  }
  const again = (): void => {
    waiting = step() ? timers().timeout(timings.every, again) : undefined
  }
  return {
    start: () => {
      stop()
      waiting = step() ? timers().timeout(timings.delay, again) : undefined
    },
    stop,
  }
}

/**
 * A hold kept across renders, which reads the latest `step` at each repeat
 * and stops as the view that holds it goes.
 */
export const useHold = (step: () => boolean, timings: HoldTimings = STEPPER_TIMINGS): Hold => {
  const latest = useRef(step)
  latest.current = step
  const hold = useMemo(() => holdToRepeat(() => latest.current(), timings), [timings])
  useEffect(() => hold.stop, [hold])
  const start = useCallback(() => hold.start(), [hold])
  const stop = useCallback(() => hold.stop(), [hold])
  return useMemo(() => ({ start, stop }), [start, stop])
}
