import type { Intent, Left, Setup } from '@fusion.dev/helix-testing/conformance'
import { act, fireEvent, screen } from '@testing-library/react-native'
import { State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { heardKey } from '../../src/capabilities/focus-visible'
import { formOf, HOST_STATES } from './forms'

/*
 * A chart as the React Native half reads it: a tap on its plot at a point,
 * and what its reading says. The plot is laid out `LENGTH` points wide.
 */

const LENGTH = 200

type View = NonNullable<typeof screen.root>

/** The plot a screen reader adjusts, which holds the chart's tap and drag. */
const plotIn = (): View | undefined =>
  screen.root
    ?.queryAll((node) => typeof node.props.onAccessibilityAction === 'function')
    .find((node) => node.props.accessibilityRole === 'adjustable')

/** The tap and the drag of the detector around the plot, the drag first, and the view it measures. */
const gesturesOf = (plot: View): readonly unknown[] => {
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = plot.unstable_fiber; fiber; fiber = fiber.return) {
    const gesture = fiber.memoizedProps?.gesture as { gestures?: unknown[] } | undefined
    if (gesture?.gestures !== undefined) {
      return gesture.gestures
    }
  }
  return []
}

/**
 * A finger's tap on the chart's plot at `x` and `y`, fractions of it from its
 * top left corner. The plot is as tall as its `aspect` says, a ring's square,
 * and a strip a quarter of its width where it says none.
 */
export const tapPlot = async (
  intent: Extract<Intent, { kind: 'tap' }>,
  tag: string,
): Promise<string | undefined> => {
  const aspect = Number(HOST_STATES.get(tag)?.aspect ?? 4) || 4
  /* A chart that is decoration has no control a screen reader reaches, and a finger still reads its plot. */
  const plot =
    plotIn() ??
    screen.root
      ?.queryAll((node) => typeof node.props.onLayout === 'function')
      .find((node) => gesturesOf(node).length > 0)
  if (plot === undefined) {
    return 'The chart draws no plot to tap.'
  }
  await act(async () => {
    fireEvent(plot, 'layout', {
      nativeEvent: { layout: { height: LENGTH / aspect, width: LENGTH, x: 0, y: 0 } },
    })
  })
  const at = { x: intent.x * LENGTH, y: (intent.y * LENGTH) / aspect }
  const [, tap] = gesturesOf(plot)
  if (tap === undefined) {
    return 'The plot holds no tap.'
  }
  await act(async () => {
    fireGestureHandler(tap as never, [
      { state: State.BEGAN, ...at },
      { state: State.ACTIVE, ...at },
      { state: State.END, ...at },
    ])
  })
  return undefined
}

/** Whether the element is a chart a reader reads a reading at a time. */
export const isChart = (tag: string): boolean => {
  const api = formOf(tag).api
  return api?.sparkline !== undefined || api?.donutChart !== undefined
}

/**
 * Focus on the chart's plot as a reader tabs to it: the node it hears keys on,
 * and the key that brought focus there, so its ring shows, as `:focus-visible`
 * holds on the web after Tab.
 */
export const focusPlot = async (listening: readonly unknown[], place: (node: unknown) => void) => {
  const heard = new Set(listening)
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = plotIn()?.unstable_fiber; fiber; fiber = fiber.return) {
    if (heard.has(fiber.stateNode)) {
      await act(() => {
        place(fiber.stateNode)
        heardKey()
      })
      return
    }
  }
}

/** What a chart's reading says: the readout's words, and the words its live region is told. */
export const chartLeft = (setup: Setup): Pick<Left, 'reading'> => {
  if (!isChart(setup.tag)) {
    return {}
  }
  const states = HOST_STATES.get(setup.tag)
  const words = (name: string) => String(states?.[name] ?? '')
  return { reading: { readout: words('readout'), said: words('live') } }
}
