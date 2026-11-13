/*
 * The generated Spatial Scatter Chart, drawn from its real intermediate form:
 * a table read by its id as points in a box seen in 3D, its grid and its
 * numbers and names, the lines to the floor, a box left out, the words in
 * place of the drawing, and the reading a finger and a key move, with the
 * events each sends, the ring, and the bubble; and the view a drag and Shift
 * with an arrow turn. `test:native` writes the component beside this file.
 */
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useEffect } from 'react'
import { Dimensions } from 'react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { publishChartSource } from '../render/chart-sources'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import {
  HelixSpatialScatterChart,
  type HelixSpatialScatterChartProps,
} from './spatial-scatter-chart/index.native'

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
})

const cell = (name: string, value: number) => ({ name, text: String(value), value })

/** Four servers by load, latency, and memory, two in each region, under the id `servers`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('servers', {
        caption: 'Servers',
        rows: empty
          ? []
          : [
              {
                cells: [
                  cell('Load', 10),
                  cell('Latency', 20),
                  cell('Memory', 30),
                  { name: 'Region', text: 'East' },
                ],
                label: 'A',
              },
              {
                cells: [
                  cell('Load', 40),
                  cell('Latency', 10),
                  cell('Memory', 60),
                  { name: 'Region', text: 'West' },
                ],
                label: 'B',
              },
              {
                cells: [
                  cell('Load', 70),
                  cell('Latency', 50),
                  cell('Memory', 10),
                  { name: 'Region', text: 'East' },
                ],
                label: 'C',
              },
              {
                cells: [
                  cell('Load', 90),
                  cell('Latency', 80),
                  cell('Memory', 50),
                  { name: 'Region', text: 'West' },
                ],
                label: 'D',
              },
            ],
      }),
    [empty],
  )
  return null
}

const Chart = ({
  blank = false,
  ...props
}: HelixSpatialScatterChartProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixSpatialScatterChart for="servers" groupBy="Region" {...props} />
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

/** The circles of points and the ring, each two arcs. */
const circles = () => paths().filter((d) => d.endsWith('Z'))

/** The lines down to the floor, each one stroke. */
const drops = () => paths().filter((d) => /^M[^L]*L[^ML]*$/.test(d))

/** The drawing's frame, as its `viewBox` says. */
const frame = () => {
  const [x, y, width, height] = String(
    shapes('RNSVGSvgView')[0]?.props.vbWidth === undefined
      ? shapes('RNSVGSvgView')[0]?.props.viewBox
      : [
          shapes('RNSVGSvgView')[0]?.props.minX,
          shapes('RNSVGSvgView')[0]?.props.minY,
          shapes('RNSVGSvgView')[0]?.props.vbWidth,
          shapes('RNSVGSvgView')[0]?.props.vbHeight,
        ].join(' '),
  )
    .split(/[ ,]+/)
    .map(Number)
  return { height: height ?? 0, width: width ?? 0, x: x ?? 0, y: y ?? 0 }
}

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

/** The plot laid out 432 points square, its drawing 400 inside a 16 inset. */
const layOut = async () => {
  await act(async () => {
    fireEvent(plot(), 'layout', {
      nativeEvent: { layout: { height: 432, width: 432, x: 0, y: 0 } },
    })
  })
}

/** The drag and the press the plot's detector holds, the drag first. */
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

/** Where a point's circle stands on the plot, in points, from its path and the drawing's frame. */
const onPlot = (d: string) => {
  const [left, y] = (d.match(/^M([-\d.e]+) ([-\d.e]+)/) ?? []).slice(1).map(Number)
  const at = frame()
  return {
    x: 16 + (((left ?? 0) + 0.045 - at.x) / at.width) * 400,
    y: 16 + (((y ?? 0) - at.y) / at.height) * 400,
  }
}

/** A tap on the plot at `x` and `y` points. */
const tapAt = async (x: number, y: number) => {
  await act(async () => {
    fireGestureHandler(gestures()[1] as never, [
      { state: State.BEGAN, x, y },
      { state: State.ACTIVE, x, y },
      { state: State.END, x, y },
    ])
  })
}

/** A key pressed on the plot, as a hardware keyboard sends it. */
const key = async (name: string, shift = false) => {
  await act(() => {
    const held = { alt: false, control: false, shift }
    ;[...new Set(listening)].reverse().some((node) => keys.press(node, name, held))
  })
}

