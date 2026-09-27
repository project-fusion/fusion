import type { MapDriver, MapInView, MapLayerSpec, MapPadding } from '../connect-map/connect-map.js'
import type { MapMotion } from '../motion/motion.js'
import { colorsNow, type MapColors, mapColorsFrom, PATIENCE } from '../style/map-colors.js'
import { watchTheme } from '../theme/watch-theme.js'

/** What MapLibre hands a listener, as far as the driver reads it. */
interface MapLibreEvent {
  /** On a press or a move: where the pointer is, in the map's box. */
  point?: { x: number; y: number }
  /** On `sourcedata`: `metadata` where a source learned its TileJSON, credit and all. */
  sourceDataType?: string
}

/** The frame's routes and areas, as MapLibre draws GeoJSON. */
interface GeoJson {
  features: {
    geometry: { coordinates: unknown; type: 'LineString' | 'Polygon' }
    properties: {
      casing?: string
      color: string
      faded?: boolean
      kind: 'area' | 'route'
      label: string
      pattern?: 'dotted'
    }
    type: 'Feature'
  }[]
  type: 'FeatureCollection'
}

/**
 * A style layer as far as the driver writes one: a fill or a line, which
 * MapLibre types apart and so must this.
 */
type MapLibreLayer =
  | { filter: unknown[]; id: string; paint: Record<string, unknown>; source: string; type: 'fill' }
  | {
      filter: unknown[]
      id: string
      layout: Record<string, unknown>
      paint: Record<string, unknown>
      source: string
      type: 'line'
    }

/** Where the frame's routes and areas are drawn from, one source for all of them. */
const SOURCE = 'helix-layers'

/** Their layers, from the bottom up: areas under their own edges, routes over both. */
export const LAYERS: MapLibreLayer[] = [
  {
    filter: ['==', ['get', 'kind'], 'area'],
    id: 'helix-areas',
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.16 },
    source: SOURCE,
    type: 'fill',
  },
  {
    filter: ['==', ['get', 'kind'], 'area'],
    id: 'helix-area-edges',
    layout: { 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 },
    source: SOURCE,
    type: 'line',
  },
  /* **A casing under each route that has one**, wider by an edge's width
     either side, so a route in the brand is not one more brand road. */
  {
    filter: ['all', ['==', ['get', 'kind'], 'route'], ['has', 'casing']],
    id: 'helix-route-casings',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['get', 'casing'],
      'line-opacity': ['case', ['boolean', ['get', 'faded'], false], 0.4, 1],
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 5.5, 14, 9],
    },
    source: SOURCE,
    type: 'line',
  },
  /* **A dotted leg in a layer of its own**: MapLibre takes a dash pattern
     per layer and not per line, so the dotted legs cannot share the solid
     routes' layer. Dashes of no length with round caps are dots. */
  {
    filter: ['all', ['==', ['get', 'kind'], 'route'], ['==', ['get', 'pattern'], 'dotted']],
    id: 'helix-route-dots',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-dasharray': [0, 2],
      'line-opacity': ['case', ['boolean', ['get', 'faded'], false], 0.4, 1],
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 14, 5],
    },
    source: SOURCE,
    type: 'line',
  },
  {
    filter: ['all', ['==', ['get', 'kind'], 'route'], ['!=', ['get', 'pattern'], 'dotted']],
    id: 'helix-routes',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    /* The part of a route already traveled, quieter than the part ahead. */
    paint: {
      'line-color': ['get', 'color'],
      'line-opacity': ['case', ['boolean', ['get', 'faded'], false], 0.4, 1],
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 14, 5],
    },
    source: SOURCE,
    type: 'line',
  },
]

/** The routes and areas as GeoJSON, longitude first, an area's ring closed as GeoJSON requires. */
export const geoJson = (layers: MapLayerSpec[]): GeoJson => ({
  features: layers.flatMap((layer) => {
    if (layer.kind !== 'area' && layer.kind !== 'route') {
      return []
    }
    const coordinates = layer.points.map(({ lat, lng }) => [lng, lat])
    return {
      geometry:
        layer.kind === 'route'
          ? { coordinates, type: 'LineString' as const }
          : { coordinates: [[...coordinates, coordinates[0]]], type: 'Polygon' as const },
      properties: {
        ...(layer.casing ? { casing: layer.casing } : {}),
        color: layer.color,
        ...(layer.faded ? { faded: true } : {}),
        ...(layer.pattern ? { pattern: layer.pattern } : {}),
        kind: layer.kind,
        label: layer.label,
      },
      type: 'Feature' as const,
    }
  }),
  type: 'FeatureCollection',
})

