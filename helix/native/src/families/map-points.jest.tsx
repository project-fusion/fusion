/*
 * The generated Map's still picture past its own shapes: the streets, water
 * and land it draws from the style's vector tiles, a points layer that
 * clusters as MapLibre's counts, and a tap on a dot or a count doing what a
 * click does on the web's renderer. `test:native` writes the component
 * beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setRenderer } from '@fusion.dev/helix-core/capabilities/renderer'
import { fakeRenderer } from '@fusion.dev/helix-core/capabilities/renderer/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { type MapTileFetch, setMapTileFetch } from '../capabilities/map-tiles'
import { forgetMapLibre } from '../capabilities/renderer'
import { MAP_STILL } from '../machines/map'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import { HelixMap, HelixMapPoints, type HelixMapProps } from './map/index.native'
import { answerOf, WATER_TILE } from './map-tiles.fixtures'

/** Three places a few meters apart near the Capitol, and one across the river. */
const NEAR = [
  { id: 'a', label: 'Capitol steps', lat: 30.2747, lng: -97.7405 },
  { id: 'b', label: 'Capitol lawn', lat: 30.27472, lng: -97.74052 },
  { id: 'c', label: 'Capitol gate', lat: 30.27468, lng: -97.74048 },
  { id: 'd', label: 'South Congress', lat: 30.2475, lng: -97.7502 },
]

const Frame = (
  props: Partial<HelixMapProps> & { readonly children?: ReactNode; readonly view?: string },
) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <HelixMap label="Places in Austin" {...props} />
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

/** The button of that name. */
const button = (label: string) => {
  const [found] = screen
    .getAllByLabelText(label, { includeHiddenElements: true })
    .filter((node) => node.props.accessibilityRole === 'button')
  if (found === undefined) {
    throw new Error(`no button named ${label}`)
  }
  return found
}

/** Where a place's or a count's button stands its middle, in the map's box. */
const middleOf = (label: string, side: number): [number, number] => {
  const style = StyleSheet.flatten(button(label).props.style) as { left?: unknown; top?: unknown }
  return [Number(style.left) + side / 2, Number(style.top) + side / 2]
}

/** A tap on the still picture at a point of the map's box. */
const tapAt = async ([x, y]: [number, number]) => {
  await act(async () =>
    fireEvent.press(screen.getByTestId(MAP_STILL, { includeHiddenElements: true }), {
      nativeEvent: { locationX: x, locationY: y },
    }),
  )
}

/**
 * The tiles' water the still picture draws: a tile of the hand-written
 * kind is one square of water, 512 points a side at zoom 12.
 */
const water = () =>
  (screen.root?.queryAll((node) => node.type === 'RNSVGPath') ?? []).filter((node) =>
    /^M-?\d+ -?\d+l512 0l0 512l-512 0l0 -512z/.test(String(node.props.d)),
  )

/** What the first event a handler heard carried. */
const detailOf = (heard: { mock: { calls: unknown[][] } }): unknown =>
  (heard.mock.calls[0]?.[0] as { detail?: unknown } | undefined)?.detail

let announced: FakeAnnounce

beforeEach(() => {
  announced = fakeAnnounce()
  setAnnounce(announced)
  setRenderer(fakeRenderer([]))
  forgetMapLibre()
})

afterEach(() => {
  setMapTileFetch(undefined)
})

