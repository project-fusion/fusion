import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress, Stop } from '@fusion.dev/helix-core/capabilities/types'
import {
  type SliderBounds,
  sliderAt,
  sliderBounds,
  sliderFill,
  sliderFraction,
  sliderMoved,
  sliderNearest,
  sliderPoints,
  sliderSaid,
  sliderSettle,
  sliderSpoken,
  sliderValue,
} from '@fusion.dev/helix-core/slider'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import type { AccessibilityActionEvent } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { useFocusVisible } from '../capabilities/focus-visible'
import { useTrack } from '../drivers/track'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import { direction } from '../render/styles'
import type { Family } from '../style/form'
import { boundTo, camel, given, senderOf, tell } from './props'

/** The actions a screen reader moves a range by, as iOS's swipe up and down and TalkBack's volume keys take them. */
const ACTIONS = [
  { label: 'increment', name: 'increment' },
  { label: 'decrement', name: 'decrement' },
] as const

/** A number a prop holds, written or as text, where it holds one. */
const numberIn = (value: unknown): number | undefined => {
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : undefined
}

/** More than two values as the language lists them, as a range's readout says them. */
const listOf = (said: readonly string[], locale: unknown): string =>
  typeof Intl.ListFormat === 'function'
    ? new Intl.ListFormat(typeof locale === 'string' && locale !== '' ? locale : undefined, {
        type: 'conjunction',
      }).format(said)
    : said.join(', ')

/**
 * Where a key takes a value, as the web's range moves it: an arrow by a
 * step, the right arrow and the up arrow up, and on a right-to-left page the
 * left arrow up; Page Up and Page Down by `page`; Home and End to the ends.
 * `undefined` for a key that moves nothing.
 */
export const keyedTo = (
  key: string,
  value: number,
  bounds: SliderBounds,
  page: number,
  rtl: boolean,
): number | undefined => {
  const step = bounds.step > 0 ? bounds.step : 1
  switch (key) {
    case 'ArrowUp':
      return value + step
    case 'ArrowDown':
      return value - step
    case 'ArrowRight':
      return rtl ? value - step : value + step
    case 'ArrowLeft':
      return rtl ? value + step : value - step
    case 'PageUp':
      return value + page
    case 'PageDown':
      return value - page
    case 'Home':
      return bounds.min
    case 'End':
      return bounds.max
    default:
      return undefined
  }
}

type Read = (name: string) => unknown

/** How a value is written and said: by the `formatter` a page gives, or in its format. */
const writersOf = (read: Read) => {
  const writes = read('writes')
  const say = (at: number): string =>
    typeof writes === 'function'
      ? String(writes(at))
      : sliderSaid(at, read('format'), read('locale'))
  const speak = (at: number): string => {
    if (typeof writes !== 'function') {
      return sliderSpoken(at, read('format'), read('locale'), read('template'))
    }
    const template = read('template')
    return typeof template === 'string' && template !== ''
      ? template.replaceAll('{value}', () => say(at))
      : say(at)
  }
  return { say, speak }
}

/** A range's readout: more than two values listed, or the two as `range-text` joins them. */
const readoutOf = (points: readonly number[], say: (at: number) => string, read: Read): string => {
  if (points.length > 2) {
    return listOf(points.map(say), read('locale'))
  }
  return String(read('joins') ?? '{start} to {end}')
    .replaceAll('{start}', () => say(points[0] ?? 0))
    .replaceAll('{end}', () => say(points.at(-1) ?? 0))
}

/** What the word after the label names a thumb by, from its place. */
const thumbWord = (at: number, count: number, read: Read): string => {
  if (at === 0) {
    return String(read('least') ?? '')
  }
  return at === count - 1
    ? String(read('most') ?? '')
    : String(read('between') ?? '').replaceAll('{index}', () => String(at + 1))
}