/** A buildings layer's style layer, one per element. */
const buildingsLayer = (id: string): string => `helix-buildings-${id}`

/** The kinds of layer drawn apart from the routes, areas, and points. */
const EXTRAS = new Set<MapLayerSpec['kind']>(['buildings', 'raster', 'terrain'])

/** A terrain layer's hill shading, one style layer. */
const terrainLayer = (id: string): string => `helix-terrain-${id}`

/**
 * A terrain layer's sources: one for the shading and one for the raised
 * ground, since MapLibre draws both better from sources of their own.
 */
const terrainSource = (id: string, use: 'dem' | 'shade'): string => `helix-terrain-${id}-${use}`

/** A raster layer's frame, one source and one style layer each, so every frame's tiles stay loaded. */
const rasterFrame = (id: string, at: number): string => `helix-raster-${id}-${at}`

/**
 * The buildings raised to the heights the tiles record, where the tiles mark a
 * building as one to raise.
 */
export const buildingsExtrusion = (spec: MapLayerSpec, source: string) => ({
  filter: ['!=', ['get', 'hide_3d'], true],
  id: buildingsLayer(spec.id),
  minzoom: 13,
  paint: {
    'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
    'fill-extrusion-color': spec.color,
    'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0],
    'fill-extrusion-opacity': 0.9,
  },
  source,
  'source-layer': 'building',
  type: 'fill-extrusion' as const,
})

/** A points layer's source, one each, since MapLibre clusters by source. */
const pointsSource = (id: string): string => `helix-points-${id}`

/**
 * A points layer's points as GeoJSON, each carrying where it is in the list,
 * which is how a press finds it again.
 */
const pointsJson = (points: MapLayerSpec['points']) => ({
  features: points.map(({ lat, lng }, at) => ({
    geometry: { coordinates: [lng, lat], type: 'Point' as const },
    properties: { at },
    type: 'Feature' as const,
  })),
  type: 'FeatureCollection' as const,
})

/**
 * A points layer's style layers, bottom up: a halo round each count, the
 * count's circle, the count, and the points on their own. **A count grows by
 * the step**, so a hundred reads larger than ten at a glance rather than by
 * its figures alone; **its figures take the style's own face**, the one its
 * place names are set in, since a style carries only the faces it names.
 */
export const pointsLayers = (
  id: string,
  spec: MapLayerSpec,
  font: unknown,
): {
  id: string
  layout?: Record<string, unknown>
  paint: Record<string, unknown>
  type: string
}[] => {
  const source = pointsSource(id)
  const clustered = ['has', 'point_count']
  const size = ['step', ['get', 'point_count'], 14, 25, 17, 100, 21, 1000, 26]
  return [
    {
      id: `${source}-halo`,
      paint: {
        'circle-color': spec.color,
        'circle-opacity': 0.22,
        'circle-radius': ['+', size, 6],
      },
      type: 'circle',
    },
    {
      id: `${source}-clusters`,
      paint: {
        'circle-color': spec.color,
        'circle-radius': size,
        'circle-stroke-color': spec.casing ?? spec.color,
        'circle-stroke-width': 2,
      },
      type: 'circle',
    },
    {
      id: `${source}-count`,
      layout: {
        'text-allow-overlap': true,
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': font,
        'text-size': 12,
      },
      paint: { 'text-color': spec.ink ?? '#ffffff' },
      type: 'symbol',
    },
    {
      id: `${source}-points`,
      paint: {
        'circle-color': spec.color,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 15, 6],
        'circle-stroke-color': spec.casing ?? spec.color,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 15, 1.5],
      },
      type: 'circle',
    },
  ].map((layer, at) => ({
    ...layer,
    filter: at === 3 ? ['!', clustered] : clustered,
    source,
  })) as never
}

/** How MapLibre is told to move: over a time and a curve, or at once. */
interface MapLibreAnimation {
  animate?: boolean
  duration?: number
  easing?: (t: number) => number
}

/**
 * The part of a MapLibre `Map` the driver uses, so this package imports no
 * renderer and a page brings whichever version it has.
 */
