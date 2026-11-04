/**
 * The reading of a chart on a phone: which reading a finger or a key rests on,
 * as the web's `ChartPointerController` holds it, and the one control a screen
 * reader adjusts.
 *
 * **A press-and-drag scrubs the plot.** A finger down on the plot shows the
 * reading under it, a drag moves it from reading to reading with a haptic tick
 * at each, and the reading stays shown once the finger lifts, as a tap shows
 * it on the web. A tap with no drag also presses the reading, as the web's
 * click does after a touch's pointer up.
 *
 * **The plot is one adjustable element.** A screen reader's increment and
 * decrement move the reading on and back, and the element's value is the
 * reading in words. The keys of a hardware keyboard walk the readings as on
 * the web, through core's `stepReading`: the arrows, Home and End, Page Up and
 * Page Down, Enter and Space to press, and Escape to put the reading away.
 * Focus brought by a key shows the first reading, and focus leaving puts a
 * reading the keys chose away.
 *
 * **Each move of the reading is told once**, as `change`, with the reading's
 * place and what moved it, and a press as `press`.
 */

import { haptics } from '@fusion.dev/helix-core/capabilities/haptics'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress, Stop } from '@fusion.dev/helix-core/capabilities/types'
import { readingAt, stepReading } from '@fusion.dev/helix-core/chart'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AccessibilityActionEvent } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { useFocusVisible } from '../capabilities/focus-visible'
import { type TrackPoint, useTrack } from '../drivers/track'
import type { PartBinding } from '../render/behavior'
import { direction } from '../render/styles'

/** What moved the reading, as the web's reading detail names it. */
export type MovedBy = 'keyboard' | 'touch'

/** What a reading's move or press is told: its place, `-1` for none, and what moved it. */
export interface CursorHeard {
  readonly at: number
  readonly by: MovedBy
}

/** What a chart's cursor reads of its chart at one draw. */
export interface CursorSetup {
  /** How many readings there are. */
  readonly count: number
  /** Whether a screen reader and the keys read the plot: a named chart with readings. */
  readonly enabled: boolean
  /** Whether a finger reads the plot: a chart with readings, named or not, as a pointer reads one on the web. */
  readonly touches: boolean
  /** The reading in words, which a screen reader hears as the plot's value. */
  readonly said: (at: number) => string
  /** Told each move of the reading, and each press of it. */
  readonly tell: (heard: 'change' | 'press', reading: CursorHeard) => void
  /**
   * The reading under a point of the plot, as shares of its box, or `-1` for
   * none, for a plot whose readings are not laid out along it, as a ring's
   * slices are found by a touch's angle. Absent, the reading is the slot
   * along the plot the finger is in.
   */
  readonly pick?: (point: TrackPoint) => number
  /** Whether the reading at a place is drawn: the keys pass over one that is not, as a slice a legend hid. */
  readonly shows?: (at: number) => boolean
  /** The axis the keys walk, `none` for a ring, whose arrows all move on or back. Absent is `inline`. */
  readonly axis?: 'inline' | 'none'
}

/** What a chart's cursor gives its chart. */
export interface Cursor {
  /** The reading shown, or `-1` for none. */
  readonly at: number
  /** Whether a key, or a screen reader's step, moved it last, which is when its words are said. */
  readonly keyed: boolean
  /** What the plot's view takes: the scrub, the adjustable control, and the keys. */
  readonly plot: PartBinding
}

/** The actions a screen reader moves the reading by, as iOS's swipe up and down and TalkBack's volume keys take them. */
const ACTIONS = [
  { label: 'increment', name: 'increment' },
  { label: 'decrement', name: 'decrement' },
] as const

/** How far Page Up and Page Down move: a tenth of the readings, at least one. */
const pageOf = (count: number): number => Math.max(1, Math.round(count / 10))

/** The places of the readings drawn, which the keys walk. */
const shownOf = (setup: CursorSetup): number[] =>
  Array.from({ length: setup.count }, (_, at) => at).filter((at) => setup.shows?.(at) !== false)

/**
 * The reading a key moves to from `at`, or `undefined` for a key that moves
 * nothing: stepped by place among the readings drawn, so a hidden one is never
 * landed on, as the web's chart steps.
 */
const keyedTo = (key: string, at: number, setup: CursorSetup): number | undefined => {
  const shown = shownOf(setup)
  const count = shown.length
  const next = stepReading(
    key,
    { at: shown.indexOf(at), series: -1 },
    {
      axis: setup.axis ?? 'inline',
      count,
      grid: 1,
      page: pageOf(count),
      rtl: direction() === 'rtl',
      series: 1,
    },
  )
  return next === undefined ? undefined : (shown[next.at] ?? -1)
}

