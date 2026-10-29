import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress, Stop } from '@fusion.dev/helix-core/capabilities/types'
import {
  type NumberField,
  type NumberFlaw,
  numberFieldEnds,
  numberFieldFlaw,
  numberFieldKeyed,
  numberFieldKeypad,
  numberFieldNudge,
  numberFieldOf,
  numberFieldParse,
  numberFieldSettle,
  numberFieldShown,
  numberFieldSpoken,
  type Phone,
} from '@fusion.dev/helix-core/number-field'
import { useCallback, useMemo, useRef } from 'react'
import { type AccessibilityActionEvent, Platform } from 'react-native'
import { useHold } from '../drivers/hold'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import type { Entered, Shaping } from './entry'
import { boundTo, given } from './props'

/** The actions a screen reader steps a number by, as TalkBack's volume keys take them. */
const ACTIONS = [
  { label: 'increment', name: 'increment' },
  { label: 'decrement', name: 'decrement' },
] as const

/** The phone the app runs on, for the keypads it has. */
const PHONE: Phone = Platform.OS === 'ios' ? 'iphone' : Platform.OS === 'android' ? 'android' : ''

/** A number field from the props a spin binds: its bounds, its step, its format, and its locale. */
export const spunField = (family: Family, props: Props, use: MachineUse): NumberField => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  return numberFieldOf({
    formatOptions: read('format'),
    largeStep: read('large'),
    locale: read('locale'),
    max: read('max'),
    min: read('min'),
    step: read('step'),
  })
}

/**
 * How a number a reader types and steps shapes its text, for its entry: in
 * its format while the field has no focus, and held to its range and its
 * step as the reader leaves the field.
 */
export const spinShaping = (family: Family, props: Props, use: MachineUse): Shaping => {
  const field = spunField(family, props, use)
  return {
    settle: (text) => numberFieldSettle(text, field),
    shown: (text, focused) => numberFieldShown(text, focused, field),
  }
}

/** What a spin gives the verdict on its element: what is wrong with its number. */
export interface Spun {
  /** What core's `numberFieldFlaw` finds wrong with the text, or `undefined`. */
  readonly flaw: NumberFlaw | undefined
  /** The locale its sentences write their numbers in. */
  readonly locale: string
}

/**
 * Hosts a number a reader types and steps, as the expansion binds it: the
 * field its entry types into, whose role is `spinbutton`, the presses that
 * step it down and up, and the props that bound, step, and write it. **The
 * text is the entry's**, and this steps it: the keys of a hardware keyboard,
 * a screen reader's increment and decrement, and the steppers, again while
 * one is held. Core's number-field arithmetic says where each step lands, as
 * it does for the web's element.
 *
 * **Each step asks first**, as an edit does, and a step that stands sends
 * `input` and `change`. Disabled or read-only, nothing steps it, and the
 * steppers are disabled at an end as on the web, so the field keeps its
 * width.
 *
 * **A held stepper repeats** on the timers capability: once at the press,
 * again after 400 milliseconds, and every 60 after that, until the finger
 * lifts or the number reaches an end. A screen reader's activation steps
 * once.
 *
 * **On iOS the field is a plain text field**, as the web's is there, since
 * VoiceOver reads a spin button as a slider a reader cannot type in; the
 * steppers step it. Android hears it as a spin button with its range.
 */
