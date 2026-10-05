import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Frame = HTMLElement & { updateComplete: Promise<boolean> }
type Marker = HTMLElement & {
  lat: number
  lng: number
  place(properties: Record<string, string | undefined>): void
  updateComplete: Promise<boolean>
}

/** Where the stub renderer drew the map's corners, in degrees. */
const BOUNDS = { east: -122.38, north: 37.8, south: 37.75, west: -122.44 }

/**
 * A renderer reduced to the one thing the walk needs from it: each marker
 * stood on its place, as `connectMap` stands it, through the marker's own
 * `place`. The projection is a flat one over the viewport's box, which is
 * enough to put every place somewhere different and inside the map.
 */
const stubRenderer = (frame: Frame): void => {
  const viewport = part(frame, 'viewport') as HTMLElement
  const width = viewport.clientWidth || 400
  const height = viewport.clientHeight || 300
  for (const marker of frame.querySelectorAll<Marker>('helix-map-marker')) {
    const x = ((marker.lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * width
    const y = ((BOUNDS.north - marker.lat) / (BOUNDS.north - BOUNDS.south)) * height
    marker.place({ '--_map-marker-x': `${x}px`, '--_map-marker-y': `${y}px` })
  }
}

const frame = async (): Promise<Frame> => {
  const host = (await mount(
    `<helix-map label="Deliveries" style="--map-block-size: 18rem; inline-size: 24rem; display: block">
      <div></div>
      <helix-map-marker label="Depot" lat="37.77" lng="-122.41"></helix-map-marker>
      <helix-map-marker label="Ferry Building" lat="37.79" lng="-122.39"></helix-map-marker>
      <helix-map-marker label="Mission Dolores" lat="37.76" lng="-122.43"></helix-map-marker>
    </helix-map>`,
  )) as Frame
  await host.updateComplete
  stubRenderer(host)
  for (const marker of markers(host)) {
    await marker.updateComplete
  }
  await host.updateComplete
  return host
}

const markers = (host: Frame): Marker[] => [...host.querySelectorAll<Marker>('helix-map-marker')]

/** The marker holding the map's one tab stop. */
const current = (host: Frame): Marker | undefined =>
  markers(host).find((one) => part(one, 'marker')?.getAttribute('tabindex') === '0')

/**
 * Where the walk is, by label: the tab stop, and in a browser the marker focus
 * is on as well, which happy-dom does not follow into a shadow root.
 */
const focused = (host: Frame): string | undefined => {
  const stop = current(host)
  if (hasLayout() && stop?.shadowRoot?.activeElement !== part(stop as Marker, 'marker')) {
    return undefined
  }
  return stop?.getAttribute('label') ?? undefined
}

const press = (host: Frame, key: string): void => {
  part(current(host) as Marker, 'marker')?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
  )
}

describe('markers a renderer has placed', () => {
  test('are walked by the arrow keys in the order they are written, focus moving with the walk', async () => {
    const host = await frame()
    ;(markers(host)[0] as Marker).focus()
    const walked = [focused(host)]
    for (const key of ['ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'End', 'Home']) {
      press(host, key)
      await host.updateComplete
      walked.push(focused(host))
    }
    expect(walked).toEqual([
      'Depot',
      'Ferry Building',
      'Mission Dolores',
      'Depot',
      'Mission Dolores',
      'Mission Dolores',
      'Depot',
    ])
  })

  if (hasLayout()) {
    test('each focused marker is drawn where the renderer placed it, inside the map', async () => {
      const host = await frame()
      const box = (part(host, 'viewport') as HTMLElement).getBoundingClientRect()
      ;(markers(host)[0] as Marker).focus()
      const seen: Array<{ x: number; y: number }> = []
      for (let step = 0; step < 3; step += 1) {
        const point = (
          part(current(host) as Marker, 'point') as HTMLElement
        ).getBoundingClientRect()
        const middle = { x: point.left + point.width / 2, y: point.top + point.height / 2 }
        expect(point.width).toBeGreaterThan(0)
        expect(middle.x).toBeGreaterThan(box.left)
        expect(middle.x).toBeLessThan(box.right)
        expect(middle.y).toBeGreaterThan(box.top)
        expect(middle.y).toBeLessThan(box.bottom)
        seen.push(middle)
        press(host, 'ArrowRight')
        await host.updateComplete
      }
      /* Three places, three different points: each step of the walk lands on
         the place the renderer drew. */
      expect(new Set(seen.map((one) => `${Math.round(one.x)},${Math.round(one.y)}`)).size).toBe(3)
    })
  }
})
