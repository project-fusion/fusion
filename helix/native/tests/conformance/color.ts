import type { Intent, Left } from '@fusion.dev/helix-testing/conformance'
import { act, fireEvent, screen } from '@testing-library/react-native'
import { State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { formOf, HOST_STATES } from './forms'
import { tap } from './input'
import type { Run, View } from './views'

/*
 * A color picker's square, as the React Native half of a conformance scenario
 * performs it: a press at a point, the part laid out `LENGTH` points each way,
 * as the web half reads a share of its own.
 */

/** How long each side of the part is drawn, in points, as the harness lays it out. */
const LENGTH = 200

/** Whether the element holds a color a reader builds. */
export const colors = (tag: string): boolean => formOf(tag).api?.color !== undefined

/** The gestures a detector holds around `view`, and the view that measures them. */
const gestureAround = (
  view: View,
): { readonly gestures: readonly unknown[]; readonly measured: View | undefined } => {
  let measured: View | undefined
  for (let at: View | null = view; at !== null; at = at.parent) {
    if (typeof at.props.onLayout === 'function') {
      measured = at
      break
    }
  }
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = view.unstable_fiber; fiber; fiber = fiber.return) {
    const gesture = fiber.memoizedProps?.gesture as { gestures?: unknown[] } | undefined
    if (gesture?.gestures !== undefined) {
      return { gestures: gesture.gestures, measured }
    }
  }
  return { gestures: [], measured }
}

/** The axis a part is held by: the square's saturation, or the ring's hue. */
const axisOf = (part: string): View | undefined => {
  const root = screen.root
  const wanted = part === 'wheel' ? /Hue$/ : /Saturation$/
  return root
    ?.queryAll(() => true)
    .find(
      (node) =>
        typeof node.props.accessibilityLabel === 'string' &&
        wanted.test(node.props.accessibilityLabel) &&
        Array.isArray(node.props.accessibilityActions),
    )
}

/** Presses the part at the point, and lets go. **A disabled part takes no touch.** */
export const pointIn = async (
  intent: Extract<Intent, { kind: 'point' }>,
): Promise<string | undefined> => {
  const axis = axisOf(intent.part)
  if (axis === undefined) {
    return `The setup draws no ${intent.part}.`
  }
  const { gestures, measured } = gestureAround(axis)
  if (measured !== undefined) {
    await act(async () => {
      fireEvent(measured, 'layout', {
        nativeEvent: { layout: { height: LENGTH, width: LENGTH, x: 0, y: 0 } },
      })
    })
  }
  const at = { x: intent.x * LENGTH, y: intent.y * LENGTH }
  await act(async () => {
    fireGestureHandler(gestureAround(axisOf(intent.part) ?? axis).gestures[1] as never, [
      { state: State.BEGAN, ...at },
      { state: State.ACTIVE, ...at },
      { state: State.END, ...at },
    ])
  })
  return gestures.length === 0 ? 'The part holds no press.' : undefined
}

/** Whether the element is a field that opens a color picker. */
export const opensPicker = (tag: string): boolean => formOf(tag).api?.colorField !== undefined

/**
 * Presses the field's trigger, named by its `trigger-label`, where its picker
 * does not stand as the intent asks. A press on a disabled trigger does nothing.
 */
export const turnPicker = async (
  run: Run,
  intent: Extract<Intent, { kind: 'close' | 'open' }>,
): Promise<string | undefined> => {
  const { props, tag } = run.scenario.setup
  const open = HOST_STATES.get(tag)?.open === true
  if (open !== (intent.kind === 'open')) {
    /* The panel takes the trigger's words as its name too, and only the trigger is a press. */
    const trigger = screen
      .getAllByLabelText(String(props?.['trigger-label'] ?? 'Choose a color'), {
        includeHiddenElements: true,
      })
      .find((one) => typeof one.props.onResponderGrant === 'function')
    if (trigger === undefined) {
      return 'The field draws no trigger.'
    }
    await tap(trigger)
  }
  return undefined
}

/** Presses the first preset, the press that says whether it is chosen. */
export const pressSwatch = async (): Promise<string | undefined> => {
  const swatch = screen.root
    ?.queryAll(() => true)
    .find(
      (node) =>
        typeof node.props.onResponderGrant === 'function' &&
        typeof node.props.accessibilityState?.selected === 'boolean',
    )
  if (swatch === undefined) {
    return 'The setup draws no preset.'
  }
  await tap(swatch)
  return undefined
}

/** The text of the color the element holds, and whether it is marked wrong. */
export const colorLeft = (run: Run): Pick<Left, 'invalid' | 'value'> => {
  const { tag } = run.scenario.setup
  const reading = formOf(tag).api?.color?.computed?.reading
  if (reading === undefined) {
    return {}
  }
  const states = HOST_STATES.get(tag)
  return { invalid: states?.invalid === true, value: String(states?.[reading] ?? '') }
}
