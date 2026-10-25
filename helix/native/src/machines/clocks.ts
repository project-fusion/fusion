/**
 * The waits a component keeps on a phone: a delay, a countdown that pauses,
 * and a tick on the time of day, each core's own on the timers capability,
 * so the web's and a phone's run the same and a fake clock drives both.
 */
import {
  type Countdown,
  type CountdownOptions,
  countdown,
  type Delay,
  delay,
} from '@fusion.dev/helix-core/machines/countdown'
import { wallClock } from '@fusion.dev/helix-core/machines/wall-clock'
import { useEffect, useRef, useState } from 'react'

/**
 * A delay that lives as long as the component, and draws again as it
 * elapses. **It is stopped as the component goes**, so nothing it holds runs
 * after.
 */
export const useDelay = (): Delay => {
  const [, drawn] = useState(false)
  const held = useRef<Delay>(undefined)
  held.current ??= delay(drawn)
  useEffect(() => () => held.current?.cancel(), [])
  return held.current
}

/**
 * A countdown that lives as long as the component. `options` are read as it
 * first draws, and `done` and `paused` as they are when they run. **It stops
 * and drops its holds as the component goes**, as the web's does as its
 * element leaves the page.
 */
export const useCountdown = (options: CountdownOptions): Countdown => {
  const latest = useRef(options)
  latest.current = options
  const held = useRef<Countdown>(undefined)
  held.current ??= countdown({
    done: () => latest.current.done(),
    holdWhileHidden: options.holdWhileHidden === true,
    paused: (paused) => latest.current.paused?.(paused),
  })
  useEffect(() => () => held.current?.dispose(), [])
  return held.current
}

/**
 * The time of day, drawn again each time `expires` says what is drawn from
 * it changes, as a relative time is. **It stops while the app is in the
 * background and catches up as it comes back.** `expires` is read as it
 * runs, and `undefined` from it stops the clock until `key` changes.
 */
export const useWallClock = (
  expires: (now: number) => number | undefined,
  key?: unknown,
): number | undefined => {
  const latest = useRef(expires)
  latest.current = expires
  const [now, setNow] = useState<number>()
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` starts the clock again
  useEffect(() => wallClock({ expires: (at) => latest.current(at), tick: setNow }), [key])
  return now
}