export interface MapLibreMap {
  /** The canvas, which MapLibre makes focusable. */
  getCanvas(): HTMLElement
  /** The element the map was made in, which holds its controls. */
  getContainer(): HTMLElement
  /**
   * Adds a style layer, under the one named where one is. **Typed `never`**
   * because MapLibre types a layer as its whole style specification, which
   * this package does not import; what the driver adds is held to MapLibre's
   * own validator by a spec instead, which is a stricter check than a type.
   */
  addLayer(layer: never, beforeId?: string): unknown
  /** Adds a source, which the frame's routes and areas are one of. `never` for `addLayer`'s reason. */
  addSource(id: string, source: never): unknown
  /** Frames a stretch of the world, west-south then east-north. */
  fitBounds(
    bounds: [[number, number], [number, number]],
    options?: MapLibreAnimation & { padding?: MapPadding },
  ): unknown
  /** A layer by its id, or nothing where there is none. */
  getLayer(id: string): unknown
  /**
   * A source by its id: `attribution` is its credit, `setData` what redraws a
   * GeoJSON one, and `getClusterExpansionZoom` how far in a count comes apart.
   */
  getSource(id: string):
    | {
        attribution?: string | undefined
        getClusterExpansionZoom?(clusterId: number): Promise<number>
        setData?(data: never): unknown
      }
    | undefined
  /** The style as it stands: its sources are the ones to credit, and its layers what to draw under. */
  getStyle():
    | {
        layers?:
          | {
              id: string
              layout?: unknown
              source?: string
              'source-layer'?: string
              type: string
            }[]
          | undefined
        sources?: Record<string, unknown> | undefined
      }
    | undefined
  /** Which way the view is turned, in degrees clockwise from north. */
  getBearing(): number
  /** How far the view is tilted from looking straight down, in degrees. */
  getPitch(): number
  /** Goes to a place, gliding. */
  easeTo(
    options: MapLibreAnimation & {
      bearing?: number
      center?: [number, number]
      pitch?: number
      zoom?: number
    },
  ): unknown
  /** Goes to a place at once. */
  jumpTo(options: { center: [number, number]; zoom?: number }): unknown
  /** The arrow-key handler MapLibre adds unless told not to. */
  keyboard: { disable(): void; enable(): void; isEnabled(): boolean }
  off(
    type: 'click' | 'idle' | 'load' | 'mousemove' | 'move' | 'resize' | 'sourcedata' | 'styledata',
    listener: (event?: MapLibreEvent) => void,
  ): unknown
  on(
    type: 'click' | 'idle' | 'load' | 'mousemove' | 'move' | 'resize' | 'sourcedata' | 'styledata',
    listener: (event?: MapLibreEvent) => void,
  ): unknown
  removeLayer(id: string): unknown
  removeSource(id: string): unknown
  panBy(offset: [number, number], options?: MapLibreAnimation): unknown
  /** Where a place falls in the map's box, in pixels. */
  project(lngLat: [number, number]): { x: number; y: number }
  /** What is drawn in a box of the map's, of the layers named. */
  queryRenderedFeatures(
    box: [[number, number], [number, number]],
    options: { layers: string[] },
  ): {
    geometry: { coordinates?: unknown; type: string }
    layer: { id: string }
    properties: Record<string, unknown> | null
  }[]
  /** The raised ground, where the map has one. */
  getTerrain?(): { source: string } | null | undefined
  /** Raises the ground from an elevation source, or lays it flat with `null`. */
  setTerrain?(terrain: { exaggeration?: number; source: string } | null): unknown
  /** Sets one paint property of one layer, which is how a points layer takes a new color. */
  setPaintProperty(layer: string, name: string, value: unknown): unknown
  /** Replaces the style, by a diff against the one it has where `diff` is set. `never` for `addLayer`'s reason. */
  setStyle(style: never, options?: { diff?: boolean }): unknown
  zoomIn(options?: MapLibreAnimation): unknown
  zoomOut(options?: MapLibreAnimation): unknown
}

/** The class MapLibre's own credit control draws, by its documented name. */
const CONTROL = '.maplibregl-ctrl-attrib'

/**
 * The page's motion as MapLibre takes it: its own duration and curve rather
 * than MapLibre's, so a map pans the way the page's panels slide.
 */
const animation = (motion: MapMotion | null): MapLibreAnimation =>
  motion ? { duration: motion.duration, easing: motion.easing } : { animate: false }

/** A turn and tilt the map is gliding to, and when it arrives. */
interface Aim {
  bearing: number
  pitch: number
  until: number
}

/* Where the last rotate or tilt was headed, per map. A press during the glide
   aims from there: two quick presses turn the map twice as far, and a tilt
   does not stop a turn partway. After the glide, a press aims from the view,
   which a user may have dragged since. */
const aims = new WeakMap<MapLibreMap, Aim>()

const aimFrom = (map: MapLibreMap): Omit<Aim, 'until'> => {
  const aim = aims.get(map)
  return aim && performance.now() < aim.until
    ? aim
    : { bearing: map.getBearing(), pitch: map.getPitch() }
}

const turn = (map: MapLibreMap, bearing: number, pitch: number, motion: MapMotion | null): void => {
  aims.set(map, { bearing, pitch, until: performance.now() + (motion?.duration ?? 0) })
  map.easeTo({ bearing, pitch, ...animation(motion) })
}

