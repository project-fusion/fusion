/*
 * The generated Map, drawn from its real intermediate form: the still
 * picture of the frame's own shapes where the app carries no MapLibre
 * Native, the controls that move the view and say where it went, a marker's
 * press, the list of layers a screen reader reads, the layers menu, and
 * MapLibre Native's map where the app carries it. `test:native` writes the
 * component beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setRenderer } from '@fusion.dev/helix-core/capabilities/renderer'
import { fakeRenderer } from '@fusion.dev/helix-core/capabilities/renderer/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createElement, forwardRef, type ReactNode, useImperativeHandle } from 'react'
import { Text, TurboModuleRegistry } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { absoluteUrl, setBaseUrl } from '../capabilities/base-url'
import { forgetMapLibre } from '../capabilities/renderer'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import { HelixMap, HelixMapMarker, type HelixMapProps } from './map/index.native'

/** A layer, as the gallery's tag writes one: a component the frame finds by its tag. */
const Route = Object.assign((_: Readonly<Record<string, unknown>>) => null, {
  tag: 'helix-map-route',
})

/** A raster layer, as the gallery's tag writes one. */
const Raster = Object.assign((_: Readonly<Record<string, unknown>>) => null, {
  tag: 'helix-map-raster',
})

const RADAR = '/maps/radar/0/{z}/{x}/{y}.png'

/** The tiles every source of the style MapLibre was handed asks for. */
const tilesOf = () =>
  Object.values((styled?.sources ?? {}) as Record<string, { tiles?: string[] }>).flatMap(
    (source) => source.tiles ?? [],
  )

const WALK = [
  { lat: 30.2746, lng: -97.7406 },
  { lat: 30.27, lng: -97.7313 },
  { lat: 30.2603, lng: -97.7392 },
]

