import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { MapLibreMap } from './maplibre-driver.js'

/* Imported after the DOM is registered, like the elements: the connector
   reaches `@fusion.dev/helix-core`, which evaluates Lit. */
let connectMap: typeof import('../connect-map/connect-map.js').connectMap
let mapLibreDriver: typeof import('./maplibre-driver.js').mapLibreDriver

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/map')
  await import('@fusion.dev/helix-headless/map/compass')
  await import('@fusion.dev/helix-headless/map/layers')
  ;({ connectMap } = await import('../connect-map/connect-map.js'))
  ;({ mapLibreDriver } = await import('./maplibre-driver.js'))
})

/** Waits for `done` to hold, a frame at a time, for up to a second and a half. */
const until = async (done: () => boolean): Promise<boolean> => {
  const end = performance.now() + 1500
  while (!done() && performance.now() < end) {
    await new Promise((next) => requestAnimationFrame(next))
  }
  return done()
}

/** A key pressed on an element, as a reader presses it. */
const key = (target: Element, name: string, shiftKey = false): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: name,
      shiftKey,
    }),
  )
}

/**
 * A style with no tiles and nothing to fetch: the land as one color. What the
 * frame drives is the camera, which a style of one layer moves as a style of a
 * city does.
 */
const STYLE = {
  layers: [{ id: 'land', paint: { 'background-color': '#dddddd' }, type: 'background' }],
  sources: {},
  version: 8,
}

/** MapLibre's map, as far as these specs read it. */
type Drawn = MapLibreMap & {
  getCenter(): { lat: number; lng: number }
  getPitch(): number
  getZoom(): number
  remove(): void
}

/** What each spec is handed: the frame, the map MapLibre draws in it, and its markers. */
interface Made {
  host: HTMLElement
  map: Drawn
  markers: HTMLElement[]
}

/**
 * Runs `body` against a frame on a real MapLibre map, made fresh for it, and
 * takes both down after.
 *
 * **MapLibre's worker is one that answers nothing.** MapLibre 6 runs its
 * worker from a file beside its own, which the spec bundle does not serve, and
 * a style with no sources gives the worker nothing to do. The camera, the
 * projection and the events the driver reads are MapLibre's own.
 */
const onMap = async (
  body: (made: Made) => Promise<void>,
  view: { bearing?: number } = {},
): Promise<void> => {
  const maplibre = (await import('maplibre-gl')) as unknown as {
    Map: new (options: Record<string, unknown>) => Drawn
    setWorkerUrl(url: string): void
  }
  maplibre.setWorkerUrl(
    URL.createObjectURL(new Blob(['self.onmessage = () => {}'], { type: 'text/javascript' })),
  )
  const host = await mount(
    `<helix-headless-map label="Harbor" controls="zoom compass tilt" style="display: block; inline-size: 400px">
      <div data-renderer style="inline-size: 400px; block-size: 300px"></div>
      <helix-headless-map-marker label="Depot" lat="51.505" lng="-0.1"></helix-headless-map-marker>
      <helix-headless-map-marker label="Quay" lat="51.51" lng="-0.08"></helix-headless-map-marker>
    </helix-headless-map>`,
  )
  const map = new maplibre.Map({
    attributionControl: false,
    bearing: view.bearing ?? 0,
    center: [-0.09, 51.505],
    container: host.querySelector('[data-renderer]') as HTMLElement,
    fadeDuration: 0,
    style: STYLE,
    zoom: 13,
  })
  const connection = connectMap(host, mapLibreDriver(map))
  try {
    await body({
      host,
      map,
      markers: [...host.querySelectorAll('helix-headless-map-marker')] as HTMLElement[],
    })
  } finally {
    connection.disconnect()
    map.remove()
  }
}

const live = (host: HTMLElement): string => part(host, 'live')?.textContent?.trim() ?? ''

/**
 * MapLibre draws in WebGL 2. A browser without it cannot make the map, and
 * happy-dom has no layout, so these run in a browser that has both
 * (`bun run specs:browser map`).
 */
