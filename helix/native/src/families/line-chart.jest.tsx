/*
 * The generated Line Chart, drawn from its real intermediate form: a line
 * through each series of a table read by its id, its wash, its marks and its
 * end, the rules and the numbers of the scale, a series a legend hid left out,
 * the words in place of the drawing while there is nothing to draw, and the
 * reading a finger, a key, and a screen reader move, with the events each move
 * sends, the band and the guide it draws, and the bubble it opens.
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
import { HelixLineChart, type HelixLineChartProps } from './line-chart/index.native'

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
  hideChartSeries('channels', [])
})

const cell = (name: string, value: number | undefined) =>
  value === undefined ? { name, text: '' } : { name, text: value.toLocaleString('en'), value }

/** A table of two channels over four months, under the id `channels`, with a blank in April's referrals. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('channels', {
        caption: 'Sessions by channel',
        rows: empty
          ? []
          : [
              { cells: [cell('Direct', 1000), cell('Referral', 500)], label: 'Jan' },
              { cells: [cell('Direct', 1200), cell('Referral', 700)], label: 'Feb' },
              { cells: [cell('Direct', 1100), cell('Referral', 600)], label: 'Mar' },
              { cells: [cell('Direct', 1400), cell('Referral', undefined)], label: 'Apr' },
            ],
      }),
    [empty],
  )
  return null
}

const Chart = ({ blank = false, ...props }: HelixLineChartProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixLineChart for="channels" {...props} />
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

/** A tap on a plot 400 points wide at `x` points across. */
const tapAt = async (x: number) => {
  await act(async () => {
    fireEvent(plot(), 'layout', {
      nativeEvent: { layout: { height: 200, width: 400, x: 0, y: 0 } },
    })
  })
  await act(async () => {
    fireGestureHandler(gestures()[1] as never, [
      { state: State.BEGAN, x, y: 100 },
      { state: State.ACTIVE, x, y: 100 },
      { state: State.END, x, y: 100 },
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

describe('the lines', () => {
  test('draws a line through each series over the range of the readings, each reading in the middle of its slot', async () => {
    await render(<Chart curve="straight" />)
    /* Direct from 1000 to 1400 and Referral from 500 to 700, over 500 to 1400. */
    expect(paths()).toEqual(['M12.5,44.44L37.5,22.22L62.5,33.33L87.5,0', expect.any(String)])
    expect(paths()[1]?.startsWith('M12.5,100')).toBe(true)
  })

  test('washes each line under area, and marks a reading under markers', async () => {
    await render(<Chart area curve="straight" markers />)
    const drawn = paths()
    expect(drawn[0]).toBe('M12.5,44.44L37.5,22.22L62.5,33.33L87.5,0L87.5,100L12.5,100Z')
    expect(drawn).toContain('M12.5,44.44h0M37.5,22.22h0M62.5,33.33h0M87.5,0h0')
  })

  test('rules the levels and zero, and writes the numbers of the scale beside the plot', async () => {
    await render(<Chart gridlines="value" valueAxis zero />)
    expect(paths().filter((d) => d.startsWith('M0,'))).toContain('M0,100L100,100')
    for (const number of ['200', '1,400']) {
      expect(screen.getByText(number, { includeHiddenElements: true })).toBeTruthy()
    }
  })

  test('names the readings under the plot', async () => {
    await render(<Chart />)
    for (const month of ['Jan', 'Feb', 'Mar', 'Apr']) {
      expect(screen.getByText(month, { includeHiddenElements: true })).toBeTruthy()
    }
  })

  test('leaves out a series a legend hid, and fits the scale to the rest', async () => {
    await render(<Chart curve="straight" />)
    await act(async () => {
      hideChartSeries('channels', ['Direct'])
    })
    expect(paths()).toEqual(['M12.5,100L37.5,0L62.5,50'])
  })

  test('says it has no readings, in place of the drawing', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(shapes('RNSVGSvgView')).toHaveLength(0)
  })

  test('says it is loading while loading is set and nothing is drawn', async () => {
    await render(<Chart blank loading />)
    expect(screen.getByText('Loading readings')).toBeTruthy()
  })
})

describe('the reading', () => {
  test('a tap finds the reading by its slot, presses it, and opens the bubble', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await tapAt(250)
    expect(events).toEqual(['press 2 touch Mar', 'change 2 touch Mar'])
    expect(screen.getByText('1,100', { includeHiddenElements: true })).toBeTruthy()
    expect(plot().props.accessibilityValue).toEqual({
      text: 'Mar: Direct 1,100, Referral 600 (3 of 4)',
    })
  })

  test('moving the reading leaves the lines as they were drawn', async () => {
    await render(<Chart />)
    const before = shapes('RNSVGPath').map((one) => one.props.d)
    await tapAt(50)
    await tapAt(350)
    expect(shapes('RNSVGPath').map((one) => one.props.d)).toEqual(before)
  })

  test('the keys walk the readings, Down and Up the series of a reading, and Enter presses', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await key('ArrowRight')
    await key('ArrowRight')
    await key('ArrowDown')
    await key('ArrowDown')
    await key('Enter')
    expect(events).toEqual([
      'change 0 keyboard Jan',
      'change 1 keyboard Feb',
      'change 1 keyboard Feb Direct',
      'change 1 keyboard Feb Referral',
      'press 1 keyboard Feb Referral',
    ])
  })

  test('a screen reader adjusts the plot, which the latest readings describe', async () => {
    await render(<Chart />)
    expect(plot().props.accessibilityRole).toBe('adjustable')
    expect(plot().props.accessibilityHint).toBe(
      'Sessions by channel, Apr: Direct 1,400; Mar: Referral 600.',
    )
  })
})
