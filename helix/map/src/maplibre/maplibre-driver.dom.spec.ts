import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import type { MapMotion } from '../motion/motion.js'
import {
  buildingsExtrusion,
  geoJson,
  LAYERS,
  type MapLibreMap,
  mapLibreDriver,
  pointsLayers,
} from './maplibre-driver.js'

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
    type: 'click' | 'idle' | 'load' | 'mousemove' | 'move' | 'resize' | 'sourcedata' | 'styledata',
    event?: { point?: { x: number; y: number }; sourceDataType?: string },
  ): void
  map: MapLibreMap
  notReady(): void
  ready(): void
  sources: Record<string, { attribution?: string; data?: unknown }>
  styleLayers: { id: string; type: string }[]
} => {
  const asked: string[] = []
  const listeners = new Map<
    string,
    Set<(event?: { point?: { x: number; y: number }; sourceDataType?: string }) => void>
  >()
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
    easeTo: ({ bearing, center, duration, easing, pitch, zoom }) => {
      if (center) {
        asked.push(`easeTo ${center.join(',')} ${zoom} ${duration} ${easing?.(0.5)}`)
      } else {
        asked.push(`easeTo bearing ${bearing} pitch ${pitch} ${duration}`)
      }
    },
    fitBounds: (bounds, options) => {
      asked.push(
        `fitBounds ${JSON.stringify(bounds)} ${JSON.stringify(options?.padding)} ${options?.duration ?? options?.animate}`,
      )
    },
    getBearing: () => 30,
    getCanvas: () => canvas,
    getContainer: () => container,
    getLayer: (id) => styleLayers.find((one) => one.id === id),
    getPitch: () => 20,
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
    queryRenderedFeatures: () => [],
    removeLayer: (id) => {
      styleLayers.splice(
        styleLayers.findIndex((one) => one.id === id),
        1,
      )
    },
    removeSource: (id) => {
      delete sources[id]
    },
    setPaintProperty: (layer, name) => {
      asked.push(`setPaintProperty ${layer} ${name}`)
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
    type: 'click' | 'idle' | 'load' | 'mousemove' | 'move' | 'resize' | 'sourcedata' | 'styledata',
    event?: { point?: { x: number; y: number }; sourceDataType?: string },
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

  test('so do a points layer’s, over a clustered source', () => {
    const spec = {
      casing: '#ffffff',
      cluster: true,
      color: '#0000ff',
      id: 'p1',
      ink: '#ffffff',
      kind: 'points' as const,
      label: 'Cafés',
      points: [{ lat: 1, lng: 2 }],
    }
    const style = {
      glyphs: 'https://example.com/{fontstack}/{range}.pbf',
      layers: pointsLayers('p1', spec, ['Noto Sans Regular']),
      sources: {
        'helix-points-p1': {
          cluster: true,
          data: { features: [], type: 'FeatureCollection' },
          type: 'geojson',
        },
      },
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

  test('a points layer is a source of its own, clustered where it asks, over everything the style draws', () => {
    const { asked, map, sources } = stand()
    const points = [
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ]
    const spec = {
      casing: 'rgb(255, 255, 255)',
      cluster: true,
      color: 'rgb(0, 0, 255)',
      id: 'p1',
      ink: 'rgb(255, 255, 255)',
      kind: 'points' as const,
      label: 'Cafés',
      points,
    }
    let color = spec.color
    const drawn = mapLibreDriver(map).layers?.(() => [{ ...spec, color }])
    expect(asked.filter((one) => one.startsWith('addLayer helix-points'))).toEqual([
      'addLayer helix-points-p1-halo before undefined',
      'addLayer helix-points-p1-clusters before undefined',
      'addLayer helix-points-p1-count before undefined',
      'addLayer helix-points-p1-points before undefined',
    ])
    expect(sources['helix-points-p1']?.data).toMatchObject({
      features: [{ geometry: { coordinates: [2, 1] }, properties: { at: 0 } }, {}],
    })
    // A new color is painted, and the same points are not sent again.
    asked.length = 0
    color = 'rgb(255, 0, 0)'
    drawn?.update()
    expect(asked.some((one) => one.startsWith('setData helix-points'))).toBe(false)
    expect(asked).toContain('setPaintProperty helix-points-p1-points circle-color')
  })

  test('a point pressed is told to the connector, and a count pressed zooms in to where it comes apart', async () => {
    const { asked, fire, map, sources } = stand()
    const pressed: string[] = []
    const found: ReturnType<MapLibreMap['queryRenderedFeatures']> = []
    map.queryRenderedFeatures = () => found
    mapLibreDriver(map).layers?.(
      () => [
        {
          cluster: true,
          color: 'rgb(0, 0, 255)',
          id: 'p1',
          kind: 'points',
          label: 'Cafés',
          points: [{ lat: 1, lng: 2 }],
        },
      ],
      { motion: () => null, press: (id, at) => pressed.push(`${id} ${at}`) },
    )
    found.push({
      geometry: { coordinates: [2, 1], type: 'Point' },
      layer: { id: 'helix-points-p1-points' },
      properties: { at: 0 },
    })
    fire('click', { point: { x: 10, y: 10 } })
    expect(pressed).toEqual(['p1 0'])

    found.length = 0
    found.push({
      geometry: { coordinates: [2, 1], type: 'Point' },
      layer: { id: 'helix-points-p1-clusters' },
      properties: { cluster_id: 7 },
    })
    ;(
      sources['helix-points-p1'] as { getClusterExpansionZoom?(id: number): Promise<number> }
    ).getClusterExpansionZoom = async (id) => (id === 7 ? 14 : 0)
    fire('click', { point: { x: 10, y: 10 } })
    await new Promise((done) => setTimeout(done, 0))
    expect(asked.at(-1)).toBe('jumpTo 2,1 14')
    expect(pressed).toHaveLength(1)
  })

  test('what is drawn in view is each point and count once, and a still map says so', () => {
    const { fire, map } = stand()
    const found: ReturnType<MapLibreMap['queryRenderedFeatures']> = [
      {
        geometry: { coordinates: [2, 1], type: 'Point' },
        layer: { id: 'helix-points-p1-points' },
        properties: { at: 3 },
      },
      {
        geometry: { coordinates: [2, 1], type: 'Point' },
        layer: { id: 'helix-points-p1-points' },
        properties: { at: 3 },
      },
      {
        geometry: { coordinates: [5, 6], type: 'Point' },
        layer: { id: 'helix-points-p1-clusters' },
        properties: { cluster_id: 9, point_count: 40 },
      },
    ]
    map.queryRenderedFeatures = () => found
    let settled = 0
    const drawn = mapLibreDriver(map).layers?.(
      () => [
        {
          cluster: true,
          color: '#00f',
          id: 'p1',
          kind: 'points',
          label: 'Cafés',
          points: [{ lat: 1, lng: 2 }],
        },
      ],
      { motion: () => null, press: () => {}, settled: () => (settled += 1) },
    )
    expect(drawn?.inView?.('p1')).toEqual([
      { at: 3, place: { lat: 1, lng: 2 } },
      { cluster: 9, count: 40, place: { lat: 6, lng: 5 } },
    ])
    fire('idle')
    expect(settled).toBe(1)
  })

  test('buildings are raised from the style’s own building data, under the routes and areas', () => {
    const { asked, map, styleLayers } = stand()
    styleLayers.splice(1, 0, {
      id: 'building',
      source: 'openmaptiles',
      'source-layer': 'building',
      type: 'fill',
    } as { id: string; type: string })
    let color = 'rgb(40, 40, 40)'
    const drawn = mapLibreDriver(map).layers?.(() => [
      { color, id: 'b', kind: 'buildings', label: '3D buildings', points: [] },
    ])
    expect(styleLayers.map((one) => one.id)).toContain('helix-buildings-b')
    expect(asked).toContain('addLayer helix-buildings-b before helix-areas')
    color = 'rgb(200, 200, 200)'
    drawn?.update()
    expect(asked.at(-1)).toBe('setPaintProperty helix-buildings-b fill-extrusion-color')
    drawn?.stop()
    expect(styleLayers.map((one) => one.id)).not.toContain('helix-buildings-b')
  })

  test('a style without building data raises no buildings', () => {
    const { map, styleLayers } = stand()
    mapLibreDriver(map).layers?.(() => [
      { color: 'red', id: 'b', kind: 'buildings', label: '3D buildings', points: [] },
    ])
    expect(styleLayers.map((one) => one.id)).not.toContain('helix-buildings-b')
  })

  test('a raster layer loads every frame once and shows one at a time by its opacity', () => {
    const { asked, map, sources, styleLayers } = stand()
    let frame = 1
    const frames = ['https://tiles.test/a/{z}/{x}/{y}.png', 'https://tiles.test/b/{z}/{x}/{y}.png']
    const drawn = mapLibreDriver(map).layers?.(() => [
      {
        attribution: 'Radar credit',
        color: 'red',
        frame,
        frames,
        id: 'w',
        kind: 'raster',
        label: 'Weather radar',
        opacity: 0.6,
        points: [],
      },
    ])
    expect(Object.keys(sources)).toEqual(
      expect.arrayContaining(['helix-raster-w-0', 'helix-raster-w-1']),
    )
    expect(styleLayers.map((one) => one.id)).toEqual(
      expect.arrayContaining(['helix-raster-w-0', 'helix-raster-w-1']),
    )
    const added = asked.filter((one) => one.startsWith('addSource helix-raster')).length
    frame = 0
    drawn?.update()
    // The same frames again: no source added, only the opacities set.
    expect(asked.filter((one) => one.startsWith('addSource helix-raster')).length).toBe(added)
    expect(asked.slice(-2)).toEqual([
      'setPaintProperty helix-raster-w-0 raster-opacity',
      'setPaintProperty helix-raster-w-1 raster-opacity',
    ])
    drawn?.stop()
    expect(sources['helix-raster-w-0']).toBeUndefined()
    expect(styleLayers.map((one) => one.id)).not.toContain('helix-raster-w-1')
  })

  test('imagery drawn as the ground goes under the roads, other tiles over them, and a deepest zoom reaches the source', () => {
    const { map, styleLayers } = stand()
    const sent: Record<string, unknown> = {}
    const addSource = map.addSource.bind(map)
    map.addSource = (id, source) => {
      sent[id] = source
      return addSource(id, source)
    }
    mapLibreDriver(map).layers?.(() => [
      {
        color: 'red',
        frame: 0,
        frames: ['https://tiles.test/radar/{z}/{x}/{y}.png'],
        id: 'w',
        kind: 'raster',
        label: 'Weather radar',
        points: [],
      },
      {
        color: 'red',
        frame: 0,
        frames: ['https://tiles.test/photo/{z}/{y}/{x}.jpg'],
        ground: true,
        id: 'p',
        kind: 'raster',
        label: 'Satellite imagery',
        maxZoom: 16,
        points: [],
      },
    ])
    const order = styleLayers.map((one) => one.id)
    expect(order.indexOf('helix-raster-p-0')).toBeLessThan(order.indexOf('road'))
    expect(order.indexOf('helix-raster-w-0')).toBeGreaterThan(order.indexOf('road'))
    expect(order.indexOf('helix-raster-w-0')).toBeLessThan(order.indexOf('label-city'))
    expect(sent['helix-raster-p-0']).toMatchObject({ maxzoom: 16 })
    expect(sent['helix-raster-w-0']).not.toHaveProperty('maxzoom')
  })

  test('the buildings and raster layers it adds are a style MapLibre’s own validator accepts', () => {
    const style = {
      layers: [
        buildingsExtrusion(
          { color: '#888888', id: 'b', kind: 'buildings', label: '', points: [] },
          'openmaptiles',
        ),
        {
          id: 'helix-raster-w-0',
          paint: { 'raster-fade-duration': 0, 'raster-opacity': 0.7 },
          source: 'helix-raster-w-0',
          type: 'raster',
        },
      ],
      sources: {
        'helix-raster-w-0': {
          tileSize: 256,
          tiles: ['https://tiles.test/{z}/{x}/{y}.png'],
          type: 'raster',
        },
        openmaptiles: { type: 'vector', url: 'https://tiles.test/planet' },
      },
      version: 8,
    }
    expect(validateStyleMin(style as never)).toEqual([])
  })

  test('a rotate or tilt during a glide aims from where the glide is headed, a tilt can go to an angle, and tilting stops at flat', () => {
    const { asked, map } = stand()
    const driver = mapLibreDriver(map)
    driver.rotate?.({ by: 15 }, glide)
    driver.rotate?.({ by: 15 }, glide)
    driver.tilt?.({ by: 10 }, glide)
    driver.rotate?.({ to: 0 }, null)
    driver.tilt?.({ by: -40 }, null)
    driver.tilt?.({ to: 50 }, null)
    expect(asked).toEqual([
      'easeTo bearing 45 pitch 20 250',
      'easeTo bearing 60 pitch 20 250',
      'easeTo bearing 60 pitch 30 250',
      'easeTo bearing 0 pitch 30 undefined',
      'easeTo bearing 30 pitch 0 undefined',
      'easeTo bearing 30 pitch 50 undefined',
    ])
  })
})