const Frame = (props: Partial<HelixMapProps> & { readonly extra?: ReactNode }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <HelixMap label="Walking route in Austin" {...props}>
          <Route description="From the Capitol" group="walk" label="Walking route" points={WALK} />
          <HelixMapMarker label="Texas Capitol" lat={30.2747} lng={-97.7405} name="capitol" />
          {props.extra}
        </HelixMap>
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** Every view laid out at once, as the viewport is measured. */
const layOut = async () => {
  await act(async () => {
    for (const node of screen.root?.queryAll((one) => typeof one.props.onLayout === 'function') ??
      []) {
      await fireEvent(node, 'layout', {
        nativeEvent: { layout: { height: 300, width: 360, x: 0, y: 0 } },
      })
    }
  })
}

const paths = () => screen.root?.queryAll((node) => node.type === 'RNSVGPath') ?? []

const press = async (label: string) => {
  /* The button of that name: the layers toggle, and not the menu or the list it names. */
  const [button] = screen
    .getAllByLabelText(label, { includeHiddenElements: true })
    .filter((node) => node.props.accessibilityRole === 'button')
  await act(async () => fireEvent.press(button ?? screen.getByLabelText(label)))
}

let announced: FakeAnnounce

/** What the first event a handler heard carried. */
const detailOf = (heard: { mock: { calls: unknown[][] } }): unknown =>
  (heard.mock.calls[0]?.[0] as { detail?: unknown } | undefined)?.detail

/** What a screen reader heard, in order. */
const live = () => announced.said.map((one) => one.message.trim())

beforeEach(() => {
  announced = fakeAnnounce()
  setAnnounce(announced)
  setRenderer(fakeRenderer([]))
  forgetMapLibre()
})

describe('Map on a phone without MapLibre Native', () => {
  test('draws nothing that depends on the width before the box is measured, then the still picture', async () => {
    await render(<Frame />)
    const needle = paths().length
    expect(screen.root?.queryAll((node) => node.type === 'RNSVGRect')).toHaveLength(0)
    await layOut()
    /* The land, then the route's edge and its line, beside the needle's two halves. */
    expect(screen.root?.queryAll((node) => node.type === 'RNSVGRect')).toHaveLength(1)
    expect(paths().length).toBe(needle + 2)
    expect(screen.getByText('OpenFreeMap © OpenMapTiles Data from OpenStreetMap')).toBeTruthy()
  })

  test("keeps the page's own credit where it wrote one", async () => {
    await render(<Frame attribution={<Text>© OpenStreetMap contributors</Text>} />)
    await layOut()
    expect(screen.queryByText('OpenFreeMap © OpenMapTiles Data from OpenStreetMap')).toBeNull()
  })

  test('names each shown layer for a screen reader, with its description', async () => {
    await render(<Frame />)
    await layOut()
    expect(screen.getByText('Walking route, From the Capitol')).toBeTruthy()
  })

  test('a zoom control zooms a step, tells the page, and says the level', async () => {
    const zoomed = jest.fn()
    await render(<Frame onMapZoom={zoomed} />)
    await layOut()
    await press('Zoom in')
    expect(zoomed).toHaveBeenCalledTimes(1)
    expect(detailOf(zoomed)).toEqual({ by: 1 })
    expect(live().at(-1)).toMatch(/^Zoom level \d+$/)
  })

  test('a pan control moves the view by a share of the box, and says which way', async () => {
    const panned = jest.fn()
    await render(<Frame controls="pan zoom" onMapPan={panned} />)
    await layOut()
    await press('Pan up')
    expect(detailOf(panned)).toEqual({
      by: 0.25,
      to: 'up',
    })
    expect(live().at(-1)).toBe('Moved up')
  })

  test('the compass turns the map back to north and says so', async () => {
    const rotated = jest.fn()
    await render(<Frame controls="rotate zoom" onMapRotate={rotated} />)
    await layOut()
    await press('Rotate right')
    expect(live().at(-1)).toBe('Facing 15 degrees')
    await press('Face north')
    expect(live().at(-1)).toBe('Facing north')
    expect(rotated).toHaveBeenCalledTimes(2)
  })

  test("a marker's press sends activate from the frame with its name", async () => {
    const activated = jest.fn()
    await render(<Frame onActivate={activated} />)
    await layOut()
    await press('Texas Capitol')
    expect(detailOf(activated)).toEqual({
      value: 'capitol',
    })
  })

  test("the layers menu's tile hides the route, and the list stops naming it", async () => {
    await render(<Frame controls="layers zoom" />)
    await layOut()
    await press('Map layers')
    await press('Walking route')
    expect(screen.queryByText('Walking route, From the Capitol')).toBeNull()
    await press('Walking route')
    expect(screen.getByText('Walking route, From the Capitol')).toBeTruthy()
  })
})

/** What MapLibre Native's camera was asked to ease to, and the style its map was given. */
const eased: unknown[] = []
let styled: Record<string, unknown> | undefined

/** MapLibre Native's camera, as a spec stands it in: it writes down each move. */
const MockCamera = forwardRef((_: unknown, ref) => {
  useImperativeHandle(ref, () => ({
    easeTo: (stop: unknown) => eased.push(stop),
    jumpTo: () => undefined,
  }))
  return null
})

/** MapLibre Native's map, as a spec stands it in: it keeps its style. */
const MockMap = (props: { children?: ReactNode; mapStyle: Record<string, unknown> }) => {
  styled = props.mapStyle
  return createElement('MLRNMapView', null, props.children)
}

describe('Map on a phone with MapLibre Native', () => {
  beforeEach(() => {
    eased.length = 0
    styled = undefined
    jest
      .spyOn(TurboModuleRegistry, 'get')
      .mockImplementation(((name: string) => (name === 'MLRNLogModule' ? {} : null)) as never)
    jest.doMock(
      '@maplibre/maplibre-react-native',
      () => ({
        Camera: MockCamera,
        Map: MockMap,
      }),
      { virtual: true },
    )
    setRenderer(fakeRenderer(['map']))
    forgetMapLibre()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    setBaseUrl(undefined)
  })

  test('draws MapLibre in the themed style with the route in it, and no still picture', async () => {
    await render(<Frame />)
    await layOut()
    expect(screen.root?.queryAll((node) => node.type === 'MLRNMapView')).toHaveLength(1)
    expect(screen.root?.queryAll((node) => node.type === 'RNSVGRect')).toHaveLength(0)
    const sources = (styled?.sources ?? {}) as Record<string, unknown>
    expect(Object.keys(sources)).toContain('helix-layers')
  })

  test("a renderer's box the page passes in is the web's, and draws nothing over the map", async () => {
    await render(<Frame extra={<Text>Map stand-in</Text>} />)
    await layOut()
    expect(screen.queryByText('Map stand-in', { includeHiddenElements: true })).toBeNull()
    expect(screen.getByLabelText('Texas Capitol')).toBeTruthy()
  })

  test('a relative tile source resolves against the base URL the app sets', async () => {
    setBaseUrl('https://example.com/app/')
    await render(<Frame extra={<Raster frames={[RADAR]} label="Weather radar" />} />)
    await layOut()
    await act(async () => undefined)
    expect(tilesOf()).toContain('https://example.com/maps/radar/0/{z}/{x}/{y}.png')
  })

  test('a relative tile source is left out where the app sets no base URL', async () => {
    await render(<Frame extra={<Raster frames={[RADAR]} label="Weather radar" />} />)
    await layOut()
    await act(async () => undefined)
    expect(tilesOf().some((tile) => tile.includes('/maps/radar/'))).toBe(false)
  })

  test('a control moves the camera over the page’s pace', async () => {
    await render(<Frame />)
    await layOut()
    await press('Zoom in')
    expect(eased).toHaveLength(1)
    expect(eased[0]).toMatchObject({ duration: 200 })
  })
})

describe('absoluteUrl', () => {
  test('resolves an address as a page does, and gives none without a base', () => {
    expect(absoluteUrl('https://a.test/x.png', undefined)).toBe('https://a.test/x.png')
    expect(absoluteUrl('/t/{z}.png', 'https://site.test/app/page')).toBe(
      'https://site.test/t/{z}.png',
    )
    expect(absoluteUrl('t/{z}.png', 'https://site.test/app/page')).toBe(
      'https://site.test/app/t/{z}.png',
    )
    expect(absoluteUrl('//cdn.test/t.png', 'https://site.test')).toBe('https://cdn.test/t.png')
    expect(absoluteUrl('/t.png', undefined)).toBeUndefined()
  })
})
