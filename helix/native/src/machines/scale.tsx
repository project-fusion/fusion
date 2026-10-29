import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import type { KeyPress, Stop } from '@fusion.dev/helix-core/capabilities/types'
import {
  type RatingScale,
  ratingAnswered,
  ratingAt,
  ratingFill,
  ratingKeyed,
  ratingScale,
  ratingScore,
  ratingStop,
} from '@fusion.dev/helix-core/rating'
import { formatMessage } from '@fusion.dev/helix-core/words'
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

/** The actions a screen reader picks the score after or before by, as iOS's swipe up and down take them. */
const ACTIONS = [
  { label: 'increment', name: 'increment' },
  { label: 'decrement', name: 'decrement' },
] as const

/** The keys that take a score back to none, where the element is clearable. */
const CLEARS: ReadonlySet<string> = new Set(['Backspace', 'Delete'])

/** The keys that press the score focus stands on, as a radio is pressed. */
const PRESSES: ReadonlySet<string> = new Set([' ', 'Enter'])

/** Where a refused key left focus, and the score it moved against. */
interface Roved {
  readonly against: string
  readonly at: number
}

/**
 * The step focus stands on: the one a key moved it to while the score is
 * still the one it moved against, as a refused key leaves the web's radio
 * focused, or the score's own.
 */
const focusedOn = (
  roved: Roved | undefined,
  value: string,
  scale: RatingScale,
): number | undefined =>
  roved !== undefined && roved.against === value ? roved.at : ratingStop(value, scale)

/**
 * The step a screen reader's action picks: the step after the score's, or
 * before it, and the first step up where no score is given.
 */
const actedTo = (action: string, value: string, scale: RatingScale): number | undefined => {
  const answered = ratingAnswered(value)
  if (action === 'increment') {
    return answered
      ? ratingKeyed('ArrowRight', ratingStop(value, scale), scale, false)
      : scale.steps[0]
  }
  return action === 'decrement' && answered
    ? ratingKeyed('ArrowLeft', ratingStop(value, scale), scale, false)
    : undefined
}

/** What a scale gives the element: its behavior, and the score it holds, empty while none is given. */
export interface Scaled {
  readonly behavior: Behavior
  readonly value: string
}

/**
 * Hosts a score a reader picks from a row of steps, as the expansion binds
 * it: the box whose role is `radiogroup`, the props that hold, seed, and
 * bound the score, and the events a choice sends. **No machine of core's
 * holds it**, as the web element holds its own radios; core's rating
 * arithmetic says where each step stands, the same rules the web's options
 * are laid out by.
 *
 * **The score is empty until a reader gives one**, and the row draws the
 * floor, `min`, while it is. A written `value` is a seed and a correction,
 * as a script writing the web element's property is, with nothing sent.
 *
 * **A press or a drag picks the step under the finger as it lets go.**
 * While it is down, the row shows the step under it, sent as `preview`
 * each time that step changes and as `''` once the row shows its own score
 * again. The arrow keys of a hardware keyboard pick the step after or
 * before, Home and End the first and the last, Space and Enter the step
 * focus stands on, and a screen reader's increment and decrement the step
 * after or before. Each choice asks first with `before`, and `input` and
 * `change` follow one that stands, as the web's radio group sends both.
 *
 * **Where `clearable` holds**, a press on the score chosen, or Backspace or
 * Delete, takes it back to none: `before` with `''`, `input`, `change`, and
 * `clear`. Disabled or read-only, nothing picks a score, and a read-only
 * row is a picture of its score to a screen reader.
 */