/**
 * Drives a MapLibre map from the Map frame.
 *
 * **The credit is every source's `attribution`**, read again whenever a style
 * or a source changes, since a vector source learns its credit from its
 * TileJSON after the style has loaded. **MapLibre's own credit control is
 * hidden while connected** rather than removed, because the map was made with
 * it and there is no public way to take it off: making the map with
 * `attributionControl: false` avoids it altogether, and is the better way.
 */
export const mapLibreDriver = (map: MapLibreMap): MapDriver => ({
  bearing: () => map.getBearing(),
  credits(changed) {
    const control = map.getContainer().querySelector<HTMLElement>(CONTROL)
    const display = control?.style.display ?? ''
    if (control) {
      control.style.display = 'none'
    }
    /* **A source's credit arrives with its metadata**, and only then: every
       tile it loads and every route redrawn is a `sourcedata` as well, and
       reading every source's credit for each serialized the whole style. */
    const learned = (event?: MapLibreEvent): void => {
      if (event?.sourceDataType === 'metadata') {
        changed()
      }
    }
    map.on('styledata', changed)
    map.on('sourcedata', learned)
    return {
      read: () =>
        Object.keys(map.getStyle()?.sources ?? {})
          .map((id) => map.getSource(id)?.attribution ?? '')
          .filter((one) => one !== ''),
      stop: () => {
        map.off('styledata', changed)
        map.off('sourcedata', learned)
        if (control) {
          control.style.display = display
        }
      },
    }
  },
  fit: ({ northEast, southWest }, padding, motion) => {
    map.fitBounds(
      [
        [southWest.lng, southWest.lat],
        [northEast.lng, northEast.lat],
      ],
      { ...animation(motion), padding },
    )
  },
  focusTarget: () => map.getCanvas(),
  /* **Under the place names**, which is the one thing a page drawing its own
     canvas over the map could not do: a route crossing a city is under the
     city's name, not through it. And **drawn again whenever the style is
     replaced**: a page re-theming its map with `setStyle` hands MapLibre a
     style without these, and the diff takes them away, so they come back on
     the next `styledata` with their colors read again, which is how a
     route follows the theme. */
  layers: (read, events) => {
    /* The points layers drawn, by spec id: whether each clusters, and the
       points it was last handed, which a redraw for a color does not resend. */
    const drawnPoints = new Map<string, { cluster: boolean; points: MapLayerSpec['points'] }>()
    const takeOff = (id: string): void => {
      const source = pointsSource(id)
      for (const suffix of ['points', 'count', 'clusters', 'halo']) {
        if (map.getLayer(`${source}-${suffix}`)) {
          map.removeLayer(`${source}-${suffix}`)
        }
      }
      if (map.getSource(source)) {
        map.removeSource(source)
      }
    }
    /* **Points over everything the style draws**, their counts included:
       they are the page's own data, and a place name over them hid them. */
    const drawPoints = (specs: MapLayerSpec[]): void => {
      /* **An upright face from the style's own**, bold where it has one: the
         first a style names can be its water's italic, which set every count
         at a slant. */
      const faces = (map.getStyle()?.layers ?? [])
        .filter((layer) => layer.type === 'symbol')
        .map((layer) => (layer.layout as Record<string, unknown> | undefined)?.['text-font'])
        .filter(
          (face): face is string[] =>
            Array.isArray(face) && face.every((one) => typeof one === 'string'),
        )
        .filter((face) => !face.some((one) => /italic/i.test(one)))
      const font = faces.find((face) => face.some((one) => /bold/i.test(one))) ??
        faces[0] ?? ['Noto Sans Regular']
      const wanted = new Set(specs.map((spec) => spec.id))
      for (const id of [...drawnPoints.keys()]) {
        if (!wanted.has(id)) {
          takeOff(id)
          drawnPoints.delete(id)
        }
      }
      for (const spec of specs) {
        const id = pointsSource(spec.id)
        const cluster = spec.cluster === true
        const had = drawnPoints.get(spec.id)
        /* Clustering is the source's, and a source is made clustering or not. */
        if (had && had.cluster !== cluster) {
          takeOff(spec.id)
        }
        const source = map.getSource(id)
        if (source?.setData) {
          if (had?.points !== spec.points) {
            source.setData(pointsJson(spec.points) as never)
          }
          for (const layer of pointsLayers(spec.id, spec, font)) {
            for (const [name, value] of Object.entries(layer.paint)) {
              map.setPaintProperty(layer.id, name, value)
            }
          }
        } else {
          try {
            map.addSource(id, {
              cluster,
              /* Apart from street level on, where a block of six is six
                 places a reader can tell apart. */
              clusterMaxZoom: 14,
              clusterRadius: 44,
              data: pointsJson(spec.points),
              type: 'geojson',
            } as never)
          } catch {
            continue
          }
          for (const layer of pointsLayers(spec.id, spec, font)) {
            map.addLayer(layer as never)
          }
        }
        drawnPoints.set(spec.id, { cluster, points: spec.points })
      }
    }
    /* **Buildings, raster, and terrain layers**, by spec id, with what each
       was drawn from: the buildings' color, a raster layer's tile URLs, a
       terrain layer's tiles and how it raises the ground. */
    const drawnExtras = new Map<string, { kind: 'buildings' | 'raster' | 'terrain'; key: string }>()
    const takeOffExtra = (id: string): void => {
      const had = drawnExtras.get(id)
      if (had?.kind === 'terrain') {
        if (map.getLayer(terrainLayer(id))) {
          map.removeLayer(terrainLayer(id))
        }
        /* The ground laid flat before its source goes, which MapLibre
           refuses to take away from under it. */
        if (map.getTerrain?.()?.source === terrainSource(id, 'dem')) {
          map.setTerrain?.(null)
        }
        for (const use of ['dem', 'shade'] as const) {
          if (map.getSource(terrainSource(id, use))) {
            map.removeSource(terrainSource(id, use))
          }
        }
      } else if (had?.kind === 'buildings') {
        if (map.getLayer(buildingsLayer(id))) {
          map.removeLayer(buildingsLayer(id))
        }
      } else if (had?.kind === 'raster') {
        for (let at = 0; at < had.key.split(' ').length; at += 1) {
          const name = rasterFrame(id, at)
          if (map.getLayer(name)) {
            map.removeLayer(name)
          }
          if (map.getSource(name)) {
            map.removeSource(name)
          }
        }
      }
      drawnExtras.delete(id)
    }
    /* **Under the frame's routes and areas, over the land**: the first of
       our layers where there is one, the place names where there is not. */
    const under = (): string | undefined =>
      map.getLayer(LAYERS[0]?.id ?? '')
        ? LAYERS[0]?.id
        : map.getStyle()?.layers?.find((layer) => layer.type === 'symbol')?.id
    /* **Imagery goes under the style's roads**, its first line, name, or
       raised building, so a photograph of the ground takes the place of the
       land and keeps the streets and names over it. */
    const underRoads = (): string | undefined =>
      map
        .getStyle()
        ?.layers?.find((layer) => ['fill-extrusion', 'line', 'symbol'].includes(layer.type))?.id
    const drawExtras = (specs: MapLayerSpec[]): void => {
      const wanted = new Set(specs.map((spec) => spec.id))
      for (const id of [...drawnExtras.keys()]) {
        if (!wanted.has(id)) {
          takeOffExtra(id)
        }
      }
      for (const spec of specs) {
        if (spec.kind === 'buildings') {
          /* The style's own building data, read from whichever source its
             building layer draws, so any OpenMapTiles style works. */
          const source = map
            .getStyle()
            ?.layers?.find((layer) => layer['source-layer'] === 'building')?.source
          if (!source) {
            continue
          }
          if (map.getLayer(buildingsLayer(spec.id))) {
            map.setPaintProperty(buildingsLayer(spec.id), 'fill-extrusion-color', spec.color)
          } else {
            try {
              map.addLayer(buildingsExtrusion(spec, source) as never, under())
            } catch {
              continue
            }
          }
          drawnExtras.set(spec.id, { key: spec.color, kind: 'buildings' })
          continue
        }
        if (spec.kind === 'terrain') {
          /* **Shaded at the ground**, under the roads as imagery is, and
             raised where it asks. A change of tiles or of how it is raised
             draws it again; a change of color is a paint. */
          const key = `${spec.src ?? ''}|${spec.encoding ?? ''}|${spec.maxZoom ?? ''}|${spec.raised ? (spec.exaggeration ?? 1) : ''}`
          if (drawnExtras.get(spec.id)?.key !== key) {
            takeOffExtra(spec.id)
          }
          const paint = {
            'hillshade-accent-color': spec.color,
            'hillshade-highlight-color': spec.highlight ?? spec.color,
            'hillshade-shadow-color': spec.color,
          }
          const shade = terrainLayer(spec.id)
          if (map.getLayer(shade)) {
            for (const [name, value] of Object.entries(paint)) {
              map.setPaintProperty(shade, name, value)
            }
          } else {
            try {
              const uses = spec.raised ? (['shade', 'dem'] as const) : (['shade'] as const)
              for (const use of uses) {
                if (!map.getSource(terrainSource(spec.id, use))) {
                  map.addSource(terrainSource(spec.id, use), {
                    ...(spec.attribution && use === 'shade'
                      ? { attribution: spec.attribution }
                      : {}),
                    encoding: spec.encoding ?? 'terrarium',
                    ...(spec.maxZoom === undefined ? {} : { maxzoom: spec.maxZoom }),
                    tileSize: 256,
                    tiles: [spec.src],
                    type: 'raster-dem',
                  } as never)
                }
              }
              map.addLayer(
                {
                  id: shade,
                  paint,
                  source: terrainSource(spec.id, 'shade'),
                  type: 'hillshade',
                } as never,
                underRoads(),
              )
              if (spec.raised) {
                map.setTerrain?.({
                  exaggeration: spec.exaggeration ?? 1,
                  source: terrainSource(spec.id, 'dem'),
                })
              }
            } catch {
              /* A style still loading refuses the source, and its `load` draws again. */
              continue
            }
          }
          drawnExtras.set(spec.id, { key, kind: 'terrain' })
          continue
        }
        const frames = spec.frames ?? []
        /* Where it is drawn and how deep its tiles go are its source's and
           its place's, so a change to either draws it again. No spaces, which
           count the frames. */
        const key = `${frames.join(' ')}|${spec.ground ? 'ground' : ''}|${spec.maxZoom ?? ''}`
        if (drawnExtras.get(spec.id)?.key !== key) {
          takeOffExtra(spec.id)
        }
        /* **Every frame loaded once and switched by opacity**, which is how
           a radar loop plays without a blank frame while tiles load. */
        for (const [at, url] of frames.entries()) {
          const name = rasterFrame(spec.id, at)
          const opacity = at === spec.frame ? (spec.opacity ?? 0.7) : 0
          if (map.getLayer(name)) {
            map.setPaintProperty(name, 'raster-opacity', opacity)
            continue
          }
          /* Only what a replaced style took away, which can be the layer
             and not its source. */
          try {
            if (!map.getSource(name)) {
              map.addSource(name, {
                ...(spec.attribution ? { attribution: spec.attribution } : {}),
                ...(spec.maxZoom === undefined ? {} : { maxzoom: spec.maxZoom }),
                tileSize: 256,
                tiles: [url],
                type: 'raster',
              } as never)
            }
            map.addLayer(
              {
                id: name,
                paint: { 'raster-fade-duration': 0, 'raster-opacity': opacity },
                source: name,
                type: 'raster',
              } as never,
              spec.ground ? underRoads() : under(),
            )
          } catch {
            /* A style still loading refuses both, and its `load` draws again. */
          }
        }
        drawnExtras.set(spec.id, { key, kind: 'raster' })
      }
    }
    /* The routes and areas as last drawn, so a redraw for a raster frame does
       not send the same GeoJSON again. */
    let drawnData = ''
    /* **Tried rather than asked about.** `isStyleLoaded()` waits for the
       tiles as well as the style, so on a fresh map it said no through every
       `styledata` and yes only after the last one, and no route was drawn
       until something restyled the map. A style that is not ready says so by
       refusing the source, and `load` comes after that. */
    const draw = (): void => {
      const specs = read()
      drawPoints(specs.filter((spec) => spec.kind === 'points'))
      const data = geoJson(specs)
      const source = map.getSource(SOURCE)
      if (source?.setData) {
        const json = JSON.stringify(data)
        if (json !== drawnData) {
          source.setData(data as never)
          drawnData = json
        }
        drawExtras(specs.filter((spec) => EXTRAS.has(spec.kind)))
        return
      }
      /* **Simplified by zoom, not smoothed.** A route is the router's path
         along the streets, and a curve fitted through it would cut the
         corners it turns and leave the street it is on, which is why no map
         app smooths one. What they do is draw fewer points zoomed out, and
         MapLibre does that per tile by `tolerance`: at its default a walk
         kept every stair-step at a kink, at 2 it began cutting corners
         through blocks, and at 1 it is the streets without the jitter, with
         every turn back as the map zooms in. */
      try {
        map.addSource(SOURCE, { data, tolerance: 1, type: 'geojson' } as never)
      } catch {
        return
      }
      drawnData = JSON.stringify(data)
      const labels = map.getStyle()?.layers?.find((layer) => layer.type === 'symbol')?.id
      for (const layer of LAYERS) {
        map.addLayer(layer as never, labels)
      }
      drawExtras(specs.filter((spec) => EXTRAS.has(spec.kind)))
    }
    /* A replaced style takes every layer of ours with it, the points' too. */
    const restore = (): void => {
      const lostExtras = [...drawnExtras.entries()].filter(([id, had]) =>
        had.kind === 'buildings'
          ? !map.getLayer(buildingsLayer(id))
          : had.kind === 'terrain'
            ? !map.getLayer(terrainLayer(id))
            : !map.getLayer(rasterFrame(id, 0)),
      )
      for (const [id] of lostExtras) {
        drawnExtras.delete(id)
      }
      if (
        !map.getSource(SOURCE) ||
        lostExtras.length > 0 ||
        [...drawnPoints.keys()].some((id) => !map.getSource(pointsSource(id)))
      ) {
        if (!map.getSource(SOURCE)) {
          drawnPoints.clear()
          drawnData = ''
        } else {
          for (const id of drawnPoints.keys()) {
            if (!map.getSource(pointsSource(id))) {
              drawnPoints.delete(id)
            }
          }
        }
        draw()
      }
    }
    /* **A press on a count zooms in to where it comes apart**, at the page's
       pace for a trip; **a press on a point is the page's**, told through the
       connector. What is under the pointer is asked in a box a finger wide,
       since a point is a few pixels across. */
    /* **A count comes apart where it is**, zoomed in to the zoom MapLibre
       says it does at, over the page's pace for a trip. */
    const expand = (id: string, cluster: number, center?: [number, number]): void => {
      const at =
        center ??
        (map
          .queryRenderedFeatures(
            [
              [0, 0],
              [map.getCanvas().clientWidth, map.getCanvas().clientHeight],
            ],
            { layers: [`${pointsSource(id)}-clusters`].filter((layer) => map.getLayer(layer)) },
          )
          .find((one) => one.properties?.cluster_id === cluster)?.geometry.coordinates as
          | [number, number]
          | undefined)
      if (!at) {
        return
      }
      void map
        .getSource(pointsSource(id))
        ?.getClusterExpansionZoom?.(cluster)
        .then((zoom) => {
          const motion = events?.motion() ?? null
          if (motion) {
            map.easeTo({ center: at, zoom, ...animation(motion) })
          } else {
            map.jumpTo({ center: at, zoom })
          }
        })
    }
    /* **What is drawn in view, each once**: a tile boundary can draw one
       point or count twice, and the walk takes it once. */
    const inView = (id: string): MapInView[] => {
      const layers = [`${pointsSource(id)}-clusters`, `${pointsSource(id)}-points`].filter(
        (layer) => map.getLayer(layer),
      )
      if (layers.length === 0) {
        return []
      }
      const canvas = map.getCanvas()
      const seen = new Set<string>()
      return map
        .queryRenderedFeatures(
          [
            [0, 0],
            [canvas.clientWidth, canvas.clientHeight],
          ],
          { layers },
        )
        .flatMap((one): MapInView[] => {
          const cluster = one.properties?.cluster_id
          const at = one.properties?.at
          const key =
            typeof cluster === 'number' ? `c:${cluster}` : typeof at === 'number' ? `p:${at}` : ''
          const coordinates = one.geometry.coordinates
          if (key === '' || seen.has(key) || !Array.isArray(coordinates)) {
            return []
          }
          seen.add(key)
          const [lng, lat] = coordinates as [number, number]
          return [
            typeof cluster === 'number'
              ? { cluster, count: Number(one.properties?.point_count ?? 0), place: { lat, lng } }
              : { at: at as number, place: { lat, lng } },
          ]
        })
    }
    const settled = (): void => {
      events?.settled?.()
    }
    const hit = (event?: MapLibreEvent) => {
      if (!event?.point || drawnPoints.size === 0) {
        return undefined
      }
      const layers = [...drawnPoints.keys()].flatMap((id) =>
        [`${pointsSource(id)}-clusters`, `${pointsSource(id)}-points`].filter((layer) =>
          map.getLayer(layer),
        ),
      )
      const { x, y } = event.point
      return map.queryRenderedFeatures(
        [
          [x - 6, y - 6],
          [x + 6, y + 6],
        ],
        { layers },
      )[0]
    }
    const pressed = (event?: MapLibreEvent): void => {
      const found = hit(event)
      if (!found) {
        return
      }
      const id = found.layer.id.replace(/^helix-points-/, '').replace(/-(clusters|points)$/, '')
      const cluster = found.properties?.cluster_id
      if (typeof cluster === 'number') {
        const [lng, lat] = found.geometry.coordinates as [number, number]
        expand(id, cluster, [lng, lat])
        return
      }
      const at = found.properties?.at
      if (typeof at === 'number') {
        events?.press(id, at)
      }
    }
    const pointing = (event?: MapLibreEvent): void => {
      map.getCanvas().style.cursor = hit(event) ? 'pointer' : ''
    }
    map.on('styledata', restore)
    map.on('load', restore)
    map.on('click', pressed)
    map.on('mousemove', pointing)
    map.on('idle', settled)
    draw()
    return {
      expand: (id, cluster) => expand(id, cluster),
      inView,
      stop: () => {
        map.off('styledata', restore)
        map.off('load', restore)
        map.off('click', pressed)
        map.off('mousemove', pointing)
        map.off('idle', settled)
        for (const id of drawnPoints.keys()) {
          takeOff(id)
        }
        drawnPoints.clear()
        for (const id of [...drawnExtras.keys()]) {
          takeOffExtra(id)
        }
        for (const layer of [...LAYERS].reverse()) {
          if (map.getLayer(layer.id)) {
            map.removeLayer(layer.id)
          }
        }
        if (map.getSource(SOURCE)) {
          map.removeSource(SOURCE)
        }
      },
      update: draw,
    }
  },
  onView: (moved) => {
    map.on('move', moved)
    map.on('resize', moved)
    return () => {
      map.off('move', moved)
      map.off('resize', moved)
    }
  },
  panBy: (x, y, motion) => {
    map.panBy([x, y], animation(motion))
  },
  project: ({ lat, lng }) => {
    const { x, y } = map.project([lng, lat])
    return { x, y }
  },
  rotate: ({ by, to }, motion) => {
    const { bearing, pitch } = aimFrom(map)
    turn(map, to ?? bearing + (by ?? 0), pitch, motion)
  },
  show: ({ lat, lng, zoom }, motion) => {
    const options = {
      center: [lng, lat] as [number, number],
      ...(zoom === undefined ? {} : { zoom }),
    }
    if (motion) {
      map.easeTo({ ...options, ...animation(motion) })
    } else {
      map.jumpTo(options)
    }
  },
  silenceKeyboard: () => {
    const was = map.keyboard.isEnabled()
    map.keyboard.disable()
    return () => {
      if (was) {
        map.keyboard.enable()
      }
    }
  },
  /* MapLibre holds the pitch to its own `maxPitch`, so only flat is held here. */
  tilt: ({ by, to }, motion) => {
    const { bearing, pitch } = aimFrom(map)
    turn(map, bearing, Math.max(0, to ?? pitch + (by ?? 0)), motion)
  },
  zoomBy: (direction, motion) => {
    if (direction > 0) {
      map.zoomIn(animation(motion))
    } else {
      map.zoomOut(animation(motion))
    }
  },
})

