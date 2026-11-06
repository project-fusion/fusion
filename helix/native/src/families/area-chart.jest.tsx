/*
 * The generated Area Chart, drawn from its real intermediate form: the parts
 * of a table read by its id stacked into bands, the widest first, a part a
 * legend hid closed over, shares and overlap, the rules and the numbers of the
 * scale, the words in place of the drawing while there is nothing to draw,
 * and the reading a finger, a key, and a screen reader move, with the events
 * each move sends and the bubble with its total it opens.
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
import { HelixAreaChart, type HelixAreaChartProps } from './area-chart/index.native'

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
  hideChartSeries('plans', [])
})

const cell = (name: string, value: number) => ({ name, text: value.toLocaleString('en'), value })

/** Two plans over four months, under the id `plans`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('plans', {
        caption: 'Seats by plan',
        rows: empty
          ? []
          : [
              { cells: [cell('Team', 30), cell('Business', 10)], label: 'Jan' },
              { cells: [cell('Team', 40), cell('Business', 20)], label: 'Feb' },
              { cells: [cell('Team', 50), cell('Business', 30)], label: 'Mar' },
              { cells: [cell('Team', 60), cell('Business', 40)], label: 'Apr' },
            ],
      }),
    [empty],
  )
  return null
}

const Chart = ({ blank = false, ...props }: HelixAreaChartProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixAreaChart for="plans" {...props} />
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

/* With no scale drawn and no rules, so the top total meets the top edge. Drawn by default,
   either one gives the peak room above it, as the web's element does. */
const Bare = (props: HelixAreaChartProps) => <Chart gridlines="none" valueAxis="none" {...props} />

describe('the bands', () => {
  test('stacks the parts from zero, the widest band first, each an edge and everything under it', async () => {
    await render(<Bare />)
    /* Business on Team, to 100 at April; Team alone to 60. */
    expect(paths().slice(0, 4)).toEqual([
      'M12.5,60L37.5,40L62.5,20L87.5,0L87.5,100L12.5,100Z',
      'M12.5,60L37.5,40L62.5,20L87.5,0',
      'M12.5,70L37.5,60L62.5,50L87.5,40L87.5,100L12.5,100Z',
      'M12.5,70L37.5,60L62.5,50L87.5,40',
    ])
    expect(paths()).toContain('M0,100L100,100')
  })

  test('draws each reading as a whole under share, and each part from zero under overlap', async () => {
    const { rerender } = await render(<Bare share />)
    expect(paths()[1]).toBe('M12.5,0L37.5,0L62.5,0L87.5,0')
    await rerender(<Bare overlap />)
    expect(paths()[1]).toBe('M12.5,83.33L37.5,66.67L62.5,50L87.5,33.33')
  })

  test('closes a part a legend hid, and fits the scale to the rest', async () => {
    await render(<Bare />)
    await act(async () => {
      hideChartSeries('plans', ['Team'])
    })
    expect(paths()[1]).toBe('M12.5,75L37.5,50L62.5,25L87.5,0')
  })

  test('writes the numbers of the scale beside the plot, shares under share', async () => {
    await render(<Chart share />)
    for (const number of ['20%', '100%']) {
      expect(screen.getByText(number, { includeHiddenElements: true })).toBeTruthy()
    }
  })

  test('says it has no readings, in place of the drawing', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(shapes('RNSVGSvgView')).toHaveLength(0)
  })
})

describe('the reading', () => {
  test('a tap finds the reading by its slot, presses it, and opens the bubble with the total', async () => {
    const { events, props } = heard()
    /* No scale, whose numbers would say 60 too. */
    await render(<Bare {...props} />)
    await tapAt(150)
    expect(events).toEqual(['press 1 touch Feb', 'change 1 touch Feb'])
    expect(screen.getByText('60', { includeHiddenElements: true })).toBeTruthy()
    expect(plot().props.accessibilityValue).toEqual({
      text: 'Feb: Team 40, Business 20, Total 60 (2 of 4)',
    })
  })

  test('the keys walk the readings and the parts of a reading', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await key('ArrowRight')
    await key('ArrowDown')
    await key('End')
    expect(events).toEqual([
      'change 0 keyboard Jan',
      'change 0 keyboard Jan Team',
      'change 3 keyboard Apr Team',
    ])
  })

  test('a screen reader adjusts the plot, which the latest total and shares describe', async () => {
    await render(<Chart />)
    expect(plot().props.accessibilityHint).toBe(
      'Seats by plan, Apr: Total 100; Team 60%, Business 40%.',
    )
  })
})
