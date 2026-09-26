import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import type { MapMotion } from '../motion/motion.js'
import { geoJson, LAYERS, type MapLibreMap, mapLibreDriver } from './maplibre-driver.js'

beforeAll(() => {
  registerDom()
})

/**
 * A MapLibre map as far as the driver can tell: what it was asked, its keyboard
 * handler, its sources and the credit control MapLibre draws in its container.
 */
const stand = (): {
  asked: string[]
  fire(
    type: 'load' | 'move' | 'resize' | 'sourcedata' | 'styledata',
    event?: { sourceDataType?: string },
  ): void
  map: MapLibreMap
  notReady(): void
  ready(): void
  sources: Record<string, { attribution?: string; data?: unknown }>
  styleLayers: { id: string; type: string }[]
} => {
  const asked: string[] = []
  const listeners = new Map<string, Set<(event?: { sourceDataType?: string }) => void>>()
  const container = document.createElement('div')
  container.innerHTML = '<div class="maplibregl-ctrl-attrib">MapLibre credit</div>'
  const canvas = document.createElement('canvas')
  const sources: Record<
    string,
    { attribution?: string; data?: unknown; setData?(data: unknown): unknown }
  > = {}
  const styleLayers: { id: string; type: string }[] = [
    { id: 'land', type: 'background' },
    { id: 'road', type: 'line' },
    { id: 'label-city', type: 'symbol' },
  ]
  let keys = true
  let ready = true
  const map: MapLibreMap = {
    addLayer: (layer, before) => {
      const { id, type } = layer as unknown as { id: string; type: string }
      const at = before ? styleLayers.findIndex((one) => one.id === before) : styleLayers.length
      styleLayers.splice(at, 0, { id, type })
      asked.push(`addLayer ${id} before ${before}`)
    },
    addSource: (id, source) => {
      if (!ready) {
        throw new Error('Style is not done loading')
      }
      const { data } = source as unknown as { data: unknown }
      sources[id] = {
        data,
        setData(next) {
          this.data = next
          asked.push(`setData ${id}`)
        },
      }
      asked.push(`addSource ${id}`)
    },
    easeTo: ({ center, duration, easing, zoom }) => {
      asked.push(`easeTo ${center.join(',')} ${zoom} ${duration} ${easing?.(0.5)}`)
    },
    fitBounds: (bounds, options) => {
      asked.push(
        `fitBounds ${JSON.stringify(bounds)} ${JSON.stringify(options?.padding)} ${options?.duration ?? options?.animate}`,
      )
    },
    getBearing: () => 0,
    getCanvas: () => canvas,
    getContainer: () => container,
    getLayer: (id) => styleLayers.find((one) => one.id === id),
    getSource: (id) => sources[id],
    getStyle: () => ({ layers: styleLayers, sources }),
    jumpTo: ({ center, zoom }) => {
      asked.push(`jumpTo ${center.join(',')} ${zoom}`)
    },
    keyboard: {
      disable: () => {
        keys = false
      },
      enable: () => {
        keys = true
      },
      isEnabled: () => keys,
    },
    off: (type, listener) => listeners.get(type)?.delete(listener),
    on: (type, listener) => {
      listeners.set(type, (listeners.get(type) ?? new Set()).add(listener))
    },
    panBy: ([x, y], options) => {
      asked.push(
        `panBy ${x} ${y} ${options?.animate} ${options?.duration} ${options?.easing?.(0.5)}`,
      )
    },
    // Ten pixels a degree from the origin, which is enough to tell the axes apart.
    project: ([lng, lat]) => ({ x: lng * 10, y: -lat * 10 }),
    removeLayer: (id) => {
      styleLayers.splice(
        styleLayers.findIndex((one) => one.id === id),
        1,
      )
    },
    removeSource: (id) => {
      delete sources[id]
    },
    setStyle: () => {
      asked.push('setStyle')
    },
    zoomIn: (options) => {
      asked.push(`zoomIn ${options?.animate} ${options?.duration}`)
    },
    zoomOut: (options) => {
      asked.push(`zoomOut ${options?.animate} ${options?.duration}`)
    },
  }
  const fire = (
    type: 'load' | 'move' | 'resize' | 'sourcedata' | 'styledata',
    event?: { sourceDataType?: string },
  ): void => {
    for (const listener of listeners.get(type) ?? []) {
      listener(event)
    }
  }
  return {
    asked,
    fire,
    map,
    notReady: () => {
      ready = false
    },
    ready: () => {
      ready = true
    },
    sources,
    styleLayers,
  }
}

