/*
 * The generated Scatter Chart, drawn from its real intermediate form: a table
 * read by its id drawn as layers of paths, a path a size, the lines of best
 * fit, a series a legend hid, the words in place of the drawing, and the
 * reading a finger and a key move, with the events each move sends, the
 * point drawn again over the canvases, and the bubble. `test:native` writes
 * the component beside this file.
 */
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useEffect } from 'react'
import { Dimensions } from 'react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { hideChartSeries, publishChartSource } from '../render/chart-sources'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import { HelixScatterChart, type HelixScatterChartProps } from './scatter-chart/index.native'

let keys: FakeKeys<unknown>
let listening: unknown[]

beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  const fake = fakeKeys<unknown>()
  listening = []
  keys = {
    ...fake,
    listen: (node, heard) => {
      listening.push(node)
      return fake.listen(node, heard)
    },
  }
  setKeys(keys)
  hideChartSeries('pages', [])
})

const cell = (name: string, value: number) => ({ name, text: String(value), value })

/** Four pages measured across by weight, up by load time and a second measure, out of order, under the id `pages`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('pages', {
        caption: 'Page weight and load time',
        rows: empty
          ? []
          : [
              { cells: [cell('Weight', 30), cell('Load', 10), cell('Other', 25)], label: 'A' },
              { cells: [cell('Weight', 10), cell('Load', 20), cell('Other', 5)], label: 'B' },
              { cells: [cell('Weight', 40), cell('Load', 30), cell('Other', 35)], label: 'C' },
              { cells: [cell('Weight', 20), cell('Load', 40), cell('Other', 15)], label: 'D' },
            ],
      }),
    [empty],
  )
  return null
}

const Chart = ({
  blank = false,
  ...props
}: HelixScatterChartProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixScatterChart for="pages" {...props} />
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** The shapes a vector draws, by the component `react-native-svg`'s mock names. */
const shapes = (kind: string) => screen.root?.queryAll((node) => node.type === kind) ?? []

/** Each path's data that draws something. */
const paths = () =>
  shapes('RNSVGPath')
    .map((one) => String(one.props.d))
    .filter((d) => d !== '')

/** The paths of points, each a stroke of no length at each point. */
const dots = () => paths().filter((d) => d.endsWith('h0'))

/** The plot a screen reader reaches as one control. */
const plot = () => {
  const found = screen.root
    ?.queryAll((node) => typeof node.props.onAccessibilityAction === 'function')
    .find((node) => node.props.accessible === true)
  if (found === undefined) {
    throw new Error('no plot is drawn')
  }
  return found
}

/** The plot laid out 400 points wide and 200 tall. */
const layOut = async () => {
  await act(async () => {
    fireEvent(plot(), 'layout', {
      nativeEvent: { layout: { height: 200, width: 400, x: 0, y: 24 } },
    })
  })
}

/** The press and the drag the plot's detector holds, the drag first. */
const gestures = (): readonly unknown[] => {
  type Fiber = {
    readonly memoizedProps?: { readonly gesture?: { readonly gestures?: readonly unknown[] } }
    readonly return: Fiber | null
  }
  for (let fiber = plot().unstable_fiber as Fiber | null; fiber !== null; fiber = fiber.return) {
    const found = fiber.memoizedProps?.gesture?.gestures
    if (found !== undefined) {
      return found
    }
  }
  return []
}

/** A tap on the plot at `x` and `y` points. */
const tapAt = async (x: number, y: number) => {
  await layOut()
  await act(async () => {
    fireGestureHandler(gestures()[1] as never, [
      { state: State.BEGAN, x, y },
      { state: State.ACTIVE, x, y },
      { state: State.END, x, y },
    ])
  })
}

/** A key pressed on the plot, as a hardware keyboard sends it. */
const key = async (name: string) => {
  await act(() => {
    const held = { alt: false, control: false, shift: false }
    ;[...new Set(listening)].reverse().some((node) => keys.press(node, name, held))
  })
}

/** Each reading event a handler heard, with its row, its series, and what moved it. */
const heard = () => {
  const events: string[] = []
  const take =
    (name: string) =>
    (event: { detail: { index: number; label: string; pointerType: string; series: string } }) => {
      const { index, label, pointerType, series } = event.detail
      events.push(`${name} ${index} ${pointerType} ${label} ${series}`.trim())
    }
  return { events, props: { onReadingChange: take('change'), onReadingPress: take('press') } }
}

/** The canvases drawn: the rules' and one a layer of points. */
const canvases = () => shapes('RNSVGSvgView').length

describe('the points', () => {
  test('draws each series as layers of paths, rings under dots, and both scales', async () => {
    await render(<Chart gridlines="both" />)
    await layOut()
    /* Load and Other are a layer each, their rings and their dots: four paths of four points. */
    expect(dots()).toHaveLength(4)
    expect(dots().every((d) => d.split('h0').length === 5)).toBe(true)
    /* B stands at the left edge, 20 of a range from 5 to 40 up. */
    expect(dots()).toContainEqual(expect.stringContaining('M0,57.14h0'))
    expect(screen.getByText('Weight', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByText('Load, Other', { includeHiddenElements: true })).toBeTruthy()
  })

  test('draws each line of best fit under trend', async () => {
    await render(<Chart trend />)
    await layOut()
    expect(paths().filter((d) => d.startsWith('M0,') && !d.endsWith('h0'))).toHaveLength(2)
  })

  test('sizes a point by the column size-by names, which is then no series', async () => {
    await render(<Chart sizeBy="Other" />)
    await layOut()
    expect(screen.getByText('Load', { includeHiddenElements: true })).toBeTruthy()
    /* One path a size: four sizes of one series' points, each a ring and a dot. */
    expect(dots()).toHaveLength(8)
  })

  test('closes a series a legend hid, and fits the scales to the rest', async () => {
    await render(<Chart />)
    await layOut()
    await act(async () => {
      hideChartSeries('pages', ['Other'])
    })
    expect(dots()).toHaveLength(2)
  })

  test('says it has no readings, in place of the drawing', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(canvases()).toBe(0)
  })
})

describe('the reading', () => {
  test('a tap finds the point nearest it, presses it, and draws it again with its bubble', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    const before = canvases()
    await tapAt(4, 112)
    expect(events).toEqual(['press 1 touch B', 'change 1 touch B'])
    expect(canvases()).toBe(before)
    expect(screen.getByText('B', { includeHiddenElements: true })).toBeTruthy()
    expect(plot().props.accessibilityValue).toEqual({
      text: 'B: Weight 10, Load 20, Other 5 (1 of 4)',
    })
  })

  test('a tap far from every point moves nothing', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await tapAt(300, 10)
    expect(events).toEqual([])
  })

  test('the keys walk the points left to right, and the series of a row', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await key('ArrowRight')
    await key('ArrowRight')
    await key('ArrowDown')
    await key('End')
    expect(events).toEqual([
      'change 1 keyboard B',
      'change 3 keyboard D',
      'change 3 keyboard D Load',
      'change 2 keyboard C Load',
    ])
  })
})