/** A thumb's name and its reading: it stops at each neighbor, as the web's `aria-valuemin` says. */
const thumbAbout = (
  points: readonly number[],
  at: number,
  range: {
    readonly bounds: SliderBounds
    readonly gap: number
    readonly read: Read
    readonly speak: (at: number) => string
  },
): Readonly<Record<string, unknown>> => {
  const { bounds, gap, read, speak } = range
  const name = read('named')
  const before = points[at - 1]
  const after = points[at + 1]
  const now = points[at] ?? bounds.min
  const words = speak(now)
  return {
    accessibilityLabel: [typeof name === 'string' ? name : '', thumbWord(at, points.length, read)]
      .filter((one) => one !== '')
      .join(' '),
    accessibilityValue: {
      max: after === undefined ? bounds.max : after - gap,
      min: before === undefined ? bounds.min : before + gap,
      now,
      ...(words === '' ? {} : { text: words }),
    },
  }
}

/** What makes a view a control of its own a screen reader adjusts and the keys reach. */
const ownControl = (
  disabled: boolean,
  onAccessibilityAction: (event: AccessibilityActionEvent) => void,
  ref: (node: unknown) => void,
): Readonly<Record<string, unknown>> => ({
  accessibilityActions: ACTIONS,
  accessibilityRole: 'adjustable',
  accessibilityState: { disabled },
  accessible: true,
  focusable: !disabled,
  onAccessibilityAction,
  ref,
})

/**
 * The values a range holds, one per thumb. **A written value takes it there**, as
 * it changes, with nothing sent, and it is held to its bounds as they change.
 */
const useHeldPoints = (
  bounds: SliderBounds,
  several: boolean,
  written: unknown,
  seed: unknown,
): readonly [readonly number[], (next: readonly number[]) => void] => {
  const pointsOf = (text: unknown): readonly number[] =>
    several ? sliderPoints(text, bounds) : [sliderValue(text, bounds)]
  const [held, setHeld] = useState<{ readonly from: unknown; readonly points: readonly number[] }>(
    () => ({ from: written, points: pointsOf(written ?? seed) }),
  )
  const hold = useCallback(
    (next: readonly number[]) => setHeld((was) => ({ ...was, points: next })),
    [],
  )
  if (written !== held.from) {
    const points = pointsOf(written ?? seed)
    setHeld({ from: written, points })
    return [points, hold]
  }
  return [held.points.map((one) => sliderSettle(one, bounds)), hold]
}

/** Each thumb as a repeat draws it, with `lit` saying which draws its halo. */
const thumbEntries = (
  points: readonly number[],
  bounds: SliderBounds,
  say: (at: number) => string,
  lit: (index: number) => boolean,
) =>
  points.map((at, index) => ({
    at: String(index),
    fraction: String(sliderFraction(at, bounds)),
    notEnd: index !== points.length - 1,
    notStart: index !== 0,
    said: say(at),
    unlit: !lit(index),
  }))

/** Where the fill starts and ends: between a range's end thumbs, or from a single thumb's origin. */
const fillOf = (
  points: readonly number[],
  bounds: SliderBounds,
  origin: unknown,
  several: boolean,
): readonly [number, number] => {
  const first = sliderFraction(points[0] ?? bounds.min, bounds)
  return several
    ? [first, sliderFraction(points.at(-1) ?? bounds.min, bounds)]
    : sliderFill(first, origin)
}

/** The marks the element is in: `dragging`, and `ringed` while the keys brought focus. */
const marksOf = (use: MachineUse, dragging: boolean, ringed: boolean): readonly string[] => [
  ...(dragging ? markOf(use, 'dragging') : []),
  ...(ringed ? markOf(use, 'ringed') : []),
]

/** A value by the name the form gives `key`, where it gives one. */
const namedState = (use: MachineUse, key: string, now: string): Record<string, string> => {
  const named = boundTo(use, key, 'state')
  return named === undefined ? {} : { [named]: now }
}

/** How far Page Up and Page Down move a thumb, and how far apart the thumbs stay. */
const spacingOf = (read: Read, bounds: SliderBounds) => ({
  gap: Math.max(0, numberIn(read('apart')) ?? 0) * bounds.step,
  page: numberIn(read('page')) ?? Math.max(bounds.step, (bounds.max - bounds.min) / 10),
})

/** The mark a form binds under `name`, where it binds one. */
const markOf = (use: MachineUse, name: string): readonly string[] => {
  const named = boundTo(use, name, 'state')
  return named === undefined ? [] : [named]
}

