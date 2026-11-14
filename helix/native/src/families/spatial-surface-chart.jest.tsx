/*
 * The generated Spatial Surface Chart, drawn from its real intermediate form:
 * a table read by its id as a grid of heights in a box seen in 3D, each
 * square a face in its height's color, the contour lines across it, the words
 * in place of the drawing, and the reading a key moves, with the events it
 * sends and the ring. `test:native` writes the component beside this file.
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
  HelixSpatialSurfaceChart,
  type HelixSpatialSurfaceChartProps,
} from './spatial-surface-chart/index.native'

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

/** Load by hour and by day, two days of three hours, the last hour of the second day missing, under the id `load`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('load', {
        caption: 'Load',
        rows: empty
          ? []
          : [
              { cells: [cell('Hour', 0), cell('Day', 0), cell('Load', 10)], label: 'Mon 0h' },
              { cells: [cell('Hour', 0), cell('Day', 1), cell('Load', 40)], label: 'Tue 0h' },
              { cells: [cell('Hour', 1), cell('Day', 0), cell('Load', 30)], label: 'Mon 1h' },
              { cells: [cell('Hour', 1), cell('Day', 1), cell('Load', 50)], label: 'Tue 1h' },
              { cells: [cell('Hour', 2), cell('Day', 0), cell('Load', 20)], label: 'Mon 2h' },
            ],
      }),
    [empty],
  )
  return null
}

const Chart = ({
  blank = false,
  ...props
}: HelixSpatialSurfaceChartProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixSpatialSurfaceChart for="load" {...props} />
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** The shapes a vector draws, by the component `react-native-svg`'s mock names. */
const shapes = (kind: string) => screen.root?.queryAll((node) => node.type === kind) ?? []

/** The faces of the surface, each a path that names the colors it is painted in. */
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

describe('the surface', () => {
  test('draws each square between its readings as a face, a triangle where a corner is missing, and the box’s names', async () => {
    await render(<Chart />)
    await layOut()
    expect(faces().length).toBe(2)
    expect(words('Hour').length).toBeGreaterThan(0)
    expect(words('Load').length).toBeGreaterThan(0)
  })

  test('each face is its height’s color on the ramp, and contour lines cross the faces under `contours`', async () => {
    await render(<Chart contours />)
    await layOut()
    const fills = new Set(faces().map((one) => JSON.stringify(one.props.fill)))
    expect(fills.size).toBe(2)
    const lines = shapes('RNSVGPath').filter(
      (one) => one.props.fillOpacity === undefined && /^M[^Z]*L/.test(String(one.props.d)),
    )
    expect(lines.length).toBeGreaterThan(0)
  })

  test('says it has no readings, in place of the drawing', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(shapes('RNSVGSvgView')).toHaveLength(0)
  })
})

describe('the reading', () => {
  test('the across arrows step across and the others in depth, and a place with no reading says so', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    await key('ArrowRight')
    expect(plot().props.accessibilityValue?.text).toMatch(/^Mon 0h/)
    await key('ArrowDown')
    expect(plot().props.accessibilityValue?.text).toMatch(/^Tue 0h/)
    await key('End')
    expect(plot().props.accessibilityValue?.text).toBe('Hour 2, Day 1: no reading')
    expect(events).toEqual([
      'change 0 keyboard Mon 0h',
      'change 1 keyboard Tue 0h',
      'change -1 keyboard ',
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
