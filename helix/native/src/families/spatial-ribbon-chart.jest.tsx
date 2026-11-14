/*
 * The generated Spatial Ribbon Chart, drawn from its real intermediate form:
 * a table read by its id as ribbons, one for each series, in a box seen in
 * 3D, their faces in their colors, the words in place of the drawing, and the
 * reading a key moves, with the events it sends and the ring.
 * `test:native` writes the component beside this file.
 */
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useEffect } from 'react'
import { Dimensions } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { publishChartSource } from '../render/chart-sources'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import {
  HelixSpatialRibbonChart,
  type HelixSpatialRibbonChartProps,
} from './spatial-ribbon-chart/index.native'

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

const cell = (name: string, value: number | undefined) => ({
  name,
  text: value === undefined ? '' : `${value} ms`,
  ...(value === undefined ? {} : { value }),
})

/** Response times in two cities over three days, Wednesday's in Lima missing, under the id `latency`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('latency', {
        caption: 'Latency',
        rows: empty
          ? []
          : [
              { cells: [cell('Oslo', 40), cell('Lima', 60)], label: 'Mon' },
              { cells: [cell('Oslo', 30), cell('Lima', 50)], label: 'Tue' },
              { cells: [cell('Oslo', 70), cell('Lima', undefined)], label: 'Wed' },
            ],
      }),
    [empty],
  )
  return null
}

const Chart = ({
  blank = false,
  ...props
}: HelixSpatialRibbonChartProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixSpatialRibbonChart for="latency" {...props} />
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** The shapes a vector draws, by the component `react-native-svg`'s mock names. */
const shapes = (kind: string) => screen.root?.queryAll((node) => node.type === kind) ?? []

/** The faces of the ribbons, each a path that names the colors it is painted in. */
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

/** The path data of every face, in the order they are painted. */
const drawn = () =>
  faces()
    .map((one) => String(one.props.d))
    .join()

describe('the ribbons', () => {
  test('draws each series as a ribbon of faces, and the box’s names', async () => {
    await render(<Chart />)
    await layOut()
    /* Oslo's three readings: an end, two pieces of top, and its side. Lima's two: an end, one piece, and its side. */
    expect(faces().length).toBe(7)
    expect(words('Mon').length).toBeGreaterThan(0)
    expect(words('Lima').length).toBeGreaterThan(0)
  })

  test('each face is its series’ color, shaded by how far it turns from the light', async () => {
    await render(<Chart />)
    await layOut()
    const fills = new Set(faces().map((one) => JSON.stringify(one.props.fill)))
    expect(fills.size).toBeGreaterThan(2)
  })

  test('says it has no readings, in place of the drawing', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(shapes('RNSVGSvgView')).toHaveLength(0)
  })
})

describe('the reading', () => {
  test('the across arrows step a place and the others a series, and a place with no value says so', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    await key('ArrowRight')
    expect(plot().props.accessibilityValue?.text).toMatch(/^Mon, Oslo 40 ms/)
    await key('ArrowDown')
    expect(plot().props.accessibilityValue?.text).toMatch(/^Mon, Lima 60 ms/)
    await key('End')
    expect(plot().props.accessibilityValue?.text).toBe('Wed, Lima: no value')
    expect(events).toEqual([
      'change 0 keyboard Mon',
      'change 0 keyboard Mon',
      'change -1 keyboard Wed',
    ])
  })

  test('the reading the keys rest on is ringed', async () => {
    await render(<Chart />)
    await layOut()
    const ring = () =>
      shapes('RNSVGPath').filter(
        (one) => one.props.fillOpacity === undefined && /a/.test(String(one.props.d)),
      )
    expect(ring()).toHaveLength(0)
    await key('ArrowRight')
    expect(ring()).toHaveLength(1)
  })

  test('Shift with an arrow turns the view and moves no reading', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    const before = drawn()
    await key('ArrowRight', true)
    expect(drawn()).not.toBe(before)
    expect(events).toEqual([])
  })
})
