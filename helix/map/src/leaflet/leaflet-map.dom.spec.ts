import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* Imported after the DOM is registered, like the elements: the connector
   reaches `@fusion.dev/helix-core`, which evaluates Lit. */
let connectMap: typeof import('../connect-map/connect-map.js').connectMap
let leafletDriver: typeof import('./leaflet-driver.js').leafletDriver

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/map')
  ;({ connectMap } = await import('../connect-map/connect-map.js'))
  ;({ leafletDriver } = await import('./leaflet-driver.js'))
})

/** Waits for `done` to hold, a frame at a time, for up to three seconds. */
const until = async (done: () => boolean): Promise<boolean> => {
  const end = performance.now() + 3000
  while (!done() && performance.now() < end) {
    await new Promise((next) => requestAnimationFrame(next))
  }
  return done()
}

/**
 * The frame on a map a real renderer draws, end to end.
 *
 * The other specs hand the connector a driver that writes down what it is
 * asked. This one hands it Leaflet, with no tiles, so what is heard and walked
 * is what a page with a renderer gets: a key moves the map, the map says where
 * it went once it settles, and the markers stand on their places and are one
 * stop the arrows walk. Browser only, since Leaflet measures its box.
 */
describe('a frame on a Leaflet map', () => {
  if (!hasLayout()) {
    return
  }

  test('a key moves the map and is said once it settles, and the markers are walked by the arrows', async () => {
    const L = await import('leaflet')
    const host = (await mount(
      `<helix-headless-map label="Harbor" style="display: block; inline-size: 400px">
        <div data-renderer style="inline-size: 400px; block-size: 300px"></div>
        <helix-headless-map-marker label="Depot" lat="51.505" lng="-0.1"></helix-headless-map-marker>
        <helix-headless-map-marker label="Quay" lat="51.51" lng="-0.08"></helix-headless-map-marker>
      </helix-headless-map>`,
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    await host.updateComplete
    const map = L.map(host.querySelector('[data-renderer]') as HTMLElement, {
      center: [51.505, -0.09],
      zoom: 13,
    })
    const connection = connectMap(host, leafletDriver(map, L))
    try {
      const [depot, quay] = [...host.querySelectorAll('helix-headless-map-marker')] as HTMLElement[]
      expect(await until(() => hasState(depot as HTMLElement, 'placed'))).toBe(true)
      expect(hasState(quay as HTMLElement, 'placed')).toBe(true)

      const region = part(host, 'region') as HTMLElement
      const live = part(host, 'live') as HTMLElement
      const before = map.getCenter().lng
      region.focus()
      region.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowRight' }),
      )
      expect(await until(() => map.getCenter().lng !== before)).toBe(true)
      expect(await until(() => live.textContent?.trim() !== '')).toBe(true)
      expect(live.textContent?.trim()).toBe('Moved right')

      /* One stop for the markers, on the first, and the arrows walk to the next. */
      const button = (marker: HTMLElement): HTMLElement =>
        marker.shadowRoot?.querySelector('[part="marker"]') as HTMLElement
      expect(button(depot as HTMLElement).getAttribute('tabindex')).toBe('0')
      expect(button(quay as HTMLElement).getAttribute('tabindex')).toBe('-1')
      ;(depot as HTMLElement).focus()
      button(depot as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowDown' }),
      )
      expect(await until(() => document.activeElement === quay)).toBe(true)
    } finally {
      connection.disconnect()
      map.remove()
    }
  })
})
