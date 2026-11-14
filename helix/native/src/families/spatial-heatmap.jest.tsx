/*
 * The generated Spatial Heatmap, drawn from its real intermediate form: a
 * table read by its id drawn as a relief of prisms core lays out, each top in
 * its reading's tone and its sides shaded from it, on a slab, the newest
 * whole columns a narrow strip keeps, the words in place of the drawing, the
 * reading a finger and a key move with the ring where the prism stands, the
 * view a drag and Shift with an arrow turn, and the first and last labels
 * placed under the front edge. `test:native` writes the component beside
 * this file.
 */
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useEffect } from 'react'
import { Dimensions, StyleSheet, Text } from 'react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils'
import { publishChartSource } from '../render/chart-sources'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import { HelixSpatialHeatmap, type HelixSpatialHeatmapProps } from './spatial-heatmap/index.native'

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

/** Fourteen days from June 1, 2026, each a count, under the id `days`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('days', {
        caption: 'Commits',
        rows: empty
          ? []
          : Array.from({ length: 14 }, (_, at) => ({
              cells: [{ name: 'Commits', text: String(at % 5), value: at % 5 }],
              label: `${at + 1} Jun`,
              when: `2026-06-${String(at + 1).padStart(2, '0')}`,
            })),
      }),
    [empty],
  )
  return null
}

const Chart = ({
  blank = false,
  ...props
}: HelixSpatialHeatmapProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixSpatialHeatmap
          for="days"
          rows={7}
          thresholds="1 2 3 4"
          tones="1 2 3 4 5"
          {...props}
        />
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** The shapes a vector draws, by the component `react-native-svg`'s mock names. */
const shapes = (kind: string) => screen.root?.queryAll((node) => node.type === kind) ?? []

/** Every face drawn, the slab's first, each a path with its paint. */
const faces = () => shapes('RNSVGPath').filter((one) => String(one.props.d ?? '') !== '')

/** The strip a screen reader reaches as one control. */
const strip = () => {
  const found = screen.root
    ?.queryAll((node) => typeof node.props.onAccessibilityAction === 'function')
    .find((node) => node.props.accessible === true)
  if (found === undefined) {
    throw new Error('no strip is drawn')
  }
  return found
}

/** The host laid out `width` points wide, which says how many columns fit and how wide the strip is. */
const hostWide = async (width: number) => {
  const host = screen.root?.queryAll(
    (node) =>
      typeof node.props.onLayout === 'function' &&
      (StyleSheet.flatten(node.props.style) as { alignItems?: string } | undefined)?.alignItems ===
        'flex-start',
  )[0]
  await act(async () => {
    fireEvent(host as never, 'layout', {
      nativeEvent: { layout: { height: 200, width, x: 0, y: 0 } },
    })
  })
}

/** The size the strip asks for, in points. */
const stripSize = () => {
  const style = StyleSheet.flatten(strip().props.style) as { height?: number; width?: number }
  return { height: Number(style.height ?? 0), width: Number(style.width ?? 0) }
}

/** The strip laid out at the size it asks for. */
const layOut = async () => {
  const { height, width } = stripSize()
  await act(async () => {
    fireEvent(strip(), 'layout', { nativeEvent: { layout: { height, width, x: 0, y: 0 } } })
  })
}

/** The press and the drag the strip's detector holds, the drag first. */
const gestures = (): readonly unknown[] => {
  type Fiber = {
    readonly memoizedProps?: { readonly gesture?: { readonly gestures?: readonly unknown[] } }
    readonly return: Fiber | null
  }
  for (let fiber = strip().unstable_fiber as Fiber | null; fiber !== null; fiber = fiber.return) {
    const found = fiber.memoizedProps?.gesture?.gestures
    if (found !== undefined) {
      return found
    }
  }
  return []
}

/** A key pressed on the strip, as a hardware keyboard sends it, with Shift where asked. */
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

/** The path data of every face, in the order they are painted. */
const drawn = () =>
  faces()
    .map((one) => String(one.props.d))
    .join()

/** How many faces draw the thick edge. */
const thick = () => faces().filter((one) => Number(one.props.strokeWidth) === 2).length

