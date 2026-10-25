/**
 * The delay machine an element that declares a `delay` runs: a wait it
 * starts as it is drawn, and the state that holds while the wait runs, as a
 * loader waits out its `delay` before it shows.
 *
 * **It is core's `delay`**, through `useDelay`, so the web's
 * `DelayController` and a phone run one wait and a fake clock moves both.
 */
import { useEffect, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { useDelay } from './clocks'
import { boundTo, given } from './props'

/** A wait in milliseconds, from a number or the web attribute's words, `300ms` or `0.3s`. */
export const waitOf = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value !== 'string') {
    return 0
  }
  const read = /^\s*(-?[\d.]+)\s*(ms|s)?\s*$/.exec(value)
  const count = Number(read?.[1])
  if (read === null || !Number.isFinite(count)) {
    return 0
  }
  return read[2] === 's' ? count * 1000 : count
}

/**
 * Hosts the wait: started as the element is drawn where it waits at all,
 * and again as the prop `restarts` names stops holding. **The state holds
 * while the wait runs and that prop does not hold**, as the web's loader is
 * `waiting` only while it is not idle.
 */
export const useDelayed = (family: Family, props: Props, use: MachineUse): Behavior => {
  const wait = useDelay()
  const after = waitOf(given(family, props, boundTo(use, 'after', 'prop')))
  const restarts = boundTo(use, 'restarts', 'prop')
  const resting = restarts !== undefined && given(family, props, restarts) === true
  const state = boundTo(use, 'waiting', 'state') ?? 'waiting'
  const anew = given(family, props, boundTo(use, 'again', 'prop'))
  const was = useRef<boolean | undefined>(undefined)
  const last = useRef<unknown>(anew)
  const changed = was.current !== undefined && last.current !== anew
  useEffect(() => {
    const first = was.current === undefined
    const woke = was.current === true && !resting
    const moved = !first && last.current !== anew
    was.current = resting
    last.current = anew
    if ((first || woke || moved) && !resting && after > 0) {
      wait.start(after)
    }
  }, [after, anew, resting, wait])
  /* A wait the effect is about to start counts as running already: on the
     first frame, as the web hides the loader in its served markup, on the
     frame `restarts` stops holding, and on the frame `again` changes, so
     nothing flashes before it starts. */
  const starting =
    after > 0 && !resting && (was.current === true || was.current === undefined || changed)
  const pending = wait.pending || starting
  return { marks: [], parts: { host: { states: { [state]: pending && !resting } } } }
}
