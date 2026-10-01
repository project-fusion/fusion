import {
  bed,
  firstAid,
  forkKnife,
  graduationCap,
  type HelixIcon,
  shoppingBag,
  star,
  train,
  tree,
  trophy,
} from '@fusion.dev/helix-icons'
import type { MapColors } from './map-colors.js'
import { contrast, cssColor, mix, parseColor, type Rgb, rehue } from './oklab.js'

/** Where the tiles and the type come from, where not OpenFreeMap, and how legible the type is. */
export interface MapStyleOptions {
  /**
   * The contrast ratio every label clears against the land it is haloed in.
   * 4.5 by default, WCAG's AA for text, and what a theme's contrast target
   * sets: a label that would fall short is drawn nearer the ink until it
   * does not, and one that clears it already keeps its place in the order.
   */
  contrast?: number | undefined
  /**
   * The typeface labels are drawn in, as one CSS font family the page has
   * loaded, such as what `mapFontFrom` reads from the theme. MapLibre draws
   * the letters in the page from it, so no glyphs are fetched. Absent, the
   * labels are Noto Sans from the glyph server.
   */
  font?: string | undefined
  /** The font glyphs, a URL with `{fontstack}` and `{range}` in it, where there is no `font`. */
  glyphs?: string | undefined
  /**
   * Draws the world as a globe when the map is zoomed out, turning into the
   * flat map as it zooms in. `true` by default. Set `false` for a flat map at
   * every zoom, which MapLibre 4 also needs, since it has no globe.
   */
  globe?: boolean | undefined
  /**
   * Which landmarks the map draws, each kind an icon in a hue of its own.
   * `true`, the default, draws every kind in `MAP_LANDMARKS`; `false` draws
   * none, for a map whose own markers are the places a reader is looking for;
   * a list draws those kinds and no others, such as `['nature', 'transit']`.
   *
   * **An option of the style, so it holds through a theme change.**
   * `followTheme` builds the style again from the same options when the mode
   * changes, where a page hiding the layers itself had them back on every
   * rebuild and had to learn their ids from this file to do it.
   */
  landmarks?: boolean | readonly MapLandmark[] | undefined
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
  glyphs?: string
  /**
   * What the driver draws for each image the layers name: a landmark's icon
   * on a disc in its color, and a highway's sign. `helix:images`, by id.
   */
  metadata: { 'helix:images': Record<string, MapImage> }
  layers: Array<Record<string, unknown>>
  name: string
  /** How the world is drawn: a globe, unless the style is asked for a flat map. */
  projection?: { type: 'globe' }
  /** The sky over the horizon and the atmosphere round a globe. */
  sky?: Record<string, unknown>
  sources: Record<string, Record<string, unknown>>
  version: 8
}

/** OpenFreeMap: OpenMapTiles-schema tiles with no key and no per-view billing. */
const OPENFREEMAP = {
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  tiles: 'https://tiles.openfreemap.org/planet',
}

/**
 * An image a style names and the driver draws when the map asks for it:
 * a landmark's icon on a disc, or a highway sign of a shape for its network.
 */
export type MapImage =
  | { color: string; icon: { content: string; viewBox: string }; ink: string; kind: 'landmark' }
  | {
      design: 'interstate' | 'plate' | 'state' | 'us'
      edge?: string | undefined
      fill?: string | undefined
      /** The CSS font family the number is drawn in, at bold. */
      font: string
      /** The number's color. */
      ink: string
      kind: 'sign'
    }

/**
 * The kinds of landmark the style draws, each an icon in a hue of its own, for
 * `MapStyleOptions.landmarks`.
 */
export const MAP_LANDMARKS = [
  'culture',
  'food',
  'health',
  'learning',
  'lodging',
  'nature',
  'shopping',
  'sport',
  'transit',
] as const

/** One kind of landmark, such as `nature` for parks and gardens. */
export type MapLandmark = (typeof MAP_LANDMARKS)[number]

/**
 * Landmarks by what they are, each group an icon and a hue: the schema's
 * `poi` classes, the kinds a reader looks for on a map. Anything else, a post
 * box or a fire hydrant, is not drawn.
 */