describe('the relief', () => {
  test('draws the slab and each reading as a prism, its top in its tone and its sides shaded from it', async () => {
    await render(<Chart />)
    await hostWide(390)
    const all = faces()
    /* The slab's three faces, then each prism's sides and top; a day of 0 stands as a tile. */
    expect(all.length).toBeGreaterThan(3 + 14)
    expect(all.length).toBeLessThanOrEqual(3 + 14 * 3)
    const fills = new Set(all.map((one) => JSON.stringify(one.props.fill)))
    expect(fills.size).toBeGreaterThan(6)
    expect(shapes('RNSVGSvgView')).toHaveLength(1)
  })

  test('the strip is as wide as its cells at 30 degrees, and never wider than its box', async () => {
    await render(<Chart />)
    await hostWide(390)
    /* Two columns and seven rows, 0.866 of a 20 point cell each. */
    expect(stripSize().width).toBeCloseTo(9 * 0.866 * 20, 1)
    expect(stripSize().height).toBeGreaterThan(0)
    await hostWide(100)
    expect(stripSize().width).toBeLessThanOrEqual(100)
  })

  test('draws the newest whole columns that fit a narrow strip', async () => {
    await render(<Chart flat />)
    await hostWide(390)
    const wide = faces().length
    /* 70 points over 0.866, less seven rows of 12 and a gap, leaves room for one column. */
    await hostWide(70)
    expect(faces().length).toBeLessThan(wide)
  })

  test('says it has no readings, in place of the drawing', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(shapes('RNSVGSvgView')).toHaveLength(0)
  })

  test('places the first and last labels once they are measured', async () => {
    await render(<Chart end={<Text>Jun 14</Text>} start={<Text>Jun 1</Text>} />)
    await hostWide(390)
    const label = (words: string) => {
      let node = screen.getByText(words).parent
      while (node && typeof node.props.onLayout !== 'function') {
        node = node.parent
      }
      return node
    }
    for (const [words, width] of [
      ['Jun 1', 30],
      ['Jun 14', 36],
    ] as const) {
      await act(async () => {
        fireEvent(label(words) as never, 'layout', {
          nativeEvent: { layout: { height: 16, width, x: 0, y: 0 } },
        })
      })
    }
    const placed = (words: string) =>
      StyleSheet.flatten(label(words)?.props.style) as { left?: number; top?: number }
    /* The first under the left corner, the last under the bottom one, to its right. */
    expect(Number(placed('Jun 14').left)).toBeGreaterThan(Number(placed('Jun 1').left))
    expect(Number(placed('Jun 14').left) + 36).toBeLessThanOrEqual(stripSize().width + 0.5)
  })
})

describe('the reading', () => {
  test('the keys walk a day down and a week across, and ring the prism where it stands', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await hostWide(390)
    const count = faces().length
    expect(thick()).toBe(0)
    await key('ArrowDown')
    await key('ArrowRight')
    expect(events).toEqual(['change 0 keyboard 1 Jun', 'change 7 keyboard 8 Jun'])
    expect(strip().props.accessibilityValue?.text).toMatch(/^8 Jun/)
    /* Nothing is drawn again: the prism's own faces take the thicker edge. */
    expect(faces().length).toBe(count)
    expect(thick()).toBeGreaterThan(0)
  })

  test('a tap on a prism reads that prism and presses it', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await hostWide(390)
    await layOut()
    const { height, width } = stripSize()
    /* The middle of the front prism's top face, painted last, in points. */
    const svg = shapes('RNSVGSvgView')[0]?.props
    const corners = [...String(faces().at(-1)?.props.d).matchAll(/(-?[0-9.]+) (-?[0-9.]+)/g)]
    const middle = (axis: 1 | 2) =>
      corners.reduce((sum, pair) => sum + Number(pair[axis]), 0) / corners.length
    const x = ((middle(1) - svg?.minX) / svg?.vbWidth) * width
    const y = ((middle(2) - svg?.minY) / svg?.vbHeight) * height
    await act(async () => {
      fireGestureHandler(gestures()[1] as never, [
        { state: State.BEGAN, x, y },
        { state: State.ACTIVE, x, y },
        { state: State.END, x, y },
      ])
    })
    /* The front prism is the newest day. */
    expect(events).toEqual(['press 13 touch 14 Jun', 'change 13 touch 14 Jun'])
  })

  test('Shift with an arrow turns the view and moves no reading', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await hostWide(390)
    const before = drawn()
    await key('ArrowRight', true)
    expect(drawn()).not.toBe(before)
    expect(events).toEqual([])
  })

  test('under multiple selection, Shift with an arrow selects and turns nothing', async () => {
    await render(<Chart selectionMode="multiple" />)
    await hostWide(390)
    await key('ArrowDown')
    await key('Enter')
    const before = drawn()
    await key('ArrowDown', true)
    expect(drawn()).toBe(before)
    /* The two days selected draw dashed edges. */
    const dashed = faces().filter((one) => one.props.strokeDasharray !== undefined)
    expect(dashed.length).toBeGreaterThan(0)
  })
})
