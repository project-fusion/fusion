import type { PageCopy } from '@/content/copy/copy'
import { AUSTIN_PLACES } from './points'

/** A layer of the stack, and the stage it is at, or whose it is where it is not ours. */
export interface MapLayer {
  body: string
  /** Where a layer is somebody else's, which is said instead of a stage. */
  owner?: string
  /** What the layer is, in a word, over its name. */
  role: string
  stage?: 'Active' | 'Building' | 'Declared'
  title: string
}

/**
 * How Maps is built, from what a reader touches down to the data under it.
 *
 * **The stage is the real one**, as it is for Cortex's modules: a reader
 * deciding whether to build on this needs to know which parts exist. **And the
 * renderer is in the stack and said not to be ours**, because it is the one
 * part Helix does not draw, and a stack that left it out would describe a map
 * Helix renders itself, which is the claim this is careful not to make.
 */
export const MAP_STACK: readonly MapLayer[] = [
  {
    body: 'Places, routes, areas, a live position and data layers as elements inside the frame, rather than calls against a renderer’s API: named, in your tones, and walked with the arrow keys.',
    role: 'Elements',
    stage: 'Building',
    title: 'Layers',
  },
  {
    body: 'A named region around the map, with pan and zoom as buttons a screen reader can find. An embedded map is otherwise a canvas with no node in the accessibility tree at all.',
    role: 'Accessibility',
    stage: 'Active',
    title: 'The frame',
  },
  {
    body: 'One connection between the frame and the renderer: one tab stop, one set of keys, one set of zoom buttons, and the credit where the frame keeps it.',
    role: 'Integration',
    stage: 'Building',
    title: 'The connector',
  },
  {
    body: 'What draws the map. The connector takes either, or a driver of your own for anything else.',
    owner: 'MapLibre or Leaflet',
    role: 'Rendering',
    title: 'The renderer',
  },
  {
    body: 'A style drawn from your tokens: the brand for the roads you navigate by, the ink for the rest, light and dark from the same ones.',
    role: 'Theme',
    stage: 'Building',
    title: 'The style',
  },
  {
    body: 'Vector tiles built from OpenStreetMap and served without a key or a per-view bill. Until then the map draws OpenFreeMap’s, which are in the same schema.',
    role: 'Data',
    stage: 'Declared',
    title: 'Tiles',
  },
]

/** What a map gets from Helix, in three: each a claim and the facts under it. */
export interface MapPillar {
  claim: string
  facts: readonly string[]
  name: string
}

/**
 * The three things a map gets from Helix, which are the three things an
 * embedded map is usually missing: the page's look, a reader who cannot see
 * it, and a way out of one vendor's API.
 */
export const MAP_PILLARS: readonly MapPillar[] = [
  {
    claim: 'Drawn from your tokens.',
    facts: [
      'Light and dark from the same four colors, mixed in OKLab.',
      'Your brand on the roads a reader navigates by, your ink on the rest.',
      'Every label held to your contrast target.',
      'Pans and trips at your theme’s own pace.',
    ],
    name: 'In your theme',
  },
  {
    claim: 'A map a screen reader can find.',
    facts: [
      'A named region, with pan and zoom as buttons.',
      'Places as buttons on one tab stop, walked with the arrow keys.',
      'Routes, areas and data layers named in a list.',
      'A live position that speaks its news, not its every step.',
    ],
    name: 'For every reader',
  },
  {
    claim: 'Any renderer, one set of markup.',
    facts: [
      'MapLibre or Leaflet, or a driver of your own in an afternoon.',
      'No renderer bundled: bring the version you already have.',
      'The tiles’ credit kept where the frame shows it.',
      'OpenStreetMap tiles with no API key.',
    ],
    name: 'On your renderer',
  },
]

/** One of the things a map can hold, with the element that holds it. */
export interface MapFeature {
  body: string
  /** What a page writes for it. */
  elements: readonly string[]
  title: string
}

/** What a map holds, each an element a page writes inside the frame. */
export const MAP_FEATURES: readonly MapFeature[] = [
  {
    body: 'Named buttons standing on their places: lettered stops, pins and rings in your tones, with names that turn away from the edge of the view.',
    elements: ['<helix-map-marker>'],
    title: 'Markers',
  },
  {
    body: 'Places that would draw over each other gather into a count that comes apart as the map zooms in. Places at one address fan out when pressed.',
    elements: ['<helix-map cluster>'],
    title: 'Clusters',
  },
  {
    body: 'Drawn by the renderer under its own place names, dotted where they leave the road, and quieter behind whoever is traveling them.',
    elements: ['<helix-map-route>', '<helix-map-area>'],
    title: 'Routes and areas',
  },
  {
    body: 'An arrow with a heading and a ring as wide as its accuracy, measured on the map at every zoom, and a status that speaks politely.',
    elements: ['<helix-map-position>'],
    title: 'A live position',
  },
]

