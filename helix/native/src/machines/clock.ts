/**
 * The clock machine an element that declares a `clock` runs: a tick on the
 * time of day, each time what is drawn from it goes stale, as a relative
 * time moves from "4 minutes ago" to "5 minutes ago".
 *
 * **It is core's `wallClock`**, through `useWallClock`, so the web's
 * `RelativeClockController` and a phone run one clock and a fake clock moves
 * both. It stops while the app is in the background and catches up as it
 * comes back.
 */
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import * as derivations from '@fusion.dev/helix-core/derivations'
import { useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { propsFor } from '../render/computed'
import type { Family } from '../style/form'
import { useWallClock } from './clocks'
import { boundTo, camel, given } from './props'

/**
 * Words the props that restart the clock are written in, so the clock starts
 * again as any of them changes: those `restarts` names, or every prop where
 * it names none.
 */
const keyOf = (props: Props, restarts: readonly string[] | undefined): string =>
  JSON.stringify(
    Object.entries(props)
      .filter(([name]) => restarts === undefined || restarts.some((one) => camel(one) === name))
      .map(([name, value]) =>
        value instanceof Date
          ? [name, value.getTime()]
          : [name, typeof value === 'object' ? 0 : value],
      ),
  )

/** The props a clock's `restarts` names, or nothing where it names none. */
const restartsOf = (use: MachineUse): readonly string[] | undefined => {
  const bound = use.bind.restarts as Readonly<{ props?: readonly string[] }> | undefined
  return bound?.props
}

/**
 * How long, from `now`, what is drawn at `now` holds, as the derivation the
 * clock is bound to says: `undefined` keeps no clock.
 */
const expiresAt = (
  family: Family,
  props: Props,
  name: string | undefined,
  now: number,
): number | undefined => {
  const derivation = (derivations as Readonly<Record<string, unknown>>)[name ?? '']
  if (typeof derivation !== 'function') {
    return undefined
  }
  const read: unknown = derivation(
    propsFor({ family }, (one) => (one === 'now' ? now : given(family, props, one))),
  )
  return typeof read === 'number' ? read : undefined
}

/**
 * Hosts the clock: the time of its last tick is the host's `now`, which
 * every derivation of the element reads. **Before the first tick it is the
 * time the element was first drawn**, as the web draws against the time it
 * was made, so the first frame already reads right. A change of a prop the
 * clock's `restarts` names starts it again, as the web's ticks as its date or
 * its reading changes, and any other draws from the last tick.
 */
export const useClocked = (family: Family, props: Props, use: MachineUse): Behavior => {
  const name = boundTo(use, 'expires', 'derive')
  const [first] = useState(() => timers().wall())
  const latest = useRef(props)
  latest.current = props
  const ticked = useWallClock(
    (now) => expiresAt(family, latest.current, name, now),
    keyOf(props, restartsOf(use)),
  )
  return { marks: [], parts: { host: { states: { now: String(ticked ?? first) } } } }
}