export const useSpin = (
  family: Family,
  props: Props,
  use: MachineUse,
  entered: Entered | undefined,
): { readonly behavior: Behavior; readonly spun: Spun } => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const down = boundTo(use, 'down', 'part')
  const up = boundTo(use, 'up', 'part')
  const field = spunField(family, props, use)
  const text = entered?.value ?? ''
  const disabled = given(family, props, boundTo(use, 'disabled', 'prop')) === true
  const readonly = given(family, props, boundTo(use, 'readonly', 'prop')) === true
  const moves = !disabled && !readonly
  const latest = useRef({ entered, field, moves })
  latest.current = { entered, field, moves }

  /** Steps the text to where `to` says from the text as it stands, and says whether it moved. */
  const stepBy = useCallback((to: (text: string, field: NumberField) => string | undefined) => {
    const now = latest.current
    const from = now.entered?.current() ?? ''
    const next = to(from, now.field)
    return now.moves && next !== undefined && (now.entered?.step(next) ?? false)
  }, [])
  const nudge = useCallback(
    (by: number) => stepBy((from, at) => numberFieldNudge(from, by, at)),
    [stepBy],
  )

  /* The keys of a hardware keyboard, heard while the field has focus. A
     read-only field keeps the arrows that would step it, and leaves Home
     and End to the caret. */
  const listening = useRef<Stop | undefined>(undefined)
  const heard = useCallback(
    (press: KeyPress): boolean => {
      const now = latest.current
      const next = numberFieldKeyed(press.key, now.entered?.current() ?? '', now.field)
      if (next === undefined || ((press.key === 'Home' || press.key === 'End') && !now.moves)) {
        return false
      }
      stepBy(() => next)
      return true
    },
    [stepBy],
  )
  const ref = useCallback(
    (node: unknown) => {
      listening.current?.()
      listening.current = undefined
      if (node !== null) {
        listening.current = keys().listen(node, heard)
      }
    },
    [heard],
  )
  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') {
        nudge(1)
      } else if (event.nativeEvent.actionName === 'decrement') {
        nudge(-1)
      }
    },
    [nudge],
  )

  /* A held stepper steps at once and repeats; the press a touch ends with
     steps nothing more, and a press with no touch before it, a screen
     reader's, steps once. */
  const way = useRef(1)
  const pressStepped = useRef(false)
  const hold = useHold(() => nudge(way.current))
  const stepper = useCallback(
    (by: number) => ({
      onPress: () => {
        if (pressStepped.current) {
          pressStepped.current = false
          return
        }
        nudge(by)
      },
      onPressIn: () => {
        way.current = by
        pressStepped.current = true
        hold.start()
      },
      onPressOut: () => hold.stop(),
    }),
    [hold, nudge],
  )

  const { atMax, atMin } = numberFieldEnds(text, field)
  const parsed = numberFieldParse(text, field)
  const template = given(family, props, boundTo(use, 'template', 'prop'))
  const spoken = numberFieldSpoken(text, field, typeof template === 'string' ? template : '')
  const keypad = numberFieldKeypad(PHONE, field)
  const control: PartBinding = useMemo(
    () => ({
      view: {
        ...(Platform.OS === 'ios'
          ? {}
          : { accessibilityActions: moves ? ACTIONS : [], onAccessibilityAction }),
        inputMode: keypad,
        ref,
      },
    }),
    [keypad, moves, onAccessibilityAction, ref],
  )
  const presses = (name: string | undefined, by: number, off: boolean) => {
    if (name === undefined) {
      return {}
    }
    const binding: PartBinding = {
      states: { disabled: off },
      view: {
        accessibilityState: { disabled: off },
        disabled: off,
        ...(off ? {} : stepper(by)),
      },
    }
    return { [name]: binding }
  }
  const state = (name: string, now: string): Record<string, string> => {
    const named = boundTo(use, name, 'state')
    return named === undefined ? {} : { [named]: now }
  }
  const marks = [
    ...(atMin && boundTo(use, 'floor', 'state') !== undefined
      ? [boundTo(use, 'floor', 'state') as string]
      : []),
    ...(atMax && boundTo(use, 'ceiling', 'state') !== undefined
      ? [boundTo(use, 'ceiling', 'state') as string]
      : []),
  ]
  return {
    behavior: {
      marks,
      parts: {
        [part]: control,
        ...presses(down, -1, !moves || atMin),
        ...presses(up, 1, !moves || atMax),
        host: {
          states: {
            ...state('reading', parsed === null ? '' : String(parsed)),
            ...state('spoken', spoken),
          },
        },
      },
    },
    spun: { flaw: numberFieldFlaw(text, field), locale: field.locale },
  }
}
