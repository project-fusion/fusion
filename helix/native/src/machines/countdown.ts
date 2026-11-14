/**
 * The countdown and the queue an element that declares them runs, as an
 * announcement spends its `duration` and waits its turn behind the queued
 * announcements before it.
 *
 * **The countdown is core's**, through `useCountdown`, so the web's
 * `CountdownController` and a phone run one clock and a fake clock moves
 * both. The queue reads the element's siblings, which a phone keeps in a
 * registry since it has no parent to read.
 */
import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import { useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { useSiblings } from '../render/siblings'
import type { Family, Node } from '../style/form'
import { useCountdown } from './clocks'
import { waitOf } from './delay'
import { NoticesContext, useStackHeld } from './notices'
import { boundTo, given, senderOf, tell } from './props'
import type { Turned } from './toggle'

/** Whether a screen reader runs now, kept current as it turns on and off. */
const useScreenReader = (): boolean =>
  useSyncExternalStore(
    (changed) => environment().observe(changed),
    () => environment().read().screenReader === true,
  )

/** The press in `tree` that sends `event`, as an announcement's dismiss button sends `dismiss`. */
const sender = (tree: readonly Node[] | undefined, event: string): string | undefined => {
  for (const node of tree ?? []) {
    if (node.kind === 'pressable' && node.attributes?.sends === event) {
      return node.name
    }
    const inner = sender(node.children, event)
    if (inner !== undefined) {
      return inner
    }
  }
  return undefined
}

/**
 * Hosts the countdown, bound as the expansion binds it: the prop that holds
 * the time, the event sent once it is spent, the state that holds while it
 * is stopped partway, and the state that keeps it from starting.
 *
 * **The time is read once, as the clock starts**: as the element is drawn,
 * or as it stops waiting, as the web reads its `duration` once.
 *
 * **Each reason a reader is on the element holds the clock**, counted, and
 * it runs on from what was left once none is left: a touch on the element,
 * keyboard focus on the press that sends its event, the app away from the
 * front, **a touch on any message of the stack it is drawn in**, as a toast
 * item's is, and **a screen reader running**. React Native says whether a screen
 * reader runs and never where its focus is, so a phone holds the clock for
 * as long as one runs, where the web holds it only while focus is inside.
 */
export const useCountdowned = (
  family: Family,
  props: Props,
  use: MachineUse,
  earlier: readonly Behavior[],
  toggled?: Turned,
): Behavior => {
  const done = boundTo(use, 'done', 'event') ?? ''
  const after = waitOf(given(family, props, boundTo(use, 'after', 'prop')))
  const pausedState = boundTo(use, 'paused', 'state') ?? 'paused'
  const waitsState = boundTo(use, 'waits', 'state')
  const waiting =
    waitsState !== undefined &&
    earlier.some((bound) => bound.parts.host?.states?.[waitsState] === true)
  const latest = useRef(props)
  latest.current = props
  const closes = family.api?.toggle?.closes
  const turning = useRef(toggled)
  turning.current = toggled
  const [paused, setPaused] = useState(false)
  const clock = useCountdown({
    /* A spent time closes an element whose toggle closes with the same
       event, as a toast item's does, and is told on its own otherwise. */
    done: () => {
      if (closes === done && turning.current !== undefined) {
        /* A message already closed some other way stays closed. */
        if (turning.current.checked) {
          turning.current.turn()
        }
      } else {
        tell(family, latest.current, done, {}, senderOf(family, latest.current.value))
      }
    },
    holdWhileHidden: true,
    paused: setPaused,
  })
  const time = useRef(after)
  time.current = after
  const started = useRef(false)
  useEffect(() => {
    if (!waiting && !started.current) {
      started.current = true
      clock.start(time.current > 0 ? time.current : undefined)
    }
  }, [clock, waiting])
  const stacked = useStackHeld(useContext(NoticesContext))
  useEffect(() => {
    if (!stacked) {
      return undefined
    }
    clock.hold()
    return () => clock.release()
  }, [clock, stacked])
  const reader = useScreenReader()
  useEffect(() => {
    if (!reader) {
      return undefined
    }
    clock.hold()
    return () => clock.release()
  }, [clock, reader])
  const touching = useRef(false)
  const hold = () => {
    if (!touching.current) {
      touching.current = true
      clock.hold()
    }
  }
  const release = () => {
    if (touching.current) {
      touching.current = false
      clock.release()
    }
  }
  const press = sender(family.tree, done)
  return {
    marks: [],
    parts: {
      host: {
        states: { [pausedState]: paused },
        view: { onTouchCancel: release, onTouchEnd: release, onTouchStart: hold },
      },
      ...(press === undefined
        ? {}
        : { [press]: { view: { onBlur: () => clock.release(), onFocus: () => clock.hold() } } }),
    },
  }
}

/**
 * Hosts the queue, bound to the prop that queues the element and the state
 * that holds while it waits: **a queued element waits while a queued
 * element of its kind before it is still drawn**, and its turn comes as the
 * last of them leaves, as the web's queued announcement reads its parent.
 */
export const useQueued = (family: Family, props: Props, use: MachineUse): Behavior => {
  const queued = given(family, props, boundTo(use, 'queued', 'prop')) === true
  const state = boundTo(use, 'waiting', 'state') ?? 'waiting'
  const now = useRef(queued)
  now.current = queued
  const siblings = useSiblings(family.tag, {
    present: () => true,
    queued: () => now.current,
  })
  const waiting = queued && siblings.before().some((one) => one.queued?.() === true)
  const was = useRef(queued)
  useEffect(() => {
    if (was.current !== queued) {
      was.current = queued
      siblings.changed()
    }
  })
  return { marks: [], parts: { host: { states: { [state]: waiting } } } }
}
