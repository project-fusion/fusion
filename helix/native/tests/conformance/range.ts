import type { Intent, Left } from '@fusion.dev/helix-testing/conformance'
import { act, fireEvent, screen } from '@testing-library/react-native'
import { State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { formOf, HOST_STATES } from './forms'
import type { Run, View } from './views'

/*
 * Moving an element along its track, as the React Native half of a
 * conformance scenario performs it: a press on the track at a point, which
 * takes the value there, a drag of a splitter's divider, and a screen
 * reader's increment and decrement.
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

/** The gestures the control's detector holds, the drag first. */
const gesturesOn = (control: View): readonly unknown[] => {
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = control.unstable_fiber; fiber; fiber = fiber.return) {
    const gesture = fiber.memoizedProps?.gesture as { gestures?: unknown[] } | undefined
    if (gesture?.gestures !== undefined) {
      return gesture.gestures
    }
  }
  return []
}

/**
 * Drags a splitter's divider to `to`, a fraction of the splitter from its
 * start, and lets go: the splitter laid out `LENGTH` points each way, and
 * the drag carried from where the divider stands in one move, as the web
 * half moves its pointer once.
 */
const dragDivider = async (control: View, to: number, vertical: boolean): Promise<void> => {
  let host: View | null = control.parent
  while (host !== null && typeof host.props.onLayout !== 'function') {
    host = host.parent
  }
  if (host !== null) {
    const measured = host
    await act(async () => {
      fireEvent(measured, 'layout', {
        nativeEvent: { layout: { height: LENGTH, width: LENGTH, x: 0, y: 0 } },
      })
    })
  }
  const now = Number((controlIn()?.props.accessibilityValue as { now?: unknown } | undefined)?.now)
  const by = ((to * 100 - now) / 100) * LENGTH
  const moved = (amount: number) =>
    vertical ? { translationX: 0, translationY: amount } : { translationX: amount, translationY: 0 }
  const drag = gesturesOn(controlIn() ?? control)[0]
  await act(async () => {
    fireGestureHandler(drag as never, [
      { state: State.BEGAN, ...moved(0) },
      { state: State.ACTIVE, ...moved(by) },
      { state: State.END, ...moved(by) },
    ])
  })
}

/**
 * Presses the track at `to`, a fraction of it from its start, as a reader
 * drags the thumb there and lets go. **A disabled control takes no touch.**
 * A splitter's divider is dragged there.
 */
export const slideTo = async (
  run: Run,
  intent: Extract<Intent, { kind: 'slide' }>,
): Promise<string | undefined> => {
  const control = controlIn()
  if (control === undefined) {
    return 'The setup draws no control to slide.'
  }
  if (formOf(run.scenario.setup.tag).api?.range?.basis !== undefined) {
    await dragDivider(control, intent.to, run.scenario.setup.props?.orientation === 'vertical')
    return undefined
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

/**
 * The value the element holds, for a family a reader moves along a track or
 * picks a score in, and whether it is marked wrong.
 */
export const rangeLeft = (run: Run): Pick<Left, 'invalid' | 'value'> => {
  const { tag } = run.scenario.setup
  const reading = formOf(tag).api?.range?.reading
  /* A number a reader types holds its text, which its text record says. */
  if (reading === undefined || formOf(tag).api?.entry !== undefined) {
    return {}
  }
  const states = HOST_STATES.get(tag)
  return { invalid: states?.invalid === true, value: String(states?.[reading] ?? '') }
}