/** Holds the reading a finger, a key, or a screen reader rests on. */
export const useChartCursor = (setup: CursorSetup): Cursor => {
  const [shown, setShown] = useState<{ readonly at: number; readonly keyed: boolean }>({
    at: -1,
    keyed: false,
  })
  const latest = useRef({ setup, shown })
  latest.current = { setup, shown }
  /** Whether the finger down now has dragged, which keeps a lift from pressing the reading. */
  const dragged = useRef(false)
  /**
   * The move a finger down made, told once the finger lifts or drags: **a tap
   * tells its press before its move**, as the web's chart tells a move once it
   * has drawn it and a click's press at once.
   */
  const pending = useRef<CursorHeard | undefined>(undefined)
  const flush = useCallback(() => {
    const held = pending.current
    pending.current = undefined
    if (held !== undefined) {
      latest.current.setup.tell('change', held)
    }
  }, [])

  /** Shows the reading at `at`, telling it once, with a tick under a finger, or holding it for `flush`. */
  const move = useCallback((at: number, by: MovedBy, hold = false) => {
    const now = latest.current
    const keyed = by === 'keyboard'
    if (at === now.shown.at && keyed === now.shown.keyed) {
      return
    }
    latest.current = { ...now, shown: { at, keyed } }
    setShown({ at, keyed })
    if (by === 'touch' && at >= 0 && at !== now.shown.at) {
      haptics().play('pass')
    }
    if (hold) {
      pending.current = { at, by }
    } else {
      now.setup.tell('change', { at, by })
    }
  }, [])
  const press = useCallback((by: MovedBy) => {
    const now = latest.current
    if (now.shown.at >= 0) {
      now.setup.tell('press', { at: now.shown.at, by })
    }
  }, [])
  /* A point off every reading, a ring's hole, moves nothing. */
  const under = (fraction: number, point: TrackPoint): number => {
    const { pick, count } = latest.current.setup
    return pick === undefined ? readingAt(fraction, count) : pick(point)
  }
  const tracking = useTrack({
    drag: (fraction, point) => {
      dragged.current = true
      flush()
      const at = under(fraction, point)
      if (at >= 0) {
        move(at, 'touch')
      }
    },
    enabled: setup.touches,
    press: (fraction, point) => {
      dragged.current = false
      const at = under(fraction, point)
      if (at >= 0) {
        move(at, 'touch', true)
      }
    },
    release: () => {
      if (!dragged.current) {
        press('touch')
      }
      flush()
    },
    rtl: direction() === 'rtl',
    vertical: false,
  })

  /* The keys of a hardware keyboard, heard while the plot has focus. */
  const heard = useCallback(
    (key: KeyPress): boolean => {
      const { setup: now, shown: was } = latest.current
      if (now.count === 0) {
        return false
      }
      if (key.key === 'Escape') {
        if (was.at < 0) {
          return false
        }
        move(-1, 'keyboard')
        return true
      }
      if (key.key === 'Enter' || key.key === ' ') {
        press('keyboard')
        return was.at >= 0
      }
      const to = keyedTo(key.key, was.at, now)
      if (to === undefined) {
        return false
      }
      move(to, 'keyboard')
      return true
    },
    [move, press],
  )
  const node = useRef<unknown>(null)
  const listening = useRef<Stop | undefined>(undefined)
  const ref = useCallback(
    (found: unknown) => {
      listening.current?.()
      listening.current = undefined
      node.current = found
      if (found !== null) {
        listening.current = keys().listen(found, heard)
      }
    },
    [heard],
  )
  const ringed = useFocusVisible(() => node.current)
  /* Focus a key brought shows the first reading, and focus leaving puts away a reading the keys chose. */
  useEffect(() => {
    const { setup: now, shown: was } = latest.current
    const first = shownOf(now)[0]
    if (ringed && was.at < 0 && first !== undefined) {
      move(first, 'keyboard')
    } else if (!ringed && was.keyed && was.at >= 0) {
      move(-1, 'keyboard')
    }
  }, [move, ringed])

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const { setup: now, shown: was } = latest.current
      const name = event.nativeEvent.actionName
      if (name !== 'increment' && name !== 'decrement') {
        return
      }
      /* Down and Up move on and back along one series whatever the page's direction. */
      const to = keyedTo(name === 'increment' ? 'ArrowDown' : 'ArrowUp', was.at, now)
      if (to !== undefined) {
        move(to, 'keyboard')
      }
    },
    [move],
  )

  const words = shown.at >= 0 ? setup.said(shown.at) : ''
  const plot: PartBinding = useMemo(
    () => ({
      states: { focusVisible: ringed },
      view: setup.enabled
        ? {
            accessibilityActions: ACTIONS,
            accessibilityRole: 'adjustable',
            accessibilityValue: words === '' ? undefined : { text: words },
            accessible: true,
            focusable: true,
            onAccessibilityAction,
            onLayout: tracking.measure,
            ref,
          }
        : { onLayout: tracking.measure },
      wrap: (drawn: ReactNode) => (
        <GestureDetector gesture={tracking.gesture}>{drawn}</GestureDetector>
      ),
    }),
    [onAccessibilityAction, ref, ringed, setup.enabled, tracking, words],
  )
  return { at: shown.at, keyed: shown.keyed, plot }
}
