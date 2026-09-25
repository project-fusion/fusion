import type { MapColors } from './map-colors.js'
import { cssColor, mix, parseColor, type Rgb } from './oklab.js'

/** Where the tiles and the type come from, where not OpenFreeMap. */
export interface MapStyleOptions {
  /** The font glyphs, a URL with `{fontstack}` and `{range}` in it. */
  glyphs?: string | undefined
  /**
   * The language labels are written in, where the tiles carry it, falling back
   * to the Latin name and then the local one. `en` by default.
   */
  language?: string | undefined
  /** A TileJSON URL for vector tiles in the OpenMapTiles schema. */
  tiles?: string | undefined
}

/**
 * A MapLibre style, as far as this compiler writes one. Typed here rather than
 * imported, so this package still depends on no renderer; MapLibre's own
 * `StyleSpecification` accepts it.
 */
export interface MapLibreStyle {
  glyphs: string
  layers: Array<Record<string, unknown>>
  name: string
  sources: Record<string, Record<string, unknown>>
  version: 8
}

/** OpenFreeMap: OpenMapTiles-schema tiles with no key and no per-view billing. */
const OPENFREEMAP = {
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  tiles: 'https://tiles.openfreemap.org/planet',
}

const REGULAR = ['Noto Sans Regular']
const BOLD = ['Noto Sans Bold']
const ITALIC = ['Noto Sans Italic']

/** Width in pixels growing with the zoom, the way a road on paper is drawn wider close up. */
const widen = (from: [number, number], to: [number, number]): unknown[] => [
  'interpolate',
  ['exponential', 1.5],
  ['zoom'],
  from[0],
  from[1],
  to[0],
  to[1],
]

const lines = ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false]
const shapes = ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false]
const notTunnel = ['!=', ['get', 'brunnel'], 'tunnel']

/**
 * A MapLibre style in the page's theme, from four colors.
 *
 * **Everything is the land moved toward something else**, in OKLab: the
 * water toward `info`, the parks toward `success`, and roads, buildings,
 * borders and labels toward the ink by how much each has to be seen. So the
 * same four colors draw a light map on a light theme and a dark map on a dark
 * one, and a brand that moves the palette moves the map with it. Only the
 * labels reach most of the way to the ink, since a place name is the one thing
 * on a map somebody reads, and every one is haloed in the land.
 *
 * **The tiles are OpenFreeMap's**, in the OpenMapTiles schema, until Helix
 * serves its own in the same schema, which is why it is the schema this is
 * written against. Their credit arrives in the source's TileJSON, where
 * `connectMap` reads it.
 */