/** A step of getting started, and the code it is. */
export interface MapStep {
  body: string
  code: string
  language: 'html' | 'js' | 'sh'
  title: string
}

/**
 * Getting started, in three steps.
 *
 * **The package is named as it will be installed**, and the page says it is
 * not published yet rather than showing a command that fails: see
 * `MAPS_UNPUBLISHED`.
 */
export const MAP_STEPS: readonly MapStep[] = [
  {
    body: 'Helix, the connector, and the renderer you draw with.',
    code: 'bun add @fusion.dev/helix @fusion.dev/helix-map maplibre-gl',
    language: 'sh',
    title: 'Install',
  },
  {
    body: 'The frame, a box for the renderer, and your places as elements.',
    code: `<helix-map label="Our stores">
  <div id="map"></div>
  <helix-map-marker label="Flagship" lat="30.2672" lng="-97.7431"></helix-map-marker>
</helix-map>`,
    language: 'html',
    title: 'Write the map',
  },
  {
    body: 'A style from your tokens, the renderer, and one line connecting them.',
    code: `import '@fusion.dev/helix'
import 'maplibre-gl/dist/maplibre-gl.css'
import { colorsReady, connectMap } from '@fusion.dev/helix-map'
import { followTheme, mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import maplibregl from 'maplibre-gl'

const frame = document.querySelector('helix-map')
const style = (colors) => mapLibreStyle(colors)
const map = new maplibregl.Map({
  attributionControl: false,
  center: [-97.7431, 30.2672],
  container: 'map',
  style: style(await colorsReady(frame)),
  zoom: 13,
})

connectMap(frame, mapLibreDriver(map))
followTheme(map, frame, style)`,
    language: 'js',
    title: 'Connect it',
  },
]

/** Said under the steps until the package is on npm. */
export const MAPS_UNPUBLISHED =
  '@fusion.dev/helix-map is not on npm yet. It publishes with the next release of Helix, and these are the lines it will take.'

/**
 * The Maps page's words, which the page renders and its document serves.
 */
export const MAPS: PageCopy = {
  blocks: [
    {
      body: [
        'Pick a brand or a mode and only the map changes. Every color in it is mixed from the page’s own tokens.',
        'Places that would draw over each other gather into a count. The Driskill and its café share an address, so theirs fans out when pressed.',
      ],
      title: 'The map',
    },
    {
      body: [
        'An embedded map is usually a canvas in someone else’s colors that a screen reader cannot find. Helix puts it in your theme, in the accessibility tree, and on whichever renderer you use.',
      ],
      items: MAP_PILLARS.map((pillar) => ({
        body: `${pillar.claim} ${pillar.facts.join(' ')}`,
        name: pillar.name,
      })),
      kicker: 'Maps',
      title: 'A map that belongs to the page',
    },
    {
      body: [
        `Every café, bar and restaurant OpenStreetMap has in Austin, ${AUSTIN_PLACES.toLocaleString('en-US')} of them, from one GeoJSON file. The renderer draws and counts them as fast as it draws the roads, and a count pressed zooms in to what it holds.`,
      ],
      kicker: 'Thousands of points',
      title: 'One layer, not thousands of elements',
    },
    {
      body: ['Each is an element you write inside the frame, and each takes your tones.'],
      items: MAP_FEATURES.map((feature) => ({ body: feature.body, name: feature.title })),
      kicker: 'What it holds',
      title: 'Places, routes and a live position',
    },
    {
      body: [MAPS_UNPUBLISHED],
      items: MAP_STEPS.map((step) => ({ body: `${step.body} ${step.code}`, name: step.title })),
      kicker: 'Get started',
      title: 'A themed map in three steps',
    },
    {
      body: [
        'From what a reader touches down to the data underneath. The renderer is the one part that is not ours.',
      ],
      items: MAP_STACK.map((layer) => ({
        body: `${layer.stage ?? layer.owner}. ${layer.body}`,
        name: layer.title,
      })),
      kicker: 'Under the hood',
      title: 'How it is built',
    },
  ],
  lede: 'Maps in your theme. A frame a screen reader can find, one connector for whichever renderer draws the map, and a style made from the same tokens as the rest of the page.',
  source: 'rendered by the page, which reads this module',
  title: 'Maps',
}
