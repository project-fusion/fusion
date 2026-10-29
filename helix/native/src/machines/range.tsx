import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress, Stop } from '@fusion.dev/helix-core/capabilities/types'
import {
  type SliderBounds,
  sliderAt,
  sliderBounds,
  sliderFill,
  sliderFraction,
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
  const valueProp = boundTo(use, 'value', 'prop')
  const written = valueProp === undefined ? undefined : props[camel(valueProp)]
  const seed = read('seed')
  const [held, hold] = useState<{ readonly from: unknown; readonly value: number }>(() => ({
    from: written,
    value: sliderValue(written ?? seed, bounds),
  }))
  /* A written value takes the slider there, as it changes, with nothing sent. */
  let value = sliderSettle(held.value, bounds)
  if (written !== held.from) {
    value = sliderValue(written ?? seed, bounds)
    hold({ from: written, value })
  }
  const [dragging, drag] = useState(false)
  const disabled = read('disabled') === true
  const readonly = read('readonly') === true
  const moves = !disabled && !readonly
  const vertical = read('orientation') === 'vertical'
  const page = numberIn(read('page')) ?? Math.max(bounds.step, (bounds.max - bounds.min) / 10)
  const events = {
    before: boundTo(use, 'before', 'event'),
    change: boundTo(use, 'change', 'event'),
    input: boundTo(use, 'input', 'event'),
  }
  const latest = useRef({ bounds, events, moves, page, props, touch, value })
  latest.current = { bounds, events, moves, page, props, touch, value }
  /** The value a drag started from, which its release commits against. */
  const started = useRef(value)

  /** Asks for `wanted`, held to the bounds, and takes it where it stands, saying whether it moved. */
  const ask = useCallback(
    (wanted: number): boolean => {
      const now = latest.current
      const next = sliderSettle(wanted, now.bounds)
      if (!now.moves || next === now.value) {
        return false
      }
      const { before, input } = now.events
      const text = String(next)
      if (
        before !== undefined &&
        !tell(family, now.props, before, { value: text }, senderOf(family, String(now.value)))
      ) {
        return false
      }
      latest.current = { ...now, value: next }
      hold((was) => ({ ...was, value: next }))
      if (input !== undefined) {
        tell(family, now.props, input, {}, senderOf(family, text))
      }
      return true
    },
    [family],
  )
  /** Sends `change` where the value stands somewhere other than `from`, and touches the verdict. */
  const commit = useCallback(
    (from: number) => {
      const { events: bound, props: now, touch: touched, value: settled } = latest.current
      if (settled === from) {
        return
      }
      touched()
      if (bound.change !== undefined) {
        tell(family, now, bound.change, {}, senderOf(family, String(settled)))
      }
    },
    [family],
  )
  /** Moves the value to `wanted` and commits it at once, as a key or a screen reader's step does. */
  const step = useCallback(
    (wanted: number) => {
      const from = latest.current.value
      if (ask(wanted)) {
        commit(from)
      }
    },
    [ask, commit],
  )
  const tracking = useTrack({
    drag: (fraction) => {
      ask(sliderAt(fraction, latest.current.bounds))
    },
    enabled: moves,
    press: (fraction) => {
      started.current = latest.current.value
      drag(true)
      ask(sliderAt(fraction, latest.current.bounds))
    },
    release: () => {
      drag(false)
      commit(started.current)
    },
    rtl: direction() === 'rtl',
    vertical,
  })

  /* The keys of a hardware keyboard, heard while the control has focus. */
  const listening = useRef<Stop | undefined>(undefined)
  const shown = useRef<unknown>(null)
  const heard = useCallback(
    (press: KeyPress): boolean => {
      const now = latest.current
      const to = keyedTo(press.key, now.value, now.bounds, now.page, direction() === 'rtl')
      if (to === undefined) {
        return false
      }
      /* A read-only range keeps the keys that would move it, as on the web. */
      step(to)
      return true
    },
    [step],
  )
  const ref = useCallback(
    (node: unknown) => {
      listening.current?.()
      listening.current = undefined
      shown.current = node
      if (node !== null) {
        listening.current = keys().listen(node, heard)
      }
    },
    [heard],
  )
  const ringed = useFocusVisible(() => shown.current)
  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const now = latest.current
      const by = now.bounds.step > 0 ? now.bounds.step : 1
      if (event.nativeEvent.actionName === 'increment') {
        step(now.value + by)
      } else if (event.nativeEvent.actionName === 'decrement') {
        step(now.value - by)
      }
    },
    [step],
  )

  const fraction = sliderFraction(value, bounds)
  const [from, to] = sliderFill(fraction, read('origin'))
  const said = sliderSaid(value, read('format'), read('locale'))
  const spoken = sliderSpoken(value, read('format'), read('locale'), read('template'))
  const view: PartBinding = useMemo(
    () => ({
      states: { active: dragging, focusVisible: ringed },
      view: {
        accessibilityActions: ACTIONS,
        accessibilityState: { disabled },
        accessible: true,
        focusable: !disabled,
        onAccessibilityAction,
        onLayout: tracking.measure,
        ref,
      },
      wrap: (drawn: ReactNode) => (
        <GestureDetector gesture={tracking.gesture}>{drawn}</GestureDetector>
      ),
    }),
    [disabled, dragging, onAccessibilityAction, ref, ringed, tracking],
  )
  const state = (name: string, now: string): Record<string, string> => {
    const named = boundTo(use, name, 'state')
    return named === undefined ? {} : { [named]: now }
  }
  const marks = [
    ...(dragging && boundTo(use, 'dragging', 'state') !== undefined
      ? [boundTo(use, 'dragging', 'state') as string]
      : []),
    ...(ringed && boundTo(use, 'ringed', 'state') !== undefined
      ? [boundTo(use, 'ringed', 'state') as string]
      : []),
  ]
  return {
    marks,
    parts: {
      [part]: view,
      host: {
        states: {
          ...state('fraction', String(fraction)),
          ...state('from', String(from)),
          ...state('reading', String(value)),
          ...state('said', said),
          ...state('span', String(to - from)),
          ...state('spoken', spoken),
          ...state('to', String(to)),
        },
      },
    },
  }
}