describe('a points layer on a phone without MapLibre Native', () => {
  test('a press on a place sends activate from the layer with its id, and none from the frame', async () => {
    const framed = jest.fn()
    const pointed = jest.fn()
    await render(
      <Frame onActivate={framed} view="30.261,-97.741,12">
        <HelixMapPoints data={NEAR} label="Stops" onActivate={pointed} />
      </Frame>,
    )
    await layOut()
    await act(async () => fireEvent.press(button('South Congress')))
    expect(detailOf(pointed)).toEqual({ value: 'd' })
    expect(framed).not.toHaveBeenCalled()
  })

  test('a tap on a dot sends activate from the layer, as a click on the web renderer does', async () => {
    const pointed = jest.fn()
    await render(
      <Frame view="30.261,-97.741,12">
        <HelixMapPoints data={NEAR} label="Stops" onActivate={pointed} />
      </Frame>,
    )
    await layOut()
    const [x, y] = middleOf('South Congress', 32)
    await tapAt([x + 4, y - 3])
    expect(detailOf(pointed)).toEqual({ value: 'd' })
  })

  test('a tap away from every dot sends nothing', async () => {
    const pointed = jest.fn()
    await render(
      <Frame view="30.261,-97.741,12">
        <HelixMapPoints data={NEAR} label="Stops" onActivate={pointed} />
      </Frame>,
    )
    await layOut()
    await tapAt([5, 295])
    expect(pointed).not.toHaveBeenCalled()
  })

  test('clustered, the places that meet are one count, a button named by how many it holds', async () => {
    await render(
      <Frame view="30.261,-97.741,12">
        <HelixMapPoints cluster data={NEAR} label="Stops" />
      </Frame>,
    )
    await layOut()
    expect(button('3 places')).toBeTruthy()
    expect(button('South Congress')).toBeTruthy()
    expect(screen.queryAllByLabelText('Capitol steps', { includeHiddenElements: true })).toEqual([])
    /* The count's disc, its halo, and its figures. */
    const circles = screen.root?.queryAll((node) => node.type === 'RNSVGCircle') ?? []
    expect(circles).toHaveLength(2)
    const figures = screen.root?.queryAll(
      (node) => node.type === 'RNSVGTSpan' && node.props.content === '3',
    )
    expect(figures?.length).toBeGreaterThan(0)
  })

  test('a tap on a count sends map-cluster from the layer and zooms in to where it comes apart, and sends no activate', async () => {
    const pointed = jest.fn()
    const opened = jest.fn()
    await render(
      <Frame view="30.261,-97.741,12">
        <HelixMapPoints
          cluster
          data={NEAR}
          label="Stops"
          onActivate={pointed}
          onMapCluster={opened}
        />
      </Frame>,
    )
    await layOut()
    await tapAt(middleOf('3 places', 48))
    expect(pointed).not.toHaveBeenCalled()
    expect(opened).toHaveBeenCalledTimes(1)
    const detail = detailOf(opened) as {
      count: number
      place: { lat: number; lng: number }
      zoom: number
    }
    expect(Object.keys(detail).sort()).toEqual(['count', 'place', 'zoom'])
    expect(detail.count).toBe(3)
    expect(detail.place.lat).toBeCloseTo(30.2747, 3)
    expect(detail.place.lng).toBeCloseTo(-97.7405, 3)
    expect(detail.zoom).toBeGreaterThanOrEqual(14)
    expect(announced.said.at(-1)?.message.trim()).toMatch(/^Zoom level 1[4-9]/)
  })

  test("a press on a count's button sends the same map-cluster as a tap on it", async () => {
    const opened = jest.fn()
    await render(
      <Frame view="30.261,-97.741,12">
        <HelixMapPoints cluster data={NEAR} label="Stops" onMapCluster={opened} />
      </Frame>,
    )
    await layOut()
    await act(async () => fireEvent.press(button('3 places')))
    expect(detailOf(opened)).toMatchObject({ count: 3 })
    expect(announced.said.at(-1)?.message.trim()).toMatch(/^Zoom level 1[4-9]/)
  })
})

describe("the still picture's streets, water and land", () => {
  test("draws the style's vector tiles once they answer, asking the style's TileJSON first", async () => {
    const asked: string[] = []
    const answer = answerOf
    const fetched: MapTileFetch = async (url) => {
      asked.push(url)
      return url.endsWith('/planet')
        ? answer({ maxzoom: 14, tiles: ['https://tiles.test/{z}/{x}/{y}.pbf'] })
        : answer(WATER_TILE)
    }
    setMapTileFetch(fetched)
    await render(<Frame view="30.261,-97.741,12" />)
    await layOut()
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20))
    })
    expect(asked[0]).toBe('https://tiles.openfreemap.org/planet')
    expect(
      asked.slice(1).every((url) => /^https:\/\/tiles\.test\/12\/\d+\/\d+\.pbf$/.test(url)),
    ).toBe(true)
    /* Both tiles the view needs, in one path of the water's color. */
    expect(water()).toHaveLength(1)
    expect(water()[0]?.props.d).toMatch(/z.*z$/)
  })

  test('draws the land alone where the tiles do not answer', async () => {
    setMapTileFetch(async () => {
      throw new Error('offline')
    })
    /* Somewhere no spec has drawn, since a tile once read is kept. */
    await render(<Frame view="51.507,-0.128,12" />)
    await layOut()
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20))
    })
    expect(water()).toHaveLength(0)
  })
})
