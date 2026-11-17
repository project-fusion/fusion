/*
 * The place names a phone's still map draws from its tiles: placed only
 * once the phone has measured their words, as wide as it measured them,
 * and kept clear of the frame's controls and credit, the markers, and the
 * dots a points layer draws. `test:native` writes the component beside
 * this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setRenderer } from '@fusion.dev/helix-core/capabilities/renderer'
import { fakeRenderer } from '@fusion.dev/helix-core/capabilities/renderer/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { setMapTileFetch } from '../capabilities/map-tiles'
import { forgetMapLibre } from '../capabilities/renderer'
import { forgetWidths, NAME_METER } from '../machines/map-names'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import { HelixMap, HelixMapMarker, HelixMapPoints, type HelixMapProps } from './map/index.native'
import { PLACE_TILE, tilesAnswering } from './map-tiles.fixtures'

/** The middle of tile 853, 1554 at zoom 12, where the tile's city stands in the middle of the box. */
const MIDDLE = { lat: 39.740986355883564, lng: -104.9853515625 }

const VIEW = `${MIDDLE.lat},${MIDDLE.lng},12`

/** The map's box, and where the tile's city falls in it. */
const BOX = { height: 300, width: 360 }
const CITY = { x: 180, y: 150 }

type Layout = { height: number; width: number; x: number; y: number }

const Frame = (props: Partial<HelixMapProps> & { readonly children?: ReactNode }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <HelixMap label="Places near Denver" view={VIEW} {...props} />
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** Lays out `node`, or the nearest view around it that hears its layout. */
const layOutAt = async (node: { parent: unknown; props: Record<string, unknown> }, at: Layout) => {
  let found: typeof node | null = node
  while (found !== null && typeof found.props.onLayout !== 'function') {
    found = found.parent as typeof node | null
  }
  if (found === null) {
    throw new Error('nothing around the node hears its layout')
  }
  const laid = found
  await act(async () => {
    await fireEvent(laid as never, 'layout', { nativeEvent: { layout: at } })
  })
}

/** The frame's controls. */
const toolbar = () => {
  const [found] =
    screen.root?.queryAll(
      (one) =>
        typeof one.type === 'string' &&
        (one.props.accessibilityRole === 'toolbar' || one.props.role === 'toolbar'),
    ) ?? []
  if (found === undefined) {
    throw new Error('no toolbar')
  }
  return found
}

/** The tiles' credit. */
const credit = () => screen.getByText(/OpenFreeMap/, { includeHiddenElements: true })

/** The controls as a column a finger wide down the end of the box, from the top. */
const COLUMN: Layout = { height: 160, width: 44, x: 308, y: 8 }

/**
 * Every view laid out as the map's box, then the controls as a column at
 * the end, where the city's name is clear of them, and the credit in its
 * strip under the map, and the tiles read.
 */
const layOut = async (controls: Layout = COLUMN) => {
  await act(async () => {
    for (const node of screen.root?.queryAll((one) => typeof one.props.onLayout === 'function') ??
      []) {
      await fireEvent(node, 'layout', { nativeEvent: { layout: { ...BOX, x: 0, y: 0 } } })
    }
  })
  await layOutAt(toolbar() as never, controls)
  await layOutAt(credit() as never, { height: 20, width: BOX.width, x: 0, y: BOX.height })
  await act(async () => {
    await new Promise((done) => setTimeout(done, 20))
  })
}

/** The phone measures each word unseen, every letter `wide` ems across. */
const measure = async (wide = 0.6) => {
  await act(async () => {
    for (const node of screen.root?.queryAll(
      (one) => typeof one.props.onTextLayout === 'function',
    ) ?? []) {
      const { fontSize } = StyleSheet.flatten(node.props.style) as { fontSize: number }
      await fireEvent(node, 'textLayout', {
        nativeEvent: { lines: [{ width: String(node.props.children).length * fontSize * wide }] },
      })
    }
  })
}

/** The lines of words the still picture draws, each a halo and its words. */
const named = (words: string) =>
  screen.root?.queryAll((node) => node.type === 'RNSVGTSpan' && node.props.content === words) ?? []

beforeEach(() => {
  setAnnounce(fakeAnnounce())
  setRenderer(fakeRenderer([]))
  forgetMapLibre()
  forgetWidths()
  setMapTileFetch(tilesAnswering(PLACE_TILE))
})

afterEach(() => {
  setMapTileFetch(undefined)
})

describe("a phone's still map names its tiles' places", () => {
  test('once the phone has measured their words, each on a halo of the land, and no state', async () => {
    await render(<Frame />)
    await layOut()
    expect(named('Austin')).toEqual([])
    expect(
      screen.root?.queryAll((node) => node.props.testID === NAME_METER).length,
    ).toBeGreaterThan(0)
    await measure()
    /* Its halo, then its words. */
    expect(named('Austin')).toHaveLength(2)
    expect(named('Texas')).toEqual([])
    /* Measured, the words are drawn no more. */
    expect(screen.root?.queryAll((node) => node.props.testID === NAME_METER)).toEqual([])
  })

  test('as wide as the phone measured them, so a name wider than the map is left out', async () => {
    await render(<Frame />)
    await layOut()
    await measure(4)
    expect(named('Austin')).toEqual([])
  })

  test("clear of the frame's controls", async () => {
    await render(<Frame />)
    await layOut({ height: 160, width: 44, x: CITY.x - 22, y: 8 })
    await measure()
    expect(named('Austin')).toEqual([])
  })

  test('clear of the credit where it stands over the map', async () => {
    await render(<Frame creditPlacement="bottom-end" />)
    await layOut()
    await layOutAt(credit() as never, {
      height: 20,
      width: 200,
      x: CITY.x - 100,
      y: CITY.y - 10,
    })
    await measure()
    expect(named('Austin')).toEqual([])
  })

  test('clear of a marker standing on the place, and beside one standing away from it', async () => {
    await render(
      <Frame>
        <HelixMapMarker label="Union Station" lat={MIDDLE.lat} lng={MIDDLE.lng} name="station" />
      </Frame>,
    )
    await layOut()
    const marker = screen.getAllByLabelText('Union Station', { includeHiddenElements: true })[0]
    await layOutAt(marker as never, { height: 32, width: 32, x: CITY.x - 16, y: CITY.y - 16 })
    await measure()
    expect(named('Austin')).toEqual([])
    await layOutAt(marker as never, { height: 32, width: 32, x: 8, y: 8 })
    expect(named('Austin')).toHaveLength(2)
  })

  test('clear of the dots a points layer draws', async () => {
    await render(
      <Frame>
        <HelixMapPoints
          data={[{ id: 'a', label: 'Stop', lat: MIDDLE.lat, lng: MIDDLE.lng }]}
          label="Stops"
        />
      </Frame>,
    )
    await layOut()
    await measure()
    expect(named('Austin')).toEqual([])
  })

  test('beside the dots a points layer draws away from it', async () => {
    await render(
      <Frame>
        <HelixMapPoints
          data={[{ id: 'a', label: 'Stop', lat: MIDDLE.lat + 0.03, lng: MIDDLE.lng - 0.03 }]}
          label="Stops"
        />
      </Frame>,
    )
    await layOut()
    await measure()
    expect(named('Austin')).toHaveLength(2)
  })
})
