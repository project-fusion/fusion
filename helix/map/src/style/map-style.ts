import type { MapColors } from './map-colors.js'
import { contrast, cssColor, mix, parseColor, type Rgb } from './oklab.js'

/** Where the tiles and the type come from, where not OpenFreeMap, and how legible the type is. */
export interface MapStyleOptions {
  /**
   * The contrast ratio every label clears against the land it is haloed in.
   * 4.5 by default, WCAG's AA for text, and what a theme's contrast target
   * sets: a label that would fall short is drawn nearer the ink until it
   * does not, and one that clears it already keeps its place in the order.
   */
  contrast?: number | undefined
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
 * A MapLibre style in the page's theme.
 *
 * **Everything is the land moved toward something else**, in OKLab: the
 * water toward `info`, the parks toward `success`, the motorways and major
 * roads toward the brand, and the smaller roads, buildings, borders and labels
 * toward the ink by how much each has to be seen. So the same colors draw a
 * light map on a light theme and a dark map on a dark one, and a brand that
 * moves the palette moves the map with it. Only the
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
  const brand = need('primary')
  /* The brand for the roads a reader navigates by, motorways, trunks and
     primaries, and the ink for the rest: branded down to the tertiaries, a
     city's whole grid was the brand, and a blue brand ran into the water. */
  const branded = (amount: number): string => cssColor(mix(land, brand, amount))
  const water = mix(land, need('info'), 0.3)
  const green = mix(land, need('success'), 0.16)
  const language = options.language ?? 'en'
  const name = ['coalesce', ['get', `name:${language}`], ['get', 'name:latin'], ['get', 'name']]
  const halo = cssColor(land)
  const target = options.contrast ?? 4.5
  /* **A label as quiet as it was designed, and no quieter than the target.**
     Each is a step toward the ink, and the step is what orders them, a
     country name quieter than a city's; on a theme whose ink is already
     gray, the designed step fell short of AA against the halo. So each is
     taken further toward the ink only as far as it has to go, and a theme
     whose ink cannot clear the target at all gets the ink. */
  const legible = (from: Rgb, amount: number): string => {
    /* Measured as it will be drawn, rounded to eight bits a channel: the
       unrounded color cleared 7:1 and the one written out read 6.96. */
    const at = (step: number): Rgb => parseColor(cssColor(mix(from, ink, step))) as Rgb
    if (contrast(at(amount), land) >= target) {
      return cssColor(at(amount))
    }
    if (contrast(ink, land) < target) {
      return cssColor(ink)
    }
    let low = amount
    let high = 1
    for (let round = 0; round < 20; round++) {
      const middle = (low + high) / 2
      if (contrast(at(middle), land) >= target) {
        high = middle
      } else {
        low = middle
      }
    }
    return cssColor(at(high))
  }

  const road = (
    id: string,
    classes: string[],
    color: string,
    width: [[number, number], [number, number]],
    minzoom: number,
  ) => ({
    filter: ['all', lines, notTunnel, ['match', ['get', 'class'], classes, true, false]],
    id,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    minzoom,
    paint: { 'line-color': color, 'line-width': widen(...width) },
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
    paint: { 'text-color': legible(land, amount), 'text-halo-color': halo, 'text-halo-width': 1.5 },
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
          toward(0.14),
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
        toward(0.1),
        [
          [12, 0.5],
          [18, 10],
        ],
        12,
      ),
      road(
        'road-secondary',
        ['secondary', 'tertiary'],
        toward(0.16),
        [
          [10, 0.5],
          [18, 14],
        ],
        10,
      ),
      road(
        'road-major',
        ['primary', 'trunk'],
        branded(0.4),
        [
          [8, 0.5],
          [18, 16],
        ],
        8,
      ),
      road(
        'road-motorway',
        ['motorway'],
        branded(0.6),
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
          'text-color': legible(water, 0.55),
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
          'text-color': legible(water, 0.55),
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
        paint: {
          'text-color': legible(land, 0.6),
          'text-halo-color': halo,
          'text-halo-width': 1.5,
        },
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