export const useScale = (
  family: Family,
  props: Props,
  use: MachineUse,
  touch: () => void,
): Scaled => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const scale = ratingScale(read('min'), read('max'), read('step'))
  const valueProp = boundTo(use, 'value', 'prop')
  const written = valueProp === undefined ? undefined : props[camel(valueProp)]
  const seed = read('seed')
  const textOf = (from: unknown): string => (typeof from === 'string' ? from : '')
  const [held, hold] = useState<{ readonly from: unknown; readonly value: string }>(() => ({
    from: written,
    value: textOf(written ?? seed),
  }))
  /* A written value takes the row there, as it changes, with nothing sent. */
  let value = held.value
  if (written !== held.from) {
    value = textOf(written ?? seed)
    hold({ from: written, value })
  }
  const [previewing, preview] = useState<number | undefined>(undefined)
  const disabled = read('disabled') === true
  const readonly = read('readonly') === true
  const clearable = read('clearable') === true
  const moves = !disabled && !readonly
  const events = {
    before: boundTo(use, 'before', 'event'),
    change: boundTo(use, 'change', 'event'),
    clear: boundTo(use, 'clear', 'event'),
    input: boundTo(use, 'input', 'event'),
    preview: boundTo(use, 'preview', 'event'),
  }
  const latest = useRef({ clearable, events, moves, props, scale, touch, value })
  latest.current = { clearable, events, moves, props, scale, touch, value }
  /**
   * The step focus stands on, and the score it was moved against: a key
   * the page refused leaves focus on the step it moved to, as the web's
   * radio does, until the score changes.
   */
  const roved = useRef<Roved | undefined>(undefined)
  /** The step a press began on, so letting go there on the score chosen can clear it. */
  const pressedOn = useRef<number | undefined>(undefined)
  /** The step a drag shows, read as it lets go. */
  const showing = useRef<number | undefined>(undefined)

  /** Asks for `next`, takes it where it stands, and says whether it stands. */
  const request = useCallback(
    (next: string): boolean => {
      const now = latest.current
      if (!now.moves) {
        return false
      }
      if (next === now.value) {
        return true
      }
      const { before, change, input } = now.events
      if (
        before !== undefined &&
        !tell(family, now.props, before, { value: next }, senderOf(family, now.value))
      ) {
        return false
      }
      latest.current = { ...now, value: next }
      hold((was) => ({ ...was, value: next }))
      now.touch()
      for (const event of [input, change]) {
        if (event !== undefined) {
          tell(family, now.props, event, {}, senderOf(family, next))
        }
      }
      return true
    },
    [family],
  )
  /** Takes the score back to none, through the same request, and says so. */
  const clear = useCallback(() => {
    const { events: bound, props: now, value: was } = latest.current
    if (was !== '' && request('') && bound.clear !== undefined) {
      tell(family, now, bound.clear, {}, senderOf(family, ''))
    }
  }, [family, request])
  /** A press on `score`: clears it where it is the score chosen and the row is clearable, or picks it. */
  const press = useCallback(
    (score: number | undefined) => {
      const now = latest.current
      if (score === undefined) {
        return
      }
      if (now.clearable && now.value !== '' && score === Number(now.value)) {
        clear()
        return
      }
      request(String(score))
    },
    [clear, request],
  )

  /** The preview last sent, so each is sent once as the step shown changes. */
  const sent = useRef('')
  /** Shows `at` in place of the score, or the score again, and sends the preview where it changed. */
  const show = useCallback(
    (at: number | undefined) => {
      showing.current = at
      preview(at)
      const text = at === undefined ? '' : String(at)
      const { events: bound, props: now, value: holding } = latest.current
      if (text === sent.current) {
        return
      }
      sent.current = text
      if (bound.preview !== undefined) {
        tell(family, now, bound.preview, { value: text }, senderOf(family, holding))
      }
    },
    [family],
  )
  const tracking = useTrack({
    drag: (fraction) => {
      show(ratingAt(fraction, latest.current.scale))
    },
    enabled: moves,
    press: (fraction) => {
      pressedOn.current = ratingAt(fraction, latest.current.scale)
      show(pressedOn.current)
    },
    release: () => {
      const at = showing.current
      /* A drag that ends on another step picks it, and one that ends where
         it began presses it, which clears the score chosen. The row shows
         its own score again after, as the web's preview follows the choice. */
      if (at !== pressedOn.current) {
        request(at === undefined ? latest.current.value : String(at))
      } else {
        press(at)
      }
      show(undefined)
    },
    rtl: direction() === 'rtl',
    vertical: false,
  })

  /* The keys of a hardware keyboard, heard while the row has focus. */
  const listening = useRef<Stop | undefined>(undefined)
  const shown = useRef<unknown>(null)
  const heard = useCallback(
    (key: KeyPress): boolean => {
      const now = latest.current
      const focused = focusedOn(roved.current, now.value, now.scale)
      if (!now.moves || (CLEARS.has(key.key) && !now.clearable)) {
        return false
      }
      if (CLEARS.has(key.key)) {
        clear()
        return true
      }
      if (PRESSES.has(key.key)) {
        press(focused)
        return true
      }
      /* From the score chosen, or from where focus stands while none is. */
      const from = ratingAnswered(now.value) ? ratingStop(now.value, now.scale) : focused
      const to = ratingKeyed(key.key, from, now.scale, direction() === 'rtl')
      if (to === undefined) {
        return false
      }
      roved.current = { against: now.value, at: to }
      request(String(to))
      return true
    },
    [clear, press, request],
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
      const to = actedTo(event.nativeEvent.actionName, now.value, now.scale)
      if (now.moves && to !== undefined) {
        request(String(to))
      }
    },
    [request],
  )

  const score = ratingScore(value, scale)
  const drawn = previewing ?? score
  const { full, part: share } = ratingFill(drawn)
  const template = read('template')
  const named = formatMessage(
    typeof read('option') === 'string' ? (read('option') as string) : '',
    { max: scale.max, score },
    locale().read(),
  )
  const spoken = typeof template === 'string' && template !== '' ? template : named
  const view: PartBinding = useMemo(
    () => ({
      states: { focusVisible: ringed },
      view: {
        accessibilityActions: ACTIONS,
        /* A read-only row shows a score and takes none, so it is a picture of it. */
        accessibilityRole: readonly ? 'image' : 'adjustable',
        accessibilityState: { disabled },
        accessibilityValue: { text: spoken },
        accessible: true,
        focusable: moves,
        onAccessibilityAction,
        onLayout: tracking.measure,
        ref,
      },
      wrap: (content: ReactNode) => (
        <GestureDetector gesture={tracking.gesture}>{content}</GestureDetector>
      ),
    }),
    [disabled, moves, onAccessibilityAction, readonly, ref, ringed, spoken, tracking],
  )
  const state = (name: string, now: string): Record<string, string> => {
    const bound = boundTo(use, name, 'state')
    return bound === undefined ? {} : { [bound]: now }
  }
  return {
    behavior: {
      marks: [],
      parts: {
        [part]: view,
        host: {
          states: {
            ...state('full', String(full)),
            ...state('share', String(share)),
            ...state('reading', value),
            ...state('said', String(drawn)),
            ...state('spoken', spoken),
          },
        },
      },
    },
    value,
  }
}
