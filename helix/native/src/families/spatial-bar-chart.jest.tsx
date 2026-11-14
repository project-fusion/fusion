/*
 * The generated Spatial Bar Chart, drawn from its real intermediate form: a
 * table read by its id as blocks on a grid of categories and series in a box
 * seen in 3D, its faces in their colors, a row's floor and names, a toned
 * bar's value over it, the words in place of the drawing, and the reading a
 * finger and a key move, with the events each sends, the ring, and the
 * bubble. `test:native` writes the component beside this file.
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
  HelixSpatialBarChart,
  type HelixSpatialBarChartProps,
} from './spatial-bar-chart/index.native'

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

const cell = (name: string, value: number | undefined, tone?: string) => ({
  name,
  text: value === undefined ? '' : `${value} sold`,
  ...(value === undefined ? {} : { value }),
  ...(tone === undefined ? {} : { tone }),
})

/** Sales in two quarters for three regions, South's second quarter missing, under the id `sales`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('sales', {
        caption: 'Sales',
        rows: empty
          ? []
          : [
              { cells: [cell('Q1', 40), cell('Q2', 60)], label: 'North' },
              { cells: [cell('Q1', 30), cell('Q2', undefined)], label: 'South' },
              { cells: [cell('Q1', 70, 'primary'), cell('Q2', 20)], label: 'West' },
            ],
      }),
    [empty],
  )
  return null
}

const Chart = ({
  blank = false,
  ...props
}: HelixSpatialBarChartProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixSpatialBarChart for="sales" {...props} />
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** The shapes a vector draws, by the component `react-native-svg`'s mock names. */
const shapes = (kind: string) => screen.root?.queryAll((node) => node.type === kind) ?? []

/** The faces of the bars, each a path that names the colors it is painted in. */
const faces = () =>
  shapes('RNSVGPath').filter(
    (one) => one.props.fillOpacity !== undefined && String(one.props.d) !== '',
  )

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

/** The words drawn over the drawing. */
const words = (text: string) => screen.queryAllByText(text, { includeHiddenElements: true })

describe('the bars', () => {
  test('draws a block for each value, its faces back to front, and the box’s names', async () => {
    await render(<Chart />)
    await layOut()
    /* Five values, each a block of a top and two sides. */
    expect(faces().length).toBe(15)
    expect(words('North').length).toBeGreaterThan(0)
    expect(words('Q2').length).toBeGreaterThan(0)
  })

  test('a row draws its floor and names each category under it, and a toned bar’s value over it', async () => {
    await render(<Chart layout="row" stacked />)
    await layOut()
    expect(words('West').length).toBeGreaterThan(0)
    expect(words('70 sold').length).toBe(1)
  })

  test('says it has no readings, in place of the drawing', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(shapes('RNSVGSvgView')).toHaveLength(0)
  })
})

describe('the reading', () => {
  test('the across arrows step a category and the others a series, and a place with no value says so', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    await key('ArrowRight')
    expect(plot().props.accessibilityValue?.text).toMatch(/^North, Q1 40 sold/)
    await key('ArrowDown')
    expect(plot().props.accessibilityValue?.text).toMatch(/^North, Q2 60 sold/)
    await key('ArrowRight')
    expect(plot().props.accessibilityValue?.text).toBe('South, Q2: no value')
    expect(events).toEqual([
      'change 0 keyboard North',
      'change 0 keyboard North',
      'change -1 keyboard South',
    ])
  })

  test('a tap on a bar shows its bubble', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    await act(async () => {
      fireGestureHandler(gestures()[1] as never, [
        { state: State.BEGAN, x: 216, y: 216 },
        { state: State.ACTIVE, x: 216, y: 216 },
        { state: State.END, x: 216, y: 216 },
      ])
    })
    expect(events.some((one) => one.startsWith('press '))).toBe(true)
  })

  test('Shift with an arrow turns the view and moves no reading', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    const before = faces()
      .map((one) => String(one.props.d))
      .join()
    await key('ArrowRight', true)
    expect(
      faces()
        .map((one) => String(one.props.d))
        .join(),
    ).not.toBe(before)
    expect(events).toEqual([])
  })
})
