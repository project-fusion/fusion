/*
 * The generated Bar Chart, drawn from its real intermediate form: a table read
 * by its id drawn as columns from zero, abreast and stacked, below zero, down
 * the side, a series as a line and on a second scale, a series a legend hid,
 * the paths of a dense chart, the words in place of the drawing, and the
 * reading a finger, a key, and a screen reader move, with the events each
 * move sends, the category drawn again over the faded columns, and the bubble.
 * `test:native` writes the component beside this file.
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
import { HelixBarChart, type HelixBarChartProps } from './bar-chart/index.native'

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
  hideChartSeries('deploys', [])
})

const cell = (name: string, value: number) => ({ name, text: value.toLocaleString('en'), value })

/** Two services over four quarters, one below zero once, under the id `deploys`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('deploys', {
        caption: 'Deploys per quarter',
        rows: empty
          ? []
          : [
              { cells: [cell('Gateway', 40), cell('Billing', 20)], label: 'Q1' },
              { cells: [cell('Gateway', 80), cell('Billing', -20)], label: 'Q2' },
              { cells: [cell('Gateway', 60), cell('Billing', 40)], label: 'Q3' },
              { cells: [cell('Gateway', 20), cell('Billing', 60)], label: 'Q4' },
            ],
      }),
    [empty],
  )
  return null
}

const Chart = ({ blank = false, ...props }: HelixBarChartProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixBarChart for="deploys" {...props} />
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
      nativeEvent: { layout: { height: 200, width: 400, x: 0, y: 0 } },
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
const tapAt = async (x: number, y = 100) => {
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

/** The columns' views: every column first, then the category shown where one is. */
const canvases = () =>
  screen.root?.queryAll((node) => node.type === 'RNSVGSvgView').map((one) => one.props) ?? []

/* With no scale drawn and no rules, so the tallest column meets the top edge. Drawn by
   default, either one gives the peak room above it, as the web's element does. */
const Bare = (props: HelixBarChartProps) => (
  <Chart
    gridlines="none"
    valueAxis="none"
    {...props}
  />
)

describe('the columns', () => {
  test('stands each category abreast from zero, a column below zero hanging from the baseline', async () => {
    await render(<Bare />)
    await layOut()
    /* Zero is 80% down a range of -20 to 80: Gateway 40 rises to 40%, its
       far corners rounded two points on a plot 400 by 200. */
    expect(paths()).toContain(
      'M3.86,80L3.86,41A0.5,1 0 0 1 4.36,40L11.64,40A0.5,1 0 0 1 12.14,41L12.14,80Z',
    )
    /* Billing at -20 hangs from zero to the bottom, rounded there. */
    expect(paths()).toContain(
      'M37.86,80L37.86,99A0.5,1 0 0 0 38.36,100L45.64,100A0.5,1 0 0 0 46.14,99L46.14,80Z',
    )
  })

  test('stacks a category into one column under stacked', async () => {
    await render(<Bare stacked />)
    await layOut()
    /* Q1's stack: Gateway's segment meets Billing's square, and Billing's far end is rounded. */
    expect(paths()).toContain('M3.5,83.33L3.5,50L3.5,50L21.5,50L21.5,50L21.5,83.33Z')
    expect(paths()).toContain(
      'M3.5,50L3.5,34.33A0.5,1 0 0 1 4,33.33L21,33.33A0.5,1 0 0 1 21.5,34.33L21.5,50Z',
    )
  })

  test('runs the categories down the side, and draws a series as a line on a scale of its own', async () => {
    await render(<Chart lines="Billing" orientation="horizontal" secondary="Billing" />)
    await layOut()
    /* Gateway's bars run across from zero; Billing is a line through the middle of each row, on its own scale. */
    expect(paths()).toContain('M0,0L0,100')
    /* Each scale takes room above its peak once `secondary` splits them: -40 to 80. */
    expect(paths()).toContain('M50,12.5L16.67,37.5L66.67,62.5L83.33,87.5')
    /* Both scales are numbered: the second reaches below zero, and both reach 80. */
    expect(screen.getAllByText('−40', { includeHiddenElements: true })).toHaveLength(1)
    expect(screen.getAllByText('80', { includeHiddenElements: true })).toHaveLength(2)
  })

  test('closes a series a legend hid, and fits the scale to the rest', async () => {
    await render(<Chart />)
    await layOut()
    await act(async () => {
      hideChartSeries('deploys', ['Billing'])
    })
    expect(paths()).toContain('M0,100L100,100')
  })

  test('draws a chart of more columns than the plot has pixels as paths', async () => {
    const rows = Array.from({ length: 3000 }, (_, at): [string, number] => [`R${at}`, at % 7])
    await render(<Chart data={{ columns: ['Row', 'Count'], rows }} for="" />)
    await layOut()
    expect(paths().filter((d) => d.split('z').length > 100)).toHaveLength(1)
  })

  test('says it has no readings, in place of the drawing', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(shapes('RNSVGSvgView')).toHaveLength(0)
  })
})

describe('the reading', () => {
  test('a tap finds the category by its slot, presses it, and draws it again over the faded columns', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    const before = canvases().length
    await tapAt(150)
    expect(events).toEqual(['press 1 touch Q2', 'change 1 touch Q2'])
    expect(canvases()).toHaveLength(before + 1)
    expect(plot().props.accessibilityValue).toEqual({
      text: 'Q2: Gateway 80, Billing -20 (2 of 4)',
    })
  })

  test('a tap down the side finds the category by its row', async () => {
    const { events, props } = heard()
    await render(<Chart orientation="horizontal" {...props} />)
    await tapAt(200, 160)
    expect(events).toEqual(['press 3 touch Q4', 'change 3 touch Q4'])
  })

  test('the keys walk the categories and the series of a category', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await key('ArrowRight')
    await key('ArrowDown')
    await key('End')
    expect(events).toEqual([
      'change 0 keyboard Q1',
      'change 0 keyboard Q1 Gateway',
      'change 3 keyboard Q4 Gateway',
    ])
  })

  test('a screen reader adjusts the plot, which each series highest reading describes', async () => {
    await render(<Chart />)
    expect(plot().props.accessibilityHint).toBe(
      'Deploys per quarter. Highest: Gateway Q2 80; Billing Q4 60.',
    )
  })
})