/**
 * A motion as the connector hands one over, its curve a square so the call
 * shows it was the page's curve that arrived and not MapLibre's own.
 */
const glide: MapMotion = { duration: 250, easing: (t) => t * t }

describe('mapLibreDriver', () => {
  test('a pan and a zoom are MapLibre’s own calls, over the page’s duration and curve', () => {
    const { asked, map } = stand()
    const driver = mapLibreDriver(map)
    driver.panBy(100, -50, glide)
    driver.zoomBy(1, null)
    driver.zoomBy(-1, glide)
    expect(asked).toEqual([
      'panBy 100 -50 undefined 250 0.25',
      'zoomIn false undefined',
      'zoomOut undefined 250',
    ])
  })

  test('its keys go quiet and come back only if they were on', () => {
    const { map } = stand()
    const restore = mapLibreDriver(map).silenceKeyboard?.()
    expect(map.keyboard.isEnabled()).toBe(false)
    restore?.()
    expect(map.keyboard.isEnabled()).toBe(true)

    map.keyboard.disable()
    mapLibreDriver(map).silenceKeyboard?.()?.()
    expect(map.keyboard.isEnabled()).toBe(false)
  })

  test('a place is where MapLibre projects it, longitude first as MapLibre takes it', () => {
    const { map } = stand()
    expect(mapLibreDriver(map).project?.({ lat: 2, lng: 3 })).toEqual({ x: 30, y: -20 })
  })

  test('showing a place glides on the page’s curve, or jumps where there is no motion to have', () => {
    const { asked, map } = stand()
    const driver = mapLibreDriver(map)
    driver.show?.({ lat: 2, lng: 3, zoom: 14 }, glide)
    driver.show?.({ lat: 2, lng: 3 }, null)
    expect(asked).toEqual(['easeTo 3,2 14 250 0.25', 'jumpTo 3,2 undefined'])
  })

  test('the view moving is heard until it is told to stop', () => {
    const { fire, map } = stand()
    let heard = 0
    const stop = mapLibreDriver(map).onView?.(() => {
      heard += 1
    })
    fire('move')
    fire('resize')
    stop?.()
    fire('move')
    expect(heard).toBe(2)
  })

  test('the canvas is what it takes out of the tab order', () => {
    const { map } = stand()
    expect(mapLibreDriver(map).focusTarget?.()).toBe(map.getCanvas())
  })

  test('its credit is every source’s, heard again as sources arrive, and its control is put back', () => {
    const { fire, map, sources } = stand()
    const control = map.getContainer().querySelector('.maplibregl-ctrl-attrib') as HTMLElement
    let heard = 0
    const credits = mapLibreDriver(map).credits?.(() => {
      heard += 1
    })
    expect(control.style.display).toBe('none')
    expect(credits?.read()).toEqual([])
    sources.base = { attribution: '© OpenStreetMap contributors' }
    sources.hills = {}
    // A tile loading is not news for the credit; a source learning its metadata is.
    fire('sourcedata', { sourceDataType: 'content' })
    expect(heard).toBe(0)
    fire('sourcedata', { sourceDataType: 'metadata' })
    expect(heard).toBe(1)
    expect(credits?.read()).toEqual(['© OpenStreetMap contributors'])
    credits?.stop()
    fire('styledata')
    expect(heard).toBe(1)
    expect(control.style.display).toBe('')
  })

  test('routes and areas are MapLibre’s own layers, under the place names', () => {
    const { asked, map, sources, styleLayers } = stand()
    let color = 'rgb(1, 2, 3)'
    const drawn = mapLibreDriver(map).layers?.(() => [
      {
        casing: 'rgb(250, 250, 250)',
        color,
        id: 'a',
        kind: 'route',
        label: 'Depot to Mission',
        points: [
          { lat: 1, lng: 2 },
          { lat: 3, lng: 4 },
        ],
      },
      {
        color,
        id: 'b',
        kind: 'area',
        label: 'Zone',
        points: [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 1 },
          { lat: 1, lng: 1 },
        ],
      },
    ])
    expect(styleLayers.map((one) => one.id)).toEqual([
      'land',
      'road',
      'helix-areas',
      'helix-area-edges',
      'helix-route-casings',
      'helix-route-dots',
      'helix-routes',
      'label-city',
    ])
    const data = sources['helix-layers']?.data as {
      features: { geometry: { coordinates: unknown }; properties: { casing?: string } }[]
    }
    // The route's edge travels with it, and an area has none.
    expect(data.features.map((one) => one.properties.casing)).toEqual([
      'rgb(250, 250, 250)',
      undefined,
    ])
    // Longitude first, and an area's ring closed, as GeoJSON has them.
    expect(data.features[0]?.geometry.coordinates).toEqual([
      [2, 1],
      [4, 3],
    ])
    expect(data.features[1]?.geometry.coordinates).toEqual([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ])
    color = 'rgb(9, 9, 9)'
    drawn?.update()
    expect(asked.at(-1)).toBe('setData helix-layers')
    drawn?.stop()
    expect(styleLayers.map((one) => one.id)).toEqual(['land', 'road', 'label-city'])
    expect(sources['helix-layers']).toBeUndefined()
  })

  test('a style replaced takes the layers with it, and they come back with their colors read again', () => {
    const { fire, map, sources, styleLayers } = stand()
    let read = 0
    mapLibreDriver(map).layers?.(() => {
      read += 1
      return [
        {
          color: `rgb(${read}, 0, 0)`,
          id: 'a',
          kind: 'route',
          label: 'R',
          points: [
            { lat: 1, lng: 2 },
            { lat: 3, lng: 4 },
          ],
        },
      ]
    })
    // What `setStyle(…, { diff: true })` does to a style that did not have them.
    for (const id of ['helix-routes', 'helix-area-edges', 'helix-areas']) {
      map.removeLayer(id)
    }
    map.removeSource('helix-layers')
    fire('styledata')
    expect(styleLayers.map((one) => one.id)).toContain('helix-routes')
    const data = sources['helix-layers']?.data as { features: { properties: { color: string } }[] }
    expect(data.features[0]?.properties.color).toBe('rgb(2, 0, 0)')
  })

  test('on a map whose style is still loading, they are drawn when it has', () => {
    const { fire, map, notReady, ready, styleLayers } = stand()
    notReady()
    mapLibreDriver(map).layers?.(() => [
      {
        color: 'rgb(1, 2, 3)',
        id: 'a',
        kind: 'route',
        label: 'R',
        points: [
          { lat: 1, lng: 2 },
          { lat: 3, lng: 4 },
        ],
      },
    ])
    fire('styledata')
    expect(styleLayers.map((one) => one.id)).not.toContain('helix-routes')
    ready()
    fire('load')
    expect(styleLayers.map((one) => one.id)).toContain('helix-routes')
  })

  test('the layers it adds are a style MapLibre’s own validator accepts', () => {
    const style = {
      layers: LAYERS,
      sources: { 'helix-layers': { data: geoJson([]), type: 'geojson' } },
      version: 8,
    }
    expect(validateStyleMin(style as never)).toEqual([])
  })

  test('fitting is MapLibre’s fitBounds, west-south first, over the page’s motion', () => {
    const { asked, map } = stand()
    mapLibreDriver(map).fit?.(
      { northEast: { lat: 3, lng: 4 }, southWest: { lat: 1, lng: 2 } },
      24,
      glide,
    )
    expect(asked).toEqual(['fitBounds [[2,1],[4,3]] 24 250'])
  })
})
