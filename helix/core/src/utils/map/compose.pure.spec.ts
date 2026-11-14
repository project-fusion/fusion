import { describe, expect, test } from 'bun:test'
import { composedStyle, faceIn } from './compose.js'
import type { MapLayerSpec } from './driver.js'
import { mapLibreStyle } from './style.js'

const COLORS = {
  foreground: '#1a1a1a',
  info: '#2563eb',
  primary: '#7c3aed',
  success: '#16a34a',
  surface: '#fafafa',
}

const route: MapLayerSpec = {
  color: '#7c3aed',
  id: 'route-0',
  kind: 'route',
  label: 'Walk',
  points: [
    { lat: 30.27, lng: -97.74 },
    { lat: 30.26, lng: -97.73 },
  ],
}

const ids = (layers: readonly Record<string, unknown>[]) => layers.map((layer) => layer.id)

describe('composedStyle', () => {
  test('leaves a style with no layers to add as it was', () => {
    const style = mapLibreStyle(COLORS, { landmarks: false })
    expect(composedStyle(style, []).layers).toEqual(style.layers)
  })

  test('draws routes and areas from one source under the first name, and their captions on top', () => {
    const style = mapLibreStyle(COLORS, { landmarks: false })
    const composed = composedStyle(style, [route])
    const order = ids(composed.layers)
    const firstName = composed.layers.findIndex(
      (layer) => layer.type === 'symbol' && layer.id !== 'helix-area-captions',
    )
    expect(composed.sources['helix-layers']?.type).toBe('geojson')
    expect(order.indexOf('helix-routes')).toBeLessThan(firstName)
    expect(order.at(-1)).toBe('helix-area-captions')
    expect(style.sources['helix-layers']).toBeUndefined()
  })

  test('puts imagery under the roads, a points layer on top, and buildings under the names', () => {
    const style = mapLibreStyle(COLORS, { landmarks: false })
    const composed = composedStyle(style, [
      {
        color: '#000',
        frames: ['https://tiles.example/{z}/{x}/{y}.png'],
        ground: true,
        id: 'raster-1',
        kind: 'raster',
        label: 'Imagery',
        points: [],
      },
      { color: '#555', id: 'buildings-2', kind: 'buildings', label: 'Buildings', points: [] },
      {
        cluster: true,
        color: '#7c3aed',
        id: 'points-3',
        kind: 'points',
        label: 'Places',
        points: [{ lat: 1, lng: 2 }],
      },
    ])
    const order = ids(composed.layers)
    const road = composed.layers.findIndex((layer) => layer['source-layer'] === 'transportation')
    expect(order.indexOf('helix-raster-raster-1-0')).toBeLessThan(road)
    expect(order.at(-1)).toBe('helix-points-points-3-points')
    expect(composed.sources['helix-points-points-3']?.cluster).toBe(true)
    const name = composed.layers.findIndex((layer) => layer.type === 'symbol')
    expect(order.indexOf('helix-buildings-buildings-2')).toBeLessThan(name)
  })
})

describe('faceIn', () => {
  test("is the style's heavier upright face", () => {
    const face = faceIn(mapLibreStyle(COLORS, { landmarks: false }))
    expect(face.join(' ')).toMatch(/Medium|Bold/)
    expect(face.join(' ')).not.toMatch(/Italic/)
  })
})
