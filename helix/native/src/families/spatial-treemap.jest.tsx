/*
 * The generated Spatial Treemap, drawn from its real intermediate form: a
 * table read by its id as blocks on a floor in a box seen in 3D, each face in
 * its group's color, the words in place of the drawing, and the reading a key
 * moves, with the events it sends and the ring. `test:native` writes the
 * component beside this file.
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
import { HelixSpatialTreemap, type HelixSpatialTreemapProps } from './spatial-treemap/index.native'

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
const word = (name: string, text: string) => ({ name, text })

/** Four services by requests and response time, two in each region, under the id `services`. */
const Table = ({ empty = false }: { readonly empty?: boolean }) => {
  useEffect(
    () =>
      publishChartSource('services', {
        caption: 'Services',
        rows: empty
          ? []
          : [
              {
                cells: [word('Region', 'East'), cell('Requests', 400), cell('Time', 120)],
                label: 'Search',
              },
              {
                cells: [word('Region', 'West'), cell('Requests', 250), cell('Time', 80)],
                label: 'Cart',
              },
              {
                cells: [word('Region', 'East'), cell('Requests', 150), cell('Time', 40)],
                label: 'Login',
              },
              {
                cells: [word('Region', 'West'), cell('Requests', 100), cell('Time', 200)],
                label: 'Feed',
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
}: HelixSpatialTreemapProps & { readonly blank?: boolean }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Table empty={blank} />
        <HelixSpatialTreemap for="services" {...props} />
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** The shapes a vector draws, by the component `react-native-svg`'s mock names. */
const shapes = (kind: string) => screen.root?.queryAll((node) => node.type === kind) ?? []

/** The faces of the blocks, each a path that names the colors it is painted in. */
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

/** The path data of every face, in the order they are painted. */
const drawn = () =>
  faces()
    .map((one) => String(one.props.d))
    .join()

describe('the blocks', () => {
  test('draws each item as a block of faces, and its box', async () => {
    await render(<Chart />)
    await layOut()
    /* Four blocks, each its top and the two sides the camera sees. */
    expect(faces().length).toBe(12)
    expect(words('Time').length).toBeGreaterThan(0)
  })

  test('a block takes its group’s color', async () => {
    await render(<Chart groupBy="Region" />)
    await layOut()
    const fills = new Set(faces().map((one) => JSON.stringify(one.props.fill)))
    expect(fills.size).toBeGreaterThanOrEqual(6)
  })

  test('says it has no readings, in place of the drawing', async () => {
    await render(<Chart blank />)
    expect(screen.getByText('No readings')).toBeTruthy()
    expect(shapes('RNSVGSvgView')).toHaveLength(0)
  })
})

describe('the reading', () => {
  test('the arrows walk the blocks in the table’s order', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    await key('ArrowRight')
    expect(plot().props.accessibilityValue?.text).toMatch(/^Search/)
    await key('ArrowRight')
    expect(plot().props.accessibilityValue?.text).toMatch(/^Cart/)
    await key('End')
    expect(plot().props.accessibilityValue?.text).toMatch(/^Feed/)
    expect(events).toEqual([
      'change 0 keyboard Search',
      'change 1 keyboard Cart',
      'change 3 keyboard Feed',
    ])
  })

  test('the block the keys rest on is ringed after it, and outlined again over every block', async () => {
    await render(<Chart />)
    await layOut()
    /* The ring and its faint outline draw the same path; nothing else does. */
    const twice = () => {
      const lines = shapes('RNSVGPath')
        .filter((one) => one.props.fillOpacity === undefined && String(one.props.d) !== '')
        .map((one) => String(one.props.d))
      return lines.filter((one, at) => lines.indexOf(one) !== at)
    }
    expect(twice()).toHaveLength(0)
    await key('ArrowRight')
    expect(twice()).toHaveLength(1)
  })

  test('a tap on a block reads that block', async () => {
    const { events, props } = heard()
    await render(<Chart {...props} />)
    await layOut()
    await act(async () => {
      fireGestureHandler(gestures()[1] as never, [
        { state: State.BEGAN, x: 216, y: 230 },
        { state: State.ACTIVE, x: 216, y: 230 },
        { state: State.END, x: 216, y: 230 },
      ])
    })
    expect(events.some((one) => one.startsWith('press '))).toBe(true)
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
