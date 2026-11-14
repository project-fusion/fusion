/**
 * A tour's focus, which follows the run as the web's tour moves it.
 *
 * **Opening moves focus to the current stop's panel**, once its layer has
 * drawn it, and remembers where it was. **A move takes it to the new stop's
 * panel where it was in the tour**: on no view, as after a touch, or in a
 * stop's panel or on one of its controls. It stays where a reader put it
 * otherwise. **Ending gives it back to where it was as the tour opened**,
 * again only where it was in the tour. A stop that is preparing shows once
 * its `effect` settles, and focus moves to it then where it was still in
 * the tour. **A `wait` stop shows no panel**, and focus goes to the view
 * registered as the target of the stop before it, which is usually the
 * control the reader is asked to use, or back to where it was as the tour
 * opened where there is none. The web finds the first control inside that
 * target, and a phone has no element to look inside, so it focuses the view
 * itself. A move on from there counts as a move from inside the tour.
 */
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { useEffect, useRef } from 'react'
import { targetNow } from '../render/targets'
import { type StopMember, stopBefore } from './tour-run'

/** What a tour's focus reads, at one render. */
export interface TourFocus {
  readonly at: number
  readonly members: readonly (readonly [object, StopMember])[]
  readonly open: boolean
  readonly preparing: object | undefined
}

/** How many frames a move waits for the next panel to be drawn before it gives up. */
const FRAMES = 30

/** Whether a view is still drawn, where it can say so. */
const drawn = (node: unknown): boolean =>
  node !== null &&
  node !== undefined &&
  (node as { readonly isConnected?: boolean }).isConnected !== false

/** Where a tour stood at one render, which its focus moves on the change of. */
interface Stood {
  readonly at: number
  readonly open: boolean
  readonly preparing: object | undefined
}

/**
 * How the tour changed since it last stood: it opened, it closed, or it
 * moved to another stop, or showed the stop that was preparing.
 */
const changeOf = (was: Stood, now: Stood): 'closed' | 'moved' | 'opened' | undefined => {
  if (now.open !== was.open) {
    return now.open ? 'opened' : 'closed'
  }
  const shown = was.preparing !== undefined && now.preparing === undefined
  return now.open && (now.at !== was.at || shown) ? 'moved' : undefined
}

/**
 * Where focus waits at a `wait` stop: the view the stop before it points
 * at, or where focus was as the tour opened.
 */
const parkingOf = (
  members: readonly (readonly [object, StopMember])[],
  at: number,
  back: unknown,
): unknown => {
  const before = stopBefore(
    members.map(([, one]) => one.type()),
    at,
  )
  const target = before === undefined ? null : targetNow(members[before]?.[1].target() ?? '')
  return drawn(target) ? target : back
}

/** Moves focus with a tour's run. */
export const useTourFocus = ({ at, members, open, preparing }: TourFocus): void => {
  const back = useRef<unknown>(null)
  /* Where focus was put while a `wait` stop waits. */
  const parked = useRef<unknown>(null)
  const latest = useRef({ at, members })
  latest.current = { at, members }
  const stood = useRef<Stood>({ at, open, preparing })
  /* Whether focus is in the tour: on no view, where it waits at a `wait`
     stop, or inside one of its stops. */
  const inside = (): boolean => {
    const held = focus().focused()
    return (
      held === null ||
      (parked.current !== null && held === parked.current) ||
      latest.current.members.some(([, member]) => member.layer().holds?.() === true)
    )
  }
  const frame = useRef(0)
  /* Focus on the current stop's panel once its layer draws it, or where it
     waits at a `wait` stop. */
  const land = (left: number) => {
    const member = latest.current.members[latest.current.at]?.[1]
    if (member?.type() === 'wait') {
      const park = parkingOf(latest.current.members, latest.current.at, back.current)
      if (drawn(park)) {
        focus().focus(park, false)
        parked.current = park
      }
      return
    }
    const view = member?.layer().view?.()
    if (drawn(view)) {
      focus().focus(view, false)
    } else if (member !== undefined && left > 0) {
      frame.current = requestAnimationFrame(() => land(left - 1))
    }
  }
  const toCurrent = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => land(FRAMES))
  }
  useEffect(() => {
    const now = { at, open, preparing }
    const change = changeOf(stood.current, now)
    stood.current = now
    if (change === undefined) {
      return
    }
    const was = inside()
    parked.current = null
    if (change === 'opened') {
      back.current = focus().focused()
      toCurrent()
      return
    }
    if (change === 'moved') {
      if (was) {
        toCurrent()
      }
      return
    }
    cancelAnimationFrame(frame.current)
    const to = back.current
    back.current = null
    if (was && drawn(to)) {
      focus().focus(to, false)
    }
  })
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
}