/** Each reading event a handler heard, with its row and what moved it. */
const heard = () => {
  const events: string[] = []
  const take =
    (name: string) =>
    (event: { detail: { index: number; label: string; pointerType: string } }) => {
      const { index, label, pointerType } = event.detail
      events.push(`${name} ${index} ${pointerType} ${label}`)
    }
  return { events, props: { onReadingChange: take('change'), onReadingPress: take('press') } }
}

describe('the box and its points', () => {
  test('draws a point for each row, its grid, and its numbers and names', async () => {
    await render(<Chart />)
    await layOut()
    expect(circles()).toHaveLength(4)
    expect(drops()).toHaveLength(0)
    expect(screen.getByText('Load', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByText('Memory', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getAllByText('100', { includeHiddenElements: true }).length).toBeGreaterThan(0)
  })

  test('draws a line from each point to the floor under drop-lines', async () => {
    await render(<Chart dropLines />)
    await layOut()
    expect(drops()).toHaveLength(4)
  })

  test('draws no box, grid, numbers, or names under no-box', async () => {
    await render(<Chart noBox />)
    await layOut()
    expect(circles()).toHaveLength(4)
    expect(screen.queryByText('Load', { includeHiddenElements: true })).toBeNull()
  })

  test('says it has no readings, in place of the drawing', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(shapes('RNSVGSvgView')).toHaveLength(0)
  })
})

describe('the reading', () => {
  test('a tap on a point presses it, rings it, and shows its bubble', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    const [first] = circles()
    const at = onPlot(first ?? '')
    await tapAt(at.x, at.y)
    expect(events).toHaveLength(2)
    expect(events[0]).toMatch(/^press \d touch [A-D]$/)
    /* The four points and the ring. */
    expect(circles()).toHaveLength(5)
    expect(plot().props.accessibilityValue?.text).toMatch(/\(\d of 4\)$/)
  })

  test('a drag that turns the view keeps the reading, and its bubble once the drag lifts', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    const [first] = circles()
    const at = onPlot(first ?? '')
    await tapAt(at.x, at.y)
    const label = (events[0] ?? '').split(' ').pop() ?? ''
    expect(screen.getByText(label, { includeHiddenElements: true })).toBeTruthy()
    await act(async () => {
      fireGestureHandler(gestures()[0] as never, [
        { state: State.BEGAN, translationX: 0, translationY: 0, x: 200, y: 200 },
        { state: State.ACTIVE, translationX: 10, translationY: 0, x: 210, y: 200 },
        { state: State.ACTIVE, translationX: 60, translationY: 0, x: 260, y: 200 },
        { state: State.END, translationX: 60, translationY: 0, x: 260, y: 200 },
      ])
    })
    expect(circles()).toHaveLength(5)
    expect(screen.getByText(label, { includeHiddenElements: true })).toBeTruthy()
  })

  test('a tap far from every point moves nothing', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    await tapAt(2, 2)
    expect(events).toEqual([])
  })

  test('the keys walk the points in the table’s order, and say each row', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    await key('ArrowRight')
    await key('ArrowRight')
    await key('End')
    expect(events).toEqual(['change 0 keyboard A', 'change 1 keyboard B', 'change 3 keyboard D'])
    expect(plot().props.accessibilityValue).toEqual({
      text: 'D: Load 90, Latency 80, Memory 50, Region West (4 of 4)',
    })
  })
})

describe('the view', () => {
  test('Shift with an arrow turns it and moves no reading', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    const before = paths().join()
    await key('ArrowRight', true)
    expect(paths().join()).not.toBe(before)
    expect(events).toEqual([])
  })

  test('a drag across the drawing turns it and moves no reading', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    const before = paths().join()
    await act(async () => {
      fireGestureHandler(gestures()[0] as never, [
        { state: State.BEGAN, translationX: 0, translationY: 0, x: 200, y: 200 },
        { state: State.ACTIVE, translationX: 10, translationY: 0, x: 210, y: 200 },
        { state: State.ACTIVE, translationX: 60, translationY: 0, x: 260, y: 200 },
        { state: State.END, translationX: 60, translationY: 0, x: 260, y: 200 },
      ])
    })
    expect(paths().join()).not.toBe(before)
    expect(events).toEqual([])
  })
})