const LANDMARKS: readonly {
  classes: readonly string[]
  /** Everyday places, food and shops, which a city has on every block, wait for a closer zoom. */
  everyday?: true
  group: MapLandmark
  icon: HelixIcon
  /** Its hue, in degrees round OKLCH's wheel, at the brand's lightness and colorfulness. */
  hue: number
}[] = [
  {
    classes: ['park', 'garden', 'playground', 'campsite', 'golf', 'zoo'],
    group: 'nature',
    hue: 145,
    icon: tree,
  },
  {
    /* The schema's own class names, spelled as the tiles spell them. */
    classes: ['museum', 'art_gallery', 'theatre', 'cinema', 'castle', 'monument', 'attraction'], // dialect:quoted
    group: 'culture',
    hue: 350,
    icon: star,
  },
  {
    classes: ['college', 'school', 'university', 'library'],
    group: 'learning',
    hue: 65,
    icon: graduationCap,
  },
  {
    classes: ['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'beer', 'ice_cream', 'bakery'],
    everyday: true,
    group: 'food',
    hue: 45,
    icon: forkKnife,
  },
  { classes: ['lodging'], group: 'lodging', hue: 300, icon: bed },
  {
    classes: ['hospital', 'pharmacy', 'doctors', 'dentist'],
    group: 'health',
    hue: 20,
    icon: firstAid,
  },
  {
    classes: ['railway', 'ferry_terminal', 'aerialway'],
    group: 'transit',
    hue: 245,
    icon: train,
  },
  {
    classes: ['shop', 'grocery', 'clothing_store', 'alcohol_shop'],
    everyday: true,
    group: 'shopping',
    hue: 85,
    icon: shoppingBag,
  },
  { classes: ['stadium', 'pitch', 'swimming'], group: 'sport', hue: 190, icon: trophy },
]

/**
 * The highway signs by the schema's `network`, drawn as the Federal Highway
 * Administration draws them: the Interstate's red and blue shield, the US
 * route's white shield, and a white circle for a state route, the standard
 * marker where a state has none of its own. Every other network's number is
 * on a plate in the map's own colors.
 */
const SIGNS: Record<string, 'interstate' | 'state' | 'us'> = {
  'us-highway': 'us',
  'us-interstate': 'interstate',
  'us-state': 'state',
}

/**
 * A short name for what an image draws, from all of it.
 *
 * **Everything drawn is in the name**, because MapLibre keeps an image it
 * already has and a restyle's diff keeps the images too: named by its color
 * alone, with punctuation stripped, a landmark kept the light theme's ring on
 * a dark map, a sign kept the old typeface, and `rgb(1, 23, 4)` and
 * `rgb(12, 3, 4)` were one name. FNV-1a, which only has to tell descriptions
 * apart.
 */
const stamp = (drawn: unknown): string => {
  let hash = 0x811c9dc5
  for (const char of JSON.stringify(drawn)) {
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01000193) >>> 0
  }
  return hash.toString(36)
}

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
  /* **The theme's typeface, drawn in the page.** With no glyph URL, MapLibre
     draws each letter from the names in `text-font` as CSS font families and
     reads the weight from the first, so `Geist Bold, Geist` is Geist at 700. */
  const face = options.font
  const REGULAR = face ? [face] : ['Noto Sans Regular']
  const MEDIUM = face ? [`${face} Medium`, face] : ['Noto Sans Regular']
  const BOLD = face ? [`${face} Bold`, face] : ['Noto Sans Bold']
  const ITALIC = face ? [`${face} Italic`, face] : ['Noto Sans Italic']
  const glyphs = face ? options.glyphs : (options.glyphs ?? OPENFREEMAP.glyphs)
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

  /* **A hue for each kind of landmark**, at the brand's lightness and
     colorfulness: its own hue, so a museum and a hotel are told apart in a
     theme whose accent is its brand, and the brand's weight, so the set sits
     in the theme, light or dark. */
  const hued = (hue: number): Rgb => rehue(brand, hue)
  const images: Record<string, MapImage> = {}
  const landmarkImage: unknown[] = ['match', ['get', 'class']]
  const landmarkColor: unknown[] = ['match', ['get', 'class']]
  /* Only the kinds asked for, and their images with them, so a map that
     draws no landmarks carries no icon for one. */
  const kept = LANDMARKS.filter(({ group }) =>
    options.landmarks === undefined || options.landmarks === true
      ? true
      : options.landmarks !== false && options.landmarks.includes(group),
  )
  for (const { classes, group, hue, icon } of kept) {
    const color = cssColor(hued(hue))
    const image: MapImage = {
      color,
      icon: { content: icon.content, viewBox: icon.viewBox },
      ink: halo,
      kind: 'landmark',
    }
    const id = `helix-landmark-${group}-${stamp(image)}`
    images[id] = image
    landmarkImage.push([...classes], id)
    landmarkColor.push([...classes], legible(hued(hue), 0))
  }
  landmarkImage.push('')
  landmarkColor.push(legible(land, 0.6))
  const classesOf = (everyday: boolean): string[] =>
    kept.filter((one) => (one.everyday === true) === everyday).flatMap(({ classes }) => classes)
  /* **The signs, one description per design**, which the driver draws with
     each road's number in it: an image named for its design and number,
     `helix-sign-us|290`, as wide as the number. The numbers are in the
     theme's typeface at bold, where there is one. */
  const signFont = face ? `"${face}", sans-serif` : 'sans-serif'
  /* Every sign's name carries its typeface, the one thing the fixed designs
     share with the theme. */
  const signs = `helix-sign-${stamp(signFont)}-`
  images[`${signs}interstate`] = {
    design: 'interstate',
    font: signFont,
    ink: '#ffffff',
    kind: 'sign',
  }
  images[`${signs}us`] = { design: 'us', font: signFont, ink: '#1a1a1a', kind: 'sign' }
  images[`${signs}state`] = { design: 'state', font: signFont, ink: '#1a1a1a', kind: 'sign' }
  const plate: MapImage = {
    design: 'plate',
    edge: toward(0.5),
    fill: halo,
    font: signFont,
    ink: cssColor(ink),
    kind: 'sign',
  }
  const plateShape = `plate-${stamp(plate)}`
  images[`${signs}${plateShape}`] = plate
  const signShape: unknown[] = ['match', ['get', 'network']]
  for (const [network, shape] of Object.entries(SIGNS)) {
    signShape.push(network, shape)
  }
  signShape.push(plateShape)

  return {
    ...(glyphs ? { glyphs } : {}),
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
      {
        filter: [
          'all',
          ['has', 'ref'],
          ['<=', ['get', 'ref_length'], 6],
          ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false],
        ],
        id: 'label-shield',
        layout: {
          'icon-image': ['concat', signs, signShape, '|', ['get', 'ref']],
          'icon-rotation-alignment': 'viewport',
          'symbol-placement': 'line',
          'symbol-spacing': 320,
        },
        minzoom: 7,
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        type: 'symbol',
      },
      /* A layer only where it has a kind to draw: an empty list of classes
         is not a filter MapLibre accepts. */
      ...[false, true]
        .filter((everyday) => classesOf(everyday).length > 0)
        .map((everyday) => ({
          /* **Landmarks**: an icon on a disc in the hue of what the place is,
           and its name beside it in the same hue, the most important first
           where they would meet, and none without its name. A city's food
           and shops, which are on every block, wait for a closer zoom than
           its parks, museums, schools, and stations. */
          filter: ['match', ['get', 'class'], classesOf(everyday), true, false],
          id: everyday ? 'label-landmark-everyday' : 'label-landmark',
          layout: {
            'icon-image': landmarkImage,
            'symbol-sort-key': ['get', 'rank'],
            'text-anchor': 'left',
            'text-field': name,
            'text-font': MEDIUM,
            'text-justify': 'left',
            'text-max-width': 8,
            'text-offset': [1.1, 0],
            'text-size': 11,
          },
          minzoom: everyday ? 16 : 14,
          paint: { 'text-color': landmarkColor, 'text-halo-color': halo, 'text-halo-width': 1.5 },
          source: 'openmaptiles',
          'source-layer': 'poi',
          type: 'symbol',
        })),
      place(
        'label-village',
        ['match', ['get', 'class'], ['village', 'hamlet'], true, false],
        0.65,
        [
          [10, 10],
          [16, 14],
        ],
        REGULAR,
        11,
      ),
      {
        /* **Neighborhoods in spaced capitals**, quieter than the towns, as
           a map names a district rather than a place to go. */
        ...place(
          'label-neighbourhood',
          ['match', ['get', 'class'], ['suburb', 'neighbourhood', 'quarter'], true, false],
          0.55,
          [
            [11, 9],
            [16, 13],
          ],
          MEDIUM,
          11,
        ),
        layout: {
          'text-field': name,
          'text-font': MEDIUM,
          'text-letter-spacing': 0.12,
          'text-max-width': 8,
          'text-size': ['interpolate', ['linear'], ['zoom'], 11, 9, 16, 13],
          'text-transform': 'uppercase',
        },
      },
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
    metadata: { 'helix:images': images },
    name: 'Helix',
    ...(options.globe !== false
      ? {
          projection: { type: 'globe' as const },
          /* **An atmosphere round the globe**, so its edge shows against a
             page the land's own color, faded out as the map zooms in and
             the globe turns flat. The sky over a tilted horizon is the
             water's color, and meets the land at it. */
          sky: {
            'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
            'horizon-color': cssColor(land),
            'sky-color': cssColor(water),
            'sky-horizon-blend': 0.5,
          },
        }
      : {}),
    sources: { openmaptiles: { type: 'vector', url: options.tiles ?? OPENFREEMAP.tiles } },
    version: 8,
  }
}
