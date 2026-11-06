/*
 * The generated Donut Chart, drawn from its real intermediate form: the ring
 * core draws from a table's rows by its id, each slice an arc already turned,
 * a slice a legend hid closed over, the words in place of the ring while there
 * is nothing to draw, and the slice a finger finds by its angle, a key, and a
 * screen reader move, with the events each move sends and the bubble it opens.
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
import { HelixDonutChart, type HelixDonutChartProps } from './donut-chart/index.native'

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
  hideChartSeries('traffic', [])
})

/** A table that publishes four sources of sessions under the id `traffic`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('traffic', {
        caption: 'Sessions by source',
        rows: empty
          ? []
          : [
              { cells: [{ name: 'Share', text: '4,200', value: 4200 }], label: 'Direct' },
              { cells: [{ name: 'Share', text: '3,100', value: 3100 }], label: 'Search' },
              { cells: [{ name: 'Share', text: '1,800', value: 1800 }], label: 'Referral' },
              { cells: [{ name: 'Share', text: '900', value: 900 }], label: 'Social' },
            ],
      }),
    [empty],
  )
  return null
}

const Donut = ({
  blank = false,
  ...props
}: HelixDonutChartProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixDonutChart for="traffic" {...props} />
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** The shapes a vector draws, by the component `react-native-svg`'s mock names. */
const shapes = (kind: string) => screen.root?.queryAll((node) => node.type === kind) ?? []

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

/** Lays the plot out 200 points square. */
const lay = () =>
  act(async () => {
    fireEvent(plot(), 'layout', {
      nativeEvent: { layout: { height: 200, width: 200, x: 0, y: 0 } },
    })
  })

/** A tap on the plot at `x`, `y` points. */
const tapAt = async (x: number, y: number) => {
  await lay()
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

/** Each reading event a handler heard, with its row and what moved it. */
const heard = () => {
  const events: string[] = []
  const take =
    (name: string) =>
    (event: { detail: { index: number; label: string; pointerType: string } }) => {
      events.push(
        `${name} ${event.detail.index} ${event.detail.pointerType} ${event.detail.label}`.trim(),
      )
    }
  return { events, props: { onReadingChange: take('change'), onReadingPress: take('press') } }
}

describe('the ring', () => {
  test('draws the track and a slice for each row, each an arc from twelve o’clock', async () => {
    await render(<Donut />)
    const paths = shapes('RNSVGPath').map((one) => String(one.props.d))
    /* The track, then each slice's arc and its wedge, which draws nothing until `outlined`.
       Each slice stops half a seam short of twelve and of the next, as the web's do. */
    expect(paths[0]?.startsWith('M 50.000 18.000 A 32 32 0 0 1')).toBe(true)
    expect(paths[1]).toBe('M 50.400 18.002 A 32 32 0 0 1 65.765 77.847')
    expect(paths.filter((d) => d.startsWith('M'))).toHaveLength(5)
  })

  test('crops a half ring to the band it draws', async () => {
    await render(<Donut sweep="half" />)
    expect(shapes('RNSVGSvgView')[0]?.props.vbHeight).toBe(48)
  })

  test('closes over a slice a legend hid on the same table', async () => {
    await render(<Donut />)
    await act(async () => {
      hideChartSeries('traffic', ['Direct'])
    })
    const arcs = shapes('RNSVGPath').map((one) => String(one.props.d))
    /* Direct draws nothing, and Search starts at twelve now, past six. */
    expect(arcs[1]).toBe('')
    expect(arcs[3]?.startsWith('M 50.400 18.002 A 32 32 0 1 1 ')).toBe(true)
  })

  test('says it has no readings, in place of the ring', async () => {
    await render(<Donut blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(shapes('RNSVGSvgView')).toHaveLength(0)
  })

  test('says it is loading while loading is set and nothing is drawn', async () => {
    await render(<Donut blank loading />)
    expect(screen.getByText('Loading readings')).toBeTruthy()
  })

  test('writes each share on its slice under slice-labels', async () => {
    await render(<Donut sliceLabels />)
    for (const share of ['42%', '31%', '18%', '9%']) {
      expect(screen.getByText(share, { includeHiddenElements: true })).toBeTruthy()
    }
  })
})

describe('the reading', () => {
  test('a tap finds the slice by its angle, presses it, and opens the bubble', async () => {
    const { events, props } = heard()
    await render(<Donut {...props} />)
    /* Above and left of the middle, on the band: Referral, from about eight to eleven. */
    await tapAt(42, 73)
    expect(events).toEqual(['press 2 touch Referral', 'change 2 touch Referral'])
    expect(screen.getByText('1,800 (18%)', { includeHiddenElements: true })).toBeTruthy()
    expect(plot().props.accessibilityValue).toEqual({
      text: 'Referral: Share 1,800 (18%) (3 of 4)',
    })
  })

  test('a tap in the hole finds no slice', async () => {
    const { events, props } = heard()
    await render(<Donut {...props} />)
    await tapAt(100, 100)
    expect(events).toEqual([])
  })

  test('the keys walk the slices drawn, pass over a hidden one, and Enter presses', async () => {
    const { events, props } = heard()
    await render(<Donut {...props} />)
    await act(async () => {
      hideChartSeries('traffic', ['Search'])
    })
    await key('ArrowRight')
    await key('ArrowDown')
    await key('Enter')
    expect(events).toEqual([
      'change 0 keyboard Direct',
      'change 2 keyboard Referral',
      'press 2 keyboard Referral',
    ])
  })

  test('a screen reader adjusts the plot, which the shares describe', async () => {
    await render(<Donut />)
    expect(plot().props.accessibilityRole).toBe('adjustable')
    expect(plot().props.accessibilityHint).toBe(
      'Sessions by source: Direct 42%, Search 31%, Referral 18%, Social 9%.',
    )
  })
})
