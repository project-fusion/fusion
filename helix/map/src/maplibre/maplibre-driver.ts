import type {
  MapDriver,
  MapInView,
  MapLayerSpec,
  MapPadding,
  MapType,
} from '../connect-map/connect-map.js'
import {
  type ContourLine,
  contourInterval,
  contoursOf,
  type HeightEncoding,
  type HeightTile,
  heightsFrom,
  joinedAcross,
  tilesCovering,
} from '../contours/contours.js'
import type { MapMotion } from '../motion/motion.js'
import { colorsNow, type MapColors, mapColorsFrom, PATIENCE } from '../style/map-colors.js'
import type { MapImage } from '../style/map-style.js'
import { cssColor, mix, oklch, parseColor, type Rgb } from '../style/oklab.js'
import { watchTheme } from '../theme/watch-theme.js'
import { drawMapImage, IMAGE_RATIO } from './map-images.js'

/** What MapLibre hands a listener, as far as the driver reads it. */
interface MapLibreEvent {
  /** On `styleimagemissing`: the image a layer names and the style has not got. */
  id?: string
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
const EXTRAS = new Set<MapLayerSpec['kind']>([
  'buildings',
  'contours',
  'landcover',
  'raster',
  'terrain',
])

/** A contours layer's lines and their labels, one GeoJSON source for both. */
const contoursSource = (id: string): string => `helix-contours-${id}`

/** A land cover layer's fill. */
const landcoverLayer = (id: string): string => `helix-landcover-${id}`

/**
 * The covers the schema names, each a color mixed into the land by how much
 * it covers the ground, at a lightness between a light and a dark land:
 * forest greener than grass, farmland wheat, sand tan, rock gray, ice pale.
 */
const COVERS: readonly [string, Rgb, number][] = [
  ['wood', oklch(0.55, 0.11, 145), 0.42],
  ['grass', oklch(0.68, 0.1, 130), 0.3],
  ['farmland', oklch(0.75, 0.08, 90), 0.32],
  ['wetland', oklch(0.62, 0.07, 185), 0.35],
  ['sand', oklch(0.8, 0.06, 80), 0.4],
  ['rock', oklch(0.62, 0.015, 60), 0.35],
  ['ice', oklch(0.93, 0.03, 230), 0.55],
]

/** No lines, for a contours layer while the map is too far out to draw any. */
const NO_LINES = { features: [], type: 'FeatureCollection' }

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
  /** The middle of the view, which a map-type picture is drawn around. */
  getCenter?(): { lat: number; lng: number }
  /** One layout property of one layer, read before it is set again. */
  getLayoutProperty?(layer: string, name: string): unknown
  /** How far the view is zoomed in. */
  getZoom?(): number
  /** The element the map was made in, which holds its controls. */
  getContainer(): HTMLElement
  /**
   * Adds a style layer, under the one named where one is. **Typed `never`**
   * because MapLibre types a layer as its whole style specification, which
   * this package does not import; what the driver adds is held to MapLibre's
   * own validator by a spec instead, which is a stricter check than a type.
   */
  addLayer(layer: never, beforeId?: string): unknown
  /** Adds an image a layer names, drawn at `pixelRatio` times its size. */
  addImage?(
    id: string,
    image: { data: Uint8Array; height: number; width: number },
    options?: { pixelRatio?: number },
  ): unknown
  /** Whether the style has an image of that id. */
  hasImage?(id: string): boolean
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
  /** The stretch of the world in view, which a contours layer traces the tiles of. */
  getBounds?(): { getEast(): number; getNorth(): number; getSouth(): number; getWest(): number }
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
    type:
      | 'click'
      | 'idle'
      | 'load'
      | 'mousemove'
      | 'move'
      | 'resize'
      | 'sourcedata'
      | 'moveend'
      | 'styledata'
      | 'styleimagemissing',
    listener: (event?: MapLibreEvent) => void,
  ): unknown
  on(
    type:
      | 'click'
      | 'idle'
      | 'load'
      | 'mousemove'
      | 'move'
      | 'resize'
      | 'sourcedata'
      | 'moveend'
      | 'styledata'
      | 'styleimagemissing',
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
  /** The view's projection, which on a globe says whether a place is on its far side. */
  transform?: { isLocationOccluded?(place: { lat: number; lng: number }): boolean }
  /** Sets one paint property of one layer, which is how a points layer takes a new color. */
  setPaintProperty(layer: string, name: string, value: unknown): unknown
  /** Sets one layout property of one layer, which is how the buildings are shown and hidden. */
  setLayoutProperty(layer: string, name: string, value: unknown): unknown
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

/** Whether the Satellite map type hides a map's own roads and names, per map. */
const bared = new WeakMap<MapLibreMap, boolean>()

/** A layer of the style's own that draws a road or a name: a line or a label, and not ours. */
const isLabel = (layer: { id: string; type: string }): boolean =>
  !layer.id.startsWith('helix-') && (layer.type === 'line' || layer.type === 'symbol')

/* Each line and label shown or hidden, where it is not already, since a
   layout set is itself a style change and one set on every `styledata`
   would be heard as another. */
const showLabels = (map: MapLibreMap, shown: boolean): void => {
  const visibility = shown ? 'visible' : 'none'
  for (const layer of map.getStyle()?.layers ?? []) {
    if (
      isLabel(layer) &&
      (map.getLayoutProperty?.(layer.id, 'visibility') ?? 'visible') !== visibility
    ) {
      map.setLayoutProperty(layer.id, 'visibility', visibility)
    }
  }
}

/** A small map drawn off the page and read back as a picture, which MapLibre's own class makes. */
interface PictureMap extends ImageHolder {
  getCanvas(): HTMLCanvasElement
  on(type: 'styleimagemissing', listener: (event?: MapLibreEvent) => void): unknown
  once(type: 'idle', listener: () => void): unknown
  remove(): void
}

/** What an image is added to: a map, the connected one or a picture's. */
type ImageHolder = Pick<MapLibreMap, 'addImage' | 'getStyle' | 'hasImage'>

/**
 * **Draws an image the style describes and the map has asked for**: a
 * landmark's icon or a highway sign, named in `helix:images` in the style's
 * metadata by `mapLibreStyle`. Nothing for an image of another's.
 */
const supplyImage = (holder: ImageHolder, id: string | undefined): void => {
  if (!id?.startsWith('helix-') || holder.hasImage?.(id)) {
    return
  }
  const style = holder.getStyle() as { metadata?: { 'helix:images'?: Record<string, MapImage> } }
  const image = style?.metadata?.['helix:images']?.[id]
  const drawn = image ? drawMapImage(image) : undefined
  if (drawn) {
    holder.addImage?.(id, drawn, { pixelRatio: IMAGE_RATIO })
  }
}

/** The width and height of a map-type picture, in CSS pixels, drawn at twice that. */
const PICTURE = { height: 90, width: 120 }

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
  /* Out of sight on a globe's far side; never on a flat map, whose
     projection says no to every place. */
  behind: ({ lat, lng }) => map.transform?.isLocationOccluded?.({ lat, lng }) === true,
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
  /* **Roads and names hidden for the Satellite map type**, and hidden again
     when a restyle for the theme brings them back. */
  labels: (shown) => {
    const heard = bared.has(map)
    bared.set(map, !shown)
    showLabels(map, shown)
    if (!heard) {
      map.on('styledata', () => {
        if (bared.get(map)) {
          showLabels(map, false)
        }
      })
    }
  },
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
    const drawnExtras = new Map<
      string,
      { kind: 'buildings' | 'contours' | 'landcover' | 'raster' | 'terrain'; key: string }
    >()
    /* **Contour lines, traced in the page.** The heights of each tile are
       read once, the lines of each tile at each interval traced once, and the
       tiles in view traced again after the map moves; a trace overtaken by
       another move is dropped. */
    const traced = new Map<string, MapLayerSpec>()
    const heights = new Map<string, Promise<HeightTile | undefined>>()
    const lines = new Map<string, ContourLine[]>()
    let tracing = 0
    const heightsOf = (
      url: string,
      tile: { x: number; y: number; z: number },
      encoding: HeightEncoding,
    ) => {
      const had = heights.get(url)
      if (had) {
        return had
      }
      const read = fetch(url)
        .then((response) => (response.ok ? response.blob() : undefined))
        .then((blob) => (blob ? createImageBitmap(blob) : undefined))
        .then((bitmap) => {
          if (!bitmap) {
            return undefined
          }
          const canvas = document.createElement('canvas')
          canvas.width = bitmap.width
          canvas.height = bitmap.height
          const context = canvas.getContext('2d', { willReadFrequently: true })
          if (!context) {
            return undefined
          }
          context.drawImage(bitmap, 0, 0)
          const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data
          return { ...tile, heights: heightsFrom(pixels, encoding), size: bitmap.width }
        })
        .catch(() => undefined)
      /* The last hundred tiles, which a map panned about keeps coming back to. */
      if (heights.size >= 100) {
        heights.delete(heights.keys().next().value as string)
      }
      heights.set(url, read)
      return read
    }
    const trace = async (): Promise<void> => {
      const run = ++tracing
      const zoom = map.getZoom?.() ?? 0
      const view = map.getBounds?.()
      for (const [id, spec] of traced) {
        const source = map.getSource(contoursSource(id))
        if (!source?.setData || !spec.src) {
          continue
        }
        if (zoom < 9 || !view) {
          source.setData(NO_LINES as never)
          continue
        }
        /* A tile at a zoom under the map's, fewer where the view is wide,
           as a tilted one is out to its horizon. */
        const bounds = {
          east: view.getEast(),
          north: view.getNorth(),
          south: view.getSouth(),
          west: view.getWest(),
        }
        let z = Math.min(spec.maxZoom ?? 15, Math.max(0, Math.floor(zoom) - 1))
        let tiles = tilesCovering(bounds, z)
        while (tiles.length > 24 && z > 0) {
          z -= 1
          tiles = tilesCovering(bounds, z)
        }
        const unit = spec.unit ?? 'meters'
        const interval = contourInterval(zoom, unit)
        const src = spec.src
        const read = await Promise.all(
          tiles.map((tile) =>
            heightsOf(
              src
                .replace('{z}', `${tile.z}`)
                .replace('{x}', `${tile.x}`)
                .replace('{y}', `${tile.y}`),
              tile,
              spec.encoding ?? 'terrarium',
            ),
          ),
        )
        if (run !== tracing) {
          return
        }
        const known = new Map(
          read.filter((tile) => tile !== undefined).map((tile) => [`${tile.x}/${tile.y}`, tile]),
        )
        const traced: ContourLine[] = []
        for (const tile of known.values()) {
          const key = `${spec.src}|${tile.z}/${tile.x}/${tile.y}|${interval}|${unit}`
          let found = lines.get(key)
          if (!found) {
            const across = 2 ** tile.z
            found = contoursOf(tile, interval, unit, (dx, dy) =>
              known.get(`${(tile.x + dx + across) % across}/${tile.y + dy}`),
            )
            if (lines.size >= 200) {
              lines.delete(lines.keys().next().value as string)
            }
            lines.set(key, found)
            /* A frame to the page between tiles, so a trace does not hold it. */
            await new Promise((next) => setTimeout(next, 0))
            if (run !== tracing) {
              return
            }
          }
          traced.push(...found)
        }
        const features = joinedAcross(traced).map((line) => ({
          geometry: { coordinates: line.coordinates, type: 'LineString' },
          properties: { elevation: line.elevation, index: line.index },
          type: 'Feature',
        }))
        source.setData({ features, type: 'FeatureCollection' } as never)
      }
    }
    const takeOffExtra = (id: string): void => {
      const had = drawnExtras.get(id)
      if (had?.kind === 'contours') {
        for (const layer of [contoursSource(id), `${contoursSource(id)}-label`]) {
          if (map.getLayer(layer)) {
            map.removeLayer(layer)
          }
        }
        if (map.getSource(contoursSource(id))) {
          map.removeSource(contoursSource(id))
        }
        traced.delete(id)
      } else if (had?.kind === 'landcover') {
        if (map.getLayer(landcoverLayer(id))) {
          map.removeLayer(landcoverLayer(id))
        }
      } else if (had?.kind === 'terrain') {
        if (map.getLayer(terrainLayer(id))) {
          map.removeLayer(terrainLayer(id))
        }
        /* The ground laid flat before its source goes, which MapLibre
           refuses to take away from under it. */
        if (map.getTerrain?.()?.source === terrainSource(id, 'dem')) {
          map.setTerrain?.(null)
        }
        lifts.delete(id)
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
    /* **Imagery goes over the style's land and under its roads**: after the
       last area the style fills, its buildings' footprints among them, and
       under the first line, name, or raised building after that. So a
       photograph of the ground takes the place of the land and the flat
       buildings, whose rooftops it shows, and keeps the streets and names
       over it. */
    const underRoads = (): string | undefined => {
      const layers = map.getStyle()?.layers ?? []
      const lastFill = layers.findLastIndex(
        (layer) => layer.type === 'fill' && !layer.id.startsWith('helix-'),
      )
      return layers
        .slice(lastFill + 1)
        .find((layer) => ['fill-extrusion', 'line', 'symbol'].includes(layer.type))?.id
    }
    /* **Raised only while the map is tilted.** Looking straight down, the
       buildings are the style's own flat footprints and the ground is flat,
       so the 3D button laying the map flat lays these flat too. */
    let standing = map.getPitch() > 0
    /* The raised ground each terrain layer asks for, by spec id. */
    const lifts = new Map<string, { exaggeration: number; source: string }>()
    const lift = (): void => {
      const [ground] = [...lifts.values()].slice(-1)
      if (standing && ground) {
        map.setTerrain?.(ground)
      } else if (map.getTerrain?.()?.source.startsWith('helix-terrain-')) {
        map.setTerrain?.(null)
      }
    }
    const stood = (): void => {
      const now = map.getPitch() > 0
      if (now === standing) {
        return
      }
      standing = now
      for (const [id, had] of drawnExtras) {
        if (had.kind === 'buildings' && map.getLayer(buildingsLayer(id))) {
          map.setLayoutProperty(buildingsLayer(id), 'visibility', standing ? 'visible' : 'none')
        }
      }
      lift()
    }
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
              map.addLayer(
                {
                  ...buildingsExtrusion(spec, source),
                  layout: { visibility: standing ? 'visible' : 'none' },
                } as never,
                under(),
              )
            } catch {
              continue
            }
          }
          drawnExtras.set(spec.id, { key: spec.color, kind: 'buildings' })
          continue
        }
        if (spec.kind === 'landcover') {
          /* **Over the style's own land cover and its parks**, from the
             source its land cover layer draws, so any OpenMapTiles style
             works; under its water and roads. Over the parks, since a park
             is a boundary drawn round the ground, and a national park drawn
             over it hid a valley's every meadow and forest. */
          const style = map.getStyle()?.layers ?? []
          const own = style.findIndex((layer) => layer['source-layer'] === 'landcover')
          const source = style[own]?.source
          const water = style.findIndex((layer) => layer['source-layer'] === 'water')
          const land = parseColor(spec.color)
          if (!source || !land) {
            continue
          }
          const fill: unknown[] = ['match', ['get', 'class']]
          for (const [cover, color, amount] of COVERS) {
            fill.push(cover, cssColor(mix(land, color, amount)))
          }
          fill.push('rgba(0, 0, 0, 0)')
          const layer = landcoverLayer(spec.id)
          if (map.getLayer(layer)) {
            map.setPaintProperty(layer, 'fill-color', fill)
          } else {
            try {
              map.addLayer(
                {
                  filter: ['match', ['get', 'class'], COVERS.map(([cover]) => cover), true, false],
                  id: layer,
                  paint: { 'fill-color': fill },
                  source,
                  'source-layer': 'landcover',
                  type: 'fill',
                } as never,
                water >= 0 ? style[water]?.id : underRoads(),
              )
            } catch {
              continue
            }
          }
          drawnExtras.set(spec.id, { key: spec.color, kind: 'landcover' })
          continue
        }
        if (spec.kind === 'contours') {
          /* **Lines under the roads, every fifth heavier and labeled with its
             height**, in the style's own upright face, haloed in its land. */
          const key = `${spec.src ?? ''}|${spec.encoding ?? ''}|${spec.maxZoom ?? ''}|${spec.unit ?? ''}`
          if (drawnExtras.get(spec.id)?.key !== key) {
            takeOffExtra(spec.id)
          }
          const source = contoursSource(spec.id)
          const style = map.getStyle()?.layers ?? []
          const face = style
            .filter((layer) => layer.type === 'symbol')
            .map((layer) => (layer.layout as Record<string, unknown> | undefined)?.['text-font'])
            .find(
              (one): one is string[] =>
                Array.isArray(one) && !one.some((name) => /italic|bold/i.test(String(name))),
            ) ?? ['Noto Sans Regular']
          const land = style.find((layer) => layer.type === 'background') as
            | { paint?: Record<string, unknown> }
            | undefined
          const halo = String(land?.paint?.['background-color'] ?? 'rgba(0, 0, 0, 0)')
          if (map.getSource(source)) {
            map.setPaintProperty(source, 'line-color', spec.color)
            map.setPaintProperty(`${source}-label`, 'text-color', spec.color)
          } else {
            try {
              map.addSource(source, { data: NO_LINES, type: 'geojson' } as never)
              /* One place for both, found before either is added: found
                 again after the lines, it was under them, and the lines
                 were drawn across their own labels. */
              const beneath = underRoads()
              map.addLayer(
                {
                  id: source,
                  layout: { 'line-join': 'round' },
                  paint: {
                    'line-color': spec.color,
                    'line-opacity': ['case', ['get', 'index'], 0.85, 0.55],
                    'line-width': ['case', ['get', 'index'], 1.1, 0.6],
                  },
                  source,
                  type: 'line',
                } as never,
                beneath,
              )
              map.addLayer(
                {
                  filter: ['get', 'index'],
                  id: `${source}-label`,
                  layout: {
                    'symbol-placement': 'line',
                    /* A label every 200 pixels along a line, where the line
                       turns by no more than 40 degrees under it: as close as
                       a printed map sets them, on lines traced from pixels. */
                    'symbol-spacing': 200,
                    'text-field': [
                      'concat',
                      ['to-string', ['get', 'elevation']],
                      spec.unit === 'feet' ? ' ft' : ' m',
                    ],
                    'text-font': face,
                    'text-max-angle': 40,
                    'text-size': 10,
                  },
                  paint: {
                    'text-color': spec.color,
                    'text-halo-color': halo,
                    'text-halo-width': 1.5,
                  },
                  source,
                  type: 'symbol',
                } as never,
                beneath,
              )
            } catch {
              continue
            }
          }
          traced.set(spec.id, spec)
          drawnExtras.set(spec.id, { key, kind: 'contours' })
          void trace()
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
                lifts.set(spec.id, {
                  exaggeration: spec.exaggeration ?? 1,
                  source: terrainSource(spec.id, 'dem'),
                })
                lift()
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
            : had.kind === 'contours'
              ? !map.getLayer(contoursSource(id))
              : had.kind === 'landcover'
                ? !map.getLayer(landcoverLayer(id))
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
    map.on('move', stood)
    const missing = (event?: MapLibreEvent): void => supplyImage(map, event?.id)
    map.on('styleimagemissing', missing)
    const moved = (): void => {
      if (traced.size > 0) {
        void trace()
      }
    }
    map.on('moveend', moved)
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
        map.off('move', stood)
        map.off('styleimagemissing', missing)
        map.off('moveend', moved)
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
  pitch: () => map.getPitch(),
  /* **A picture of the view in each map type**: one small map, off the page,
     made from this map's own style without the page's layers, drawn
     once per type with the imagery added or its roads and names hidden, and
     read back when it goes still. MapLibre's own class makes it, so this
     package still imports no renderer. */
  previews: async ({ imagery, types }) => {
    const center = map.getCenter?.()
    const zoom = map.getZoom?.()
    const style = map.getStyle() as
      | {
          layers?: { id: string; layout?: Record<string, unknown>; type: string }[]
          sources?: Record<string, unknown>
          terrain?: unknown
        }
      | undefined
    if (!center || zoom === undefined || !style) {
      return {}
    }
    const Picture = (
      map as unknown as { constructor: new (options: Record<string, unknown>) => PictureMap }
    ).constructor
    const box = document.createElement('div')
    box.style.cssText = `position:fixed;left:-10000px;top:0;width:${PICTURE.width}px;height:${PICTURE.height}px`
    document.body.append(box)
    const base = JSON.parse(JSON.stringify(style)) as NonNullable<typeof style>
    delete base.terrain
    /* **The base map alone**: the page's own routes, points, buildings,
       imagery, and terrain are taken out, so each picture shows the map type
       and not what is on it. */
    const ours = (id: string): boolean => id.startsWith('helix-')
    base.layers = (base.layers ?? []).filter((layer) => !ours(layer.id))
    base.sources = Object.fromEntries(
      Object.entries(base.sources ?? {}).filter(([id]) => !ours(id)),
    )
    const pictures: Partial<Record<MapType, string>> = {}
    try {
      for (const type of types) {
        if (type !== 'standard' && !imagery) {
          continue
        }
        const layers = base.layers.map((layer) =>
          isLabel(layer)
            ? {
                ...layer,
                layout: { ...layer.layout, visibility: type === 'satellite' ? 'none' : 'visible' },
              }
            : layer,
        )
        if (type !== 'standard' && imagery) {
          const lastFill = layers.findLastIndex(
            (layer) => layer.type === 'fill' && !layer.id.startsWith('helix-'),
          )
          layers.splice(lastFill + 1, 0, {
            id: 'helix-picture-imagery',
            source: 'helix-picture-imagery',
            type: 'raster',
          } as never)
        }
        const sources =
          type !== 'standard' && imagery
            ? {
                ...base.sources,
                'helix-picture-imagery': {
                  ...(imagery.maxZoom === undefined ? {} : { maxzoom: imagery.maxZoom }),
                  tileSize: 256,
                  tiles: [imagery.src],
                  type: 'raster',
                },
              }
            : base.sources
        const picture = new Picture({
          attributionControl: false,
          bearing: map.getBearing(),
          center: [center.lng, center.lat],
          container: box,
          fadeDuration: 0,
          interactive: false,
          /* Flat, from above, as map types are compared. */
          pitch: 0,
          pixelRatio: 2,
          preserveDrawingBuffer: true,
          style: { ...base, layers, sources },
          zoom: Math.max(0, zoom - 1.5),
        })
        picture.on('styleimagemissing', (event) => supplyImage(picture, event?.id))
        await new Promise<void>((done) => {
          const late = setTimeout(done, 6000)
          picture.once('idle', () => {
            clearTimeout(late)
            done()
          })
        })
        pictures[type] = picture.getCanvas().toDataURL('image/jpeg', 0.85)
        picture.remove()
      }
    } finally {
      box.remove()
    }
    return pictures
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