export const mapLibreStyle = (colors: MapColors, options: MapStyleOptions = {}): MapLibreStyle => {
  const need = (name: keyof MapColors): Rgb => {
    const parsed = parseColor(colors[name])
    if (!parsed) {
      throw new Error(
        `mapLibreStyle: \`${name}\` is \`${colors[name]}\`, and a map style takes #hex, rgb() or rgba(). mapColorsFrom() resolves a page's tokens to those.`,
      )
    }
    return parsed
  }
  const land = need('surface')
  const ink = need('foreground')
  const toward = (amount: number): string => cssColor(mix(land, ink, amount))
  const water = mix(land, need('info'), 0.3)
  const green = mix(land, need('success'), 0.16)
  const language = options.language ?? 'en'
  const name = ['coalesce', ['get', `name:${language}`], ['get', 'name:latin'], ['get', 'name']]
  const halo = cssColor(land)

  const road = (
    id: string,
    classes: string[],
    amount: number,
    width: [[number, number], [number, number]],
    minzoom: number,
  ) => ({
    filter: ['all', lines, notTunnel, ['match', ['get', 'class'], classes, true, false]],
    id,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    minzoom,
    paint: { 'line-color': toward(amount), 'line-width': widen(...width) },
    source: 'openmaptiles',
    'source-layer': 'transportation',
    type: 'line',
  })

  const place = (
    id: string,
    filter: unknown[],
    amount: number,
    size: [[number, number], [number, number]],
    font: string[],
    minzoom: number,
  ) => ({
    filter,
    id,
    layout: {
      'text-field': name,
      'text-font': font,
      'text-max-width': 8,
      'text-size': ['interpolate', ['linear'], ['zoom'], ...size[0], ...size[1]],
    },
    minzoom,
    paint: { 'text-color': toward(amount), 'text-halo-color': halo, 'text-halo-width': 1.5 },
    source: 'openmaptiles',
    'source-layer': 'place',
    type: 'symbol',
  })

  return {
    glyphs: options.glyphs ?? OPENFREEMAP.glyphs,
    layers: [
      { id: 'land', paint: { 'background-color': cssColor(land) }, type: 'background' },
      {
        filter: [
          'all',
          shapes,
          ['match', ['get', 'class'], ['wood', 'grass', 'wetland'], true, false],
        ],
        id: 'landcover',
        paint: { 'fill-color': cssColor(mix(land, green, 0.6)) },
        source: 'openmaptiles',
        'source-layer': 'landcover',
        type: 'fill',
      },
      {
        /* Not `historic`, which the schema keeps in the same layer: a
           heritage district is a boundary drawn round streets, and tinted
           green it read as a park across the middle of a city. */
        filter: ['all', shapes, ['!=', ['get', 'class'], 'historic']],
        id: 'park',
        paint: { 'fill-color': cssColor(green) },
        source: 'openmaptiles',
        'source-layer': 'park',
        type: 'fill',
      },
      {
        filter: ['all', shapes, notTunnel],
        id: 'water',
        paint: { 'fill-color': cssColor(water) },
        source: 'openmaptiles',
        'source-layer': 'water',
        type: 'fill',
      },
      {
        filter: ['all', lines, notTunnel],
        id: 'waterway',
        paint: { 'line-color': cssColor(water), 'line-width': widen([8, 0.5], [18, 6]) },
        source: 'openmaptiles',
        'source-layer': 'waterway',
        type: 'line',
      },
      {
        id: 'building',
        minzoom: 13,
        paint: { 'fill-color': toward(0.07), 'fill-outline-color': toward(0.12) },
        source: 'openmaptiles',
        'source-layer': 'building',
        type: 'fill',
      },
      {
        filter: [
          'all',
          lines,
          ['match', ['get', 'class'], ['rail', 'transit'], true, false],
          notTunnel,
        ],
        id: 'rail',
        minzoom: 11,
        paint: { 'line-color': toward(0.2), 'line-dasharray': [2, 2], 'line-width': 1 },
        source: 'openmaptiles',
        'source-layer': 'transportation',
        type: 'line',
      },
      {
        ...road(
          'path',
          ['path', 'track'],
          0.14,
          [
            [14, 0.5],
            [18, 2],
          ],
          14,
        ),
        paint: {
          'line-color': toward(0.14),
          'line-dasharray': [1.5, 1.5],
          'line-width': widen([14, 0.5], [18, 2]),
        },
      },
      road(
        'road-minor',
        ['minor', 'service'],
        0.1,
        [
          [12, 0.5],
          [18, 10],
        ],
        12,
      ),
      road(
        'road-major',
        ['primary', 'secondary', 'tertiary', 'trunk'],
        0.18,
        [
          [8, 0.5],
          [18, 16],
        ],
        8,
      ),
      road(
        'road-motorway',
        ['motorway'],
        0.26,
        [
          [5, 0.5],
          [18, 18],
        ],
        5,
      ),
      {
        filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
        id: 'border-country',
        paint: { 'line-color': toward(0.4), 'line-width': widen([3, 0.75], [12, 2]) },
        source: 'openmaptiles',
        'source-layer': 'boundary',
        type: 'line',
      },
      {
        filter: [
          'all',
          ['>=', ['get', 'admin_level'], 3],
          ['<=', ['get', 'admin_level'], 4],
          ['!=', ['get', 'maritime'], 1],
        ],
        id: 'border-state',
        minzoom: 3,
        paint: {
          'line-color': toward(0.28),
          'line-dasharray': [3, 2],
          'line-width': widen([3, 0.5], [12, 1.5]),
        },
        source: 'openmaptiles',
        'source-layer': 'boundary',
        type: 'line',
      },
      {
        filter: lines,
        id: 'label-water',
        layout: {
          'symbol-placement': 'line',
          'text-field': name,
          'text-font': ITALIC,
          'text-size': 12,
        },
        minzoom: 12,
        paint: {
          'text-color': cssColor(mix(water, ink, 0.55)),
          'text-halo-color': halo,
          'text-halo-width': 1.5,
        },
        source: 'openmaptiles',
        'source-layer': 'waterway',
        type: 'symbol',
      },
      {
        id: 'label-sea',
        layout: { 'text-field': name, 'text-font': ITALIC, 'text-max-width': 8, 'text-size': 13 },
        paint: {
          'text-color': cssColor(mix(water, ink, 0.55)),
          'text-halo-color': halo,
          'text-halo-width': 1.5,
        },
        source: 'openmaptiles',
        'source-layer': 'water_name',
        type: 'symbol',
      },
      {
        id: 'label-road',
        layout: {
          'symbol-placement': 'line',
          'text-field': name,
          'text-font': REGULAR,
          'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 18, 13],
        },
        minzoom: 13,
        paint: { 'text-color': toward(0.6), 'text-halo-color': halo, 'text-halo-width': 1.5 },
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        type: 'symbol',
      },
      place(
        'label-village',
        ['match', ['get', 'class'], ['village', 'hamlet', 'suburb', 'neighbourhood'], true, false],
        0.65,
        [
          [10, 10],
          [16, 14],
        ],
        REGULAR,
        11,
      ),
      place(
        'label-town',
        ['==', ['get', 'class'], 'town'],
        0.75,
        [
          [8, 11],
          [16, 16],
        ],
        REGULAR,
        8,
      ),
      place(
        'label-city',
        ['==', ['get', 'class'], 'city'],
        0.88,
        [
          [4, 11],
          [14, 20],
        ],
        BOLD,
        4,
      ),
      place(
        'label-state',
        ['==', ['get', 'class'], 'state'],
        0.55,
        [
          [4, 10],
          [8, 13],
        ],
        REGULAR,
        4,
      ),
      place(
        'label-country',
        ['==', ['get', 'class'], 'country'],
        0.8,
        [
          [2, 10],
          [6, 15],
        ],
        BOLD,
        2,
      ),
    ],
    name: 'Helix',
    sources: { openmaptiles: { type: 'vector', url: options.tiles ?? OPENFREEMAP.tiles } },
    version: 8,
  }
}