/** A theme followed: asked again at once where the page knows it moved, and stopped. */
export interface FollowedTheme {
  stop(): void
  update(): void
}

/**
 * Restyles `map` whenever the theme where `element` is moves, from `style`,
 * which is the page's own call to `mapLibreStyle` with the colors read there.
 *
 * **Heard where it happens**: a mode, a class, a theme or an inline token
 * on `element` or anything above it, or the reader's light or dark
 * preference, by `watchTheme`. A page that restyles some other way, a
 * stylesheet replaced, says so with `update()`.
 *
 * **Once a frame, and only where something changed.** A theme can move on
 * every keystroke, and a restyle is a diff and a redraw: the style is built
 * and compared with the last one set, so a move that draws the same map, or
 * a second in the same frame, sets nothing.
 *
 * **Waits out a stylesheet on its way back.** A swap takes the tokens away
 * for a frame or two, which is asked again the next frame, for a few seconds,
 * and then reported with what is missing rather than thrown out of a frame
 * with nobody to catch it.
 */
export const followTheme = (
  map: MapLibreMap,
  element: Element,
  style: (colors: MapColors) => unknown,
): FollowedTheme => {
  const first = colorsNow(element)
  let last = first ? JSON.stringify(style(first)) : ''
  let pending = 0
  let waited = 0
  const read = (): void => {
    pending = requestAnimationFrame(() => {
      const colors = colorsNow(element)
      if (!colors) {
        if (waited++ < PATIENCE) {
          read()
        } else {
          try {
            mapColorsFrom(element)
          } catch (error) {
            console.error(error)
          }
        }
        return
      }
      waited = 0
      const next = style(colors)
      const said = JSON.stringify(next)
      if (said !== last) {
        last = said
        map.setStyle(next as never, { diff: true })
      }
    })
  }
  const update = (): void => {
    cancelAnimationFrame(pending)
    waited = 0
    read()
  }
  const stopWatching = watchTheme(element, update)
  return {
    stop: () => {
      cancelAnimationFrame(pending)
      stopWatching()
    },
    update,
  }
}