/**
 * Hosts the value an element a reader moves along a track holds, as the
 * expansion binds it: the box whose role is `slider`, the props that hold,
 * seed, bound and step the value, and the events a move sends. **No machine
 * of core's holds it**, as the web element hears its own `<input
 * type="range">`; core's slider arithmetic holds the value to its bounds.
 *
 * **A written `value` is a seed and a correction**, as a script writing the
 * web element's property is: the value goes there with nothing sent. Where
 * nothing is written, the seed prop says where it starts, and the middle of
 * the range where it says nothing, as a native range starts.
 *
 * **Each move asks first.** `before` carries the value the move would
 * leave, and a refused move leaves the value as it was. `input` follows a
 * move that stands. `change` is sent once a move is done: as a drag or a
 * press on the track lets go somewhere new, and with each step a key or a
 * screen reader's increment and decrement takes, as the web's range commits
 * a key at once. Disabled or read-only, nothing moves it, and a screen
 * reader still reaches it and hears its value.
 *
 * **A move gives the reader a go at the control**, as on the web.
 *
 * **A range of several thumbs holds a value for each**, written joined by
 * commas. A press takes the nearest thumb, which then follows the finger, each
 * thumb stops at its neighbors, and each is its own control to a screen reader
 * and the keys.
 */
export const useRange = (
  family: Family,
  props: Props,
  use: MachineUse,
  touch: () => void,
): Behavior => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const bounds = sliderBounds(read('min'), read('max'), read('step'))
  const several = read('several') === true
  const valueProp = boundTo(use, 'value', 'prop')
  const written = valueProp === undefined ? undefined : props[camel(valueProp)]
  const [points, hold] = useHeldPoints(bounds, several, written, read('seed'))
  const text = points.join(',')
  const [dragging, drag] = useState(false)
  const disabled = read('disabled') === true
  const readonly = read('readonly') === true
  const moves = !disabled && !readonly
  const vertical = read('orientation') === 'vertical'
  const { gap, page } = spacingOf(read, bounds)
  const events = {
    before: boundTo(use, 'before', 'event'),
    change: boundTo(use, 'change', 'event'),
    input: boundTo(use, 'input', 'event'),
  }
  const latest = useRef({ bounds, events, gap, moves, page, points, props, touch })
  latest.current = { bounds, events, gap, moves, page, points, props, touch }
  /** The values a drag started from, which its release commits against. */
  const started = useRef(text)
  /** The thumb in hand. */
  const inHand = useRef(0)
  const [handAt, setHandAt] = useState(0)

  /**
   * Asks to move the thumb at `at` to `wanted`, held to the bounds and its
   * neighbors, and takes it where it stands, saying whether it moved.
   */
  const ask = useCallback(
    (at: number, wanted: number): boolean => {
      const now = latest.current
      const next = sliderMoved(now.points, at, sliderSettle(wanted, now.bounds), now.gap)
      const nextText = next.join(',')
      const nowText = now.points.join(',')
      if (!now.moves || nextText === nowText) {
        return false
      }
      const { before, input } = now.events
      if (
        before !== undefined &&
        !tell(family, now.props, before, { value: nextText }, senderOf(family, nowText))
      ) {
        return false
      }
      latest.current = { ...now, points: next }
      hold(next)
      if (input !== undefined) {
        tell(family, now.props, input, {}, senderOf(family, nextText))
      }
      return true
    },
    [family, hold],
  )
  /** Sends `change` where the values stand somewhere other than `from`, and touches the verdict. */
  const commit = useCallback(
    (from: string) => {
      const { events: bound, points: settled, props: now, touch: touched } = latest.current
      const settledText = settled.join(',')
      if (settledText === from) {
        return
      }
      touched()
      if (bound.change !== undefined) {
        tell(family, now, bound.change, {}, senderOf(family, settledText))
      }
    },
    [family],
  )
  /** Moves a thumb to `wanted` and commits it at once, as a key or a screen reader's step does. */
  const step = useCallback(
    (at: number, wanted: number) => {
      const from = latest.current.points.join(',')
      if (ask(at, wanted)) {
        commit(from)
      }
    },
    [ask, commit],
  )
  const tracking = useTrack({
    drag: (fraction) => {
      ask(inHand.current, sliderAt(fraction, latest.current.bounds))
    },
    enabled: moves,
    press: (fraction) => {
      const now = latest.current
      const wanted = sliderAt(fraction, now.bounds)
      started.current = now.points.join(',')
      inHand.current = sliderNearest(now.points, wanted)
      setHandAt(inHand.current)
      drag(true)
      ask(inHand.current, wanted)
    },
    release: () => {
      drag(false)
      commit(started.current)
    },
    rtl: direction() === 'rtl',
    vertical,
  })

  /* The keys of a hardware keyboard, heard while a thumb has focus. */
  const heardAt = useCallback(
    (at: number) =>
      (press: KeyPress): boolean => {
        const now = latest.current
        const value = now.points[at] ?? now.bounds.min
        const to = keyedTo(press.key, value, now.bounds, now.page, direction() === 'rtl')
        if (to === undefined) {
          return false
        }
        /* A read-only range keeps the keys that would move it, as on the web. */
        step(at, to)
        return true
      },
    [step],
  )
  const listeningAt = useRef(new Map<number, Stop>())
  const nodes = useRef(new Map<number, unknown>())
  const refAt = useCallback(
    (at: number) => (node: unknown) => {
      listeningAt.current.get(at)?.()
      listeningAt.current.delete(at)
      nodes.current.delete(at)
      if (node !== null) {
        nodes.current.set(at, node)
        listeningAt.current.set(at, keys().listen(node, heardAt(at)))
      }
    },
    [heardAt],
  )
  const ref = useMemo(() => refAt(0), [refAt])
  const focusedAt = (): number =>
    [...nodes.current.entries()].find(([, node]) => focus().focused() === node)?.[0] ?? -1
  const ringed = useFocusVisible(() => nodes.current.get(focusedAt()))
  const ringedAt = ringed ? focusedAt() : -1
  const actionAt = useCallback(
    (at: number) => (event: AccessibilityActionEvent) => {
      const now = latest.current
      const by = now.bounds.step > 0 ? now.bounds.step : 1
      const value = now.points[at] ?? now.bounds.min
      if (event.nativeEvent.actionName === 'increment') {
        step(at, value + by)
      } else if (event.nativeEvent.actionName === 'decrement') {
        step(at, value - by)
      }
    },
    [step],
  )
  const onAccessibilityAction = useMemo(() => actionAt(0), [actionAt])

  const { say, speak } = writersOf(read)
  const value = points[0] ?? bounds.min
  const fraction = sliderFraction(value, bounds)
  const [from, to] = fillOf(points, bounds, several ? undefined : read('origin'), several)
  const said = several ? readoutOf(points, say, read) : say(value)
  const thumbs = thumbEntries(
    points,
    bounds,
    say,
    (index) => (dragging && handAt === index) || ringedAt === index,
  )
  const stops = boundTo(use, 'stops', 'state')
  const spoken = speak(value)
  const view: PartBinding = useMemo(
    () => ({
      states: { active: dragging, focusVisible: ringed },
      view: {
        onLayout: tracking.measure,
        ...(several ? { accessible: false } : ownControl(disabled, onAccessibilityAction, ref)),
      },
      wrap: (drawn: ReactNode) => (
        <GestureDetector gesture={tracking.gesture}>{drawn}</GestureDetector>
      ),
    }),
    [disabled, dragging, onAccessibilityAction, ref, ringed, several, tracking],
  )
  const state = (key: string, now: string) => namedState(use, key, now)
  const marks = marksOf(use, dragging, !several && ringed)
  /* Each thumb is a control of its own to a screen reader and the keys, as each
     of the web's inputs is, so the layer that holds them is no longer hidden. */
  const thumbParts: Record<string, PartBinding> = !several
    ? {}
    : {
        thumb: {
          copy: (item) => ({
            ...thumbAbout(points, item.index, { bounds, gap, read, speak }),
            ...ownControl(disabled, actionAt(item.index), refAt(item.index)),
          }),
        },
        thumbs: {
          view: { accessibilityElementsHidden: false, importantForAccessibility: 'auto' },
        },
      }
  return {
    marks,
    parts: {
      [part]: view,
      ...thumbParts,
      host: {
        ...(stops === undefined ? {} : { lists: { [stops]: thumbs } }),
        states: {
          ...state('fraction', String(fraction)),
          ...state('from', String(from)),
          ...state('reading', several ? text : String(value)),
          ...state('said', said),
          ...state('span', String(to - from)),
          ...state('spoken', spoken),
          ...state('to', String(to)),
        },
      },
    },
  }
}