const webgl2 = hasLayout() && document.createElement('canvas').getContext('webgl2') !== null
const drawn = webgl2 ? test : (): void => {}

/* **A skipped spec is an absence in the browser run**, which reports passes and
   failures and nothing else, so a browser with no WebGL 2 would drop every spec
   below without a word. In a browser the missing context is a failure that
   names itself. Headless Chromium on a GitHub runner draws WebGL 2 in
   SwiftShader, so the specs below run there. */
if (hasLayout()) {
  test('the browser draws in WebGL 2, so every spec on a MapLibre map runs', () => {
    expect(webgl2).toBe(true)
  })
}

/**
 * The frame on a map MapLibre draws, end to end.
 *
 * The driver specs hand the connector a stand-in that writes down what it is
 * asked. These hand it MapLibre itself, so what is heard and walked is what a
 * page with the renderer gets: each key and control moves the real camera, and
 * the frame says where it went once the camera stops, in its own words. One
 * map, a step at a time, in order.
 */
describe('a frame on a MapLibre map', () => {
  drawn('stands its markers on their places, and is the one tab stop', () =>
    onMap(async ({ map, markers }) => {
      expect(await until(() => markers.every((marker) => hasState(marker, 'placed')))).toBe(true)
      expect(map.getCanvas().getAttribute('tabindex')).toBe('-1')
    }),
  )

  drawn('pans the camera on an arrow key, and says so once it stops', () =>
    onMap(async ({ host, map }) => {
      const region = part(host, 'region') as HTMLElement
      const east = map.getCenter().lng
      region.focus()
      key(region, 'ArrowRight')
      expect(await until(() => map.getCenter().lng > east)).toBe(true)
      expect(await until(() => live(host) === 'Moved right')).toBe(true)
    }),
  )

  drawn('zooms the camera a level from the zoom button, and says the level', () =>
    onMap(async ({ host, map }) => {
      ;(part(host, 'zoom-in') as HTMLElement).click()
      expect(await until(() => map.getZoom() === 14)).toBe(true)
      expect(await until(() => live(host) === 'Zoom level 14')).toBe(true)
    }),
  )

  drawn('turns the camera with Shift and Right, and says the bearing', () =>
    onMap(async ({ host, map }) => {
      key(part(host, 'region') as HTMLElement, 'ArrowRight', true)
      expect(await until(() => Math.round(map.getBearing()) === 15)).toBe(true)
      expect(await until(() => live(host) === 'Facing 15 degrees')).toBe(true)
    }),
  )

  drawn('tilts the camera with Shift and Up, and says the tilt', () =>
    onMap(async ({ host, map }) => {
      key(part(host, 'region') as HTMLElement, 'ArrowUp', true)
      expect(await until(() => Math.round(map.getPitch()) === 10)).toBe(true)
      expect(await until(() => live(host) === 'Tilted 10 degrees')).toBe(true)
    }),
  )

  drawn('turns the camera back to north from Face north, and says so', () =>
    onMap(
      async ({ host, map }) => {
        ;(part(host, 'face-north') as HTMLElement).click()
        expect(await until(() => Math.round(map.getBearing()) === 0)).toBe(true)
        expect(await until(() => live(host) === 'Facing north')).toBe(true)
      },
      { bearing: 30 },
    ),
  )

  drawn('walks its markers with the arrows, one tab stop for them all', () =>
    onMap(async ({ markers }) => {
      const button = (marker: HTMLElement): HTMLElement =>
        marker.shadowRoot?.querySelector('[part="marker"]') as HTMLElement
      const [depot, quay] = markers as [HTMLElement, HTMLElement]
      expect(await until(() => hasState(depot, 'placed'))).toBe(true)
      expect(button(depot).getAttribute('tabindex')).toBe('0')
      expect(button(quay).getAttribute('tabindex')).toBe('-1')
      depot.focus()
      key(button(depot), 'ArrowDown')
      expect(await until(() => document.activeElement === quay)).toBe(true)
    }),
  )
})
