import type { Intent, Left } from '@fusion.dev/helix-testing/conformance'
import { act, fireEvent, screen } from '@testing-library/react-native'
import { State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { formOf, HOST_STATES } from './forms'
import type { Run, View } from './views'

/*
 * Moving an element along its track, as the React Native half of a
 * conformance scenario performs it: a press on the track at a point, which
 * takes the value there, and a screen reader's increment and decrement.
 */

/** How long the track is drawn, in points, as the harness lays it out. */
const LENGTH = 200

/** Whether a view is a control a screen reader adjusts. */
const adjusts = (view: View): boolean =>
  ((view.props.accessibilityActions ?? []) as { readonly name: string }[]).some(
    (one) => one.name === 'increment',
  )

/** The setup's control, the view whose role is `slider`. */
const controlIn = (): View | undefined => {
  const root = screen.root
  return root === null ? undefined : [root, ...root.queryAll(adjusts)].find(adjusts)
}

/** Whether the element is a range a reader moves. */
export const ranges = (tag: string): boolean => formOf(tag).api?.range !== undefined

/**
 * The node the control listens for keys on, which focus is placed on, as a
 * reader tabs to it.
 */
export const rangeFocus = (run: Run): unknown => {
  const listening = new Set(run.listening)
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = controlIn()?.unstable_fiber; fiber; fiber = fiber.return) {
    if (listening.has(fiber.stateNode)) {
      return fiber.stateNode
    }
  }
  return undefined
}

/** The press the control's track jumps with, from the gesture its detector holds. */
const pressOn = (control: View): unknown => {
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = control.unstable_fiber; fiber; fiber = fiber.return) {
    const gesture = fiber.memoizedProps?.gesture as { gestures?: unknown[] } | undefined
    if (gesture?.gestures !== undefined) {
      return gesture.gestures[1]
    }
  }
  return undefined
}

/**
 * Presses the track at `to`, a fraction of it from its start, as a reader
 * drags the thumb there and lets go. **A disabled control takes no touch.**
 */
export const slideTo = async (
  run: Run,
  intent: Extract<Intent, { kind: 'slide' }>,
): Promise<string | undefined> => {
  const control = controlIn()
  if (control === undefined) {
    return 'The setup draws no control to slide.'
  }
  const press = pressOn(control)
  if (press === undefined) {
    return 'The control holds no press on its track.'
  }
  const vertical = run.scenario.setup.props?.orientation === 'vertical'
  await act(async () => {
    fireEvent(control, 'layout', {
      nativeEvent: { layout: { height: LENGTH, width: LENGTH, x: 0, y: 0 } },
    })
  })
  const at = vertical
    ? { x: LENGTH / 2, y: (1 - intent.to) * LENGTH }
    : { x: intent.to * LENGTH, y: LENGTH / 2 }
  await act(async () => {
    fireGestureHandler(press as never, [
      { state: State.BEGAN, ...at },
      { state: State.ACTIVE, ...at },
      { state: State.END, ...at },
    ])
  })
  return undefined
}

/** A screen reader's increment or decrement on the control. */
export const adjustBy = async (
  intent: Extract<Intent, { kind: 'adjust' }>,
): Promise<string | undefined> => {
  const control = controlIn()
  if (control === undefined) {
    return 'The setup draws no control to adjust.'
  }
  await act(async () => {
    await fireEvent(control, 'accessibilityAction', {
      nativeEvent: { actionName: intent.by > 0 ? 'increment' : 'decrement' },
    })
  })
  return undefined
}

/** The value the element holds, for a family a reader moves along a track. */
export const rangeLeft = (run: Run): Pick<Left, 'value'> => {
  const { tag } = run.scenario.setup
  const reading = formOf(tag).api?.range?.reading
  if (reading === undefined) {
    return {}
  }
  return { value: String(HOST_STATES.get(tag)?.[reading] ?? '') }
}
