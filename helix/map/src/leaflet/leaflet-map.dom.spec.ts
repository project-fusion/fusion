import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  hasState,
  mount,
  notYetDefined,
  part,
  registerDom,
} from '@fusion.dev/helix-testing/dom'

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

  /* **As a page writes it**: the frame is in the page, the import defines it,
     and Leaflet is made in its box on the next line, with no await between
     them. Leaflet measures the box as it is made and keeps that size. */
  test('a map made in the same turn the frame is defined has its box, and fits its markers in it', async () => {
    const L = await import('leaflet')
    const late = notYetDefined('helix-headless-map')
    const host = late.element
    host.setAttribute('label', 'Harbor')
    host.setAttribute('style', 'display: block; inline-size: 400px')
    host.innerHTML = `<div data-renderer style="inline-size: 400px; block-size: 300px"></div>
      <helix-headless-map-marker label="Depot" lat="51.505" lng="-0.1"></helix-headless-map-marker>
      <helix-headless-map-marker label="Quay" lat="51.51" lng="-0.08"></helix-headless-map-marker>`
    document.body.replaceChildren(host)
    late.define()
    const map = L.map(host.querySelector('[data-renderer]') as HTMLElement, {
      center: [51.505, -0.09],
      zoom: 13,
    })
    const connection = connectMap(host, leafletDriver(map, L))
    connection.fit({ animate: false })
    try {
      expect(map.getSize()).toMatchObject({ x: 400, y: 300 })
      for (const [lat, lng] of [
        [51.505, -0.1],
        [51.51, -0.08],
      ] as const) {
        const { x, y } = map.latLngToContainerPoint([lat, lng])
        expect([x >= 0 && x <= 400, y >= 0 && y <= 300]).toEqual([true, true])
      }
    } finally {
      connection.disconnect()
      map.remove()
    }
  })

  test('the zoom button and keys zoom the map a level, each level is said, and a marker off screen is brought into view', async () => {
    const L = await import('leaflet')
    const host = (await mount(
      `<helix-headless-map label="Harbor" style="display: block; inline-size: 400px">
        <div data-renderer style="inline-size: 400px; block-size: 300px"></div>
        <helix-headless-map-marker label="Depot" lat="51.505" lng="-0.1"></helix-headless-map-marker>
        <helix-headless-map-marker label="Lighthouse" lat="51.6" lng="0.3"></helix-headless-map-marker>
      </helix-headless-map>`,
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    await host.updateComplete
    const map = L.map(host.querySelector('[data-renderer]') as HTMLElement, {
      center: [51.505, -0.09],
      zoom: 13,
    })
    const connection = connectMap(host, leafletDriver(map, L))
    try {
      const region = part(host, 'region') as HTMLElement
      const live = (): string => part(host, 'live')?.textContent?.trim() ?? ''
      const [depot, lighthouse] = [
        ...host.querySelectorAll('helix-headless-map-marker'),
      ] as HTMLElement[]
      expect(await until(() => hasState(depot as HTMLElement, 'placed'))).toBe(true)

      /* Leaflet's own zoom buttons give way to the frame's, which zoom it. */
      expect(map.getContainer().querySelector('.leaflet-control-zoom')).toBeNull()
      ;(part(host, 'zoom-in') as HTMLElement).click()
      expect(await until(() => map.getZoom() === 14)).toBe(true)
      expect(await until(() => live() === 'Zoom level 14')).toBe(true)
      region.focus()
      region.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, composed: true, key: '-' }),
      )
      expect(await until(() => map.getZoom() === 13)).toBe(true)
      expect(await until(() => live() === 'Zoom level 13')).toBe(true)

      /* The second marker is off screen at this zoom, and walking to it brings it in. */
      const inView = (lat: number, lng: number): boolean => {
        const { x, y } = map.latLngToContainerPoint([lat, lng])
        return x >= 0 && x <= 400 && y >= 0 && y <= 300
      }
      expect(inView(51.6, 0.3)).toBe(false)
      ;(depot as HTMLElement).focus()
      ;(depot as HTMLElement).shadowRoot
        ?.querySelector('[part="marker"]')
        ?.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowDown' }),
        )
      expect(await until(() => document.activeElement === lighthouse)).toBe(true)
      expect(await until(() => inView(51.6, 0.3))).toBe(true)
    } finally {
      connection.disconnect()
      map.remove()
    }
  })
})
