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
 * The parts of Helix Maps, from the elements you write to the map data, each
 * at its real stage. The renderer is listed as MapLibre's or Leaflet's, since
 * Helix does not draw the map.
 */
export const MAP_STACK: readonly MapLayer[] = [
  {
    body: 'Markers, routes, areas, live positions, and data layers, written as HTML elements inside the map.',
    role: 'Elements',
    stage: 'Building',
    title: 'Layers',
  },
  {
    body: 'The box around the map, with pan and zoom buttons, keyboard controls, and a footer for the map credit.',
    role: 'Interface',
    stage: 'Active',
    title: 'The frame',
  },
  {
    body: 'Connects the frame to the renderer. It turns the frame’s buttons and keys into map movement and moves the renderer’s credit into the frame.',
    role: 'Integration',
    stage: 'Building',
    title: 'The connector',
  },
  {
    body: 'Draws the map. Use MapLibre, Leaflet, or a driver you write for another renderer.',
    owner: 'MapLibre or Leaflet',
    role: 'Rendering',
    title: 'The renderer',
  },
  {
    body: 'A MapLibre style made from your theme, with your brand color on the main roads and light and dark versions from the same settings.',
    role: 'Theme',
    stage: 'Building',
    title: 'The style',
  },
  {
    body: 'Map tiles we will build from OpenStreetMap and serve with no API key or per-view cost. Until then, maps use OpenFreeMap tiles, which use the same format.',
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

/** What Helix adds to a map, in three parts. */
export const MAP_PILLARS: readonly MapPillar[] = [
  {
    claim: 'Styled with your theme.',
    facts: [
      'Light and dark maps from the same theme.',
      'Your brand color on the main roads.',
      'Labels that meet your contrast target.',
      'Map movement that uses your theme’s motion settings.',
    ],
    name: 'Your brand',
  },
  {
    claim: 'Places and routes written as HTML.',
    facts: [
      'Add markers, routes, areas, and live positions as elements inside the map.',
      'Set their colors with the same tones as other Helix components.',
      'Change an attribute and the map updates.',
    ],
    name: 'HTML elements',
  },
  {
    claim: 'Works with MapLibre or Leaflet.',
    facts: [
      'Use the renderer and version you already have.',
      'Connect another renderer by writing a small driver.',
      'Map tiles from OpenStreetMap, with no API key.',
    ],
    name: 'Your renderer',
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
    body: 'Named places on the map. A marker can hold a letter or an icon, take a shape such as a ring or a pin, and be marked as passed once someone has visited it.',
    elements: ['<helix-map-marker>'],
    title: 'Markers',
  },
  {
    body: 'Markers that would overlap combine into one count, which splits apart as you zoom in. Places at the same address spread out when you press their count.',
    elements: ['<helix-map cluster>'],
    title: 'Clusters',
  },
  {
    body: 'Lines and shapes drawn under the map’s place names. A route can show how much of it has been traveled, and dotted sections for the walk to a place off the road.',
    elements: ['<helix-map-route>', '<helix-map-area>'],
    title: 'Routes and areas',
  },
  {
    body: 'A moving point or arrow, with a ring that shows how accurate its location is. Update its description, such as “Two stops away”, and screen readers announce it.',
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

/** Getting started, in three steps. */
export const MAP_STEPS: readonly MapStep[] = [
  {
    body: 'Install Helix, the map connector, and MapLibre.',
    code: 'bun add @fusion.dev/helix @fusion.dev/helix-map maplibre-gl',
    language: 'sh',
    title: 'Install',
  },
  {
    body: 'Add the map frame, an element for the renderer to draw in, and your places.',
    code: `<helix-map label="Our stores">
  <div id="map"></div>
  <helix-map-marker label="Flagship" lat="30.2672" lng="-97.7431"></helix-map-marker>
</helix-map>`,
    language: 'html',
    title: 'Write the map',
  },
  {
    body: 'Create the map with a style from your theme, then connect it to the frame.',
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

/**
 * The Maps page's words, which the page renders and its document serves.
 */
export const MAPS: PageCopy = {
  blocks: [
    {
      body: [
        'Add places, routes, and live positions to a map drawn by MapLibre or Leaflet, styled with your theme.',
      ],
      kicker: 'Helix Maps',
      title: 'Interactive maps in your brand’s colors',
    },
    {
      items: MAP_PILLARS.map((pillar) => ({
        body: `${pillar.claim} ${pillar.facts.join(' ')}`,
        name: pillar.name,
      })),
      kicker: 'Why Helix',
      title: 'What Helix adds to a map',
    },
    {
      body: [
        `Every café, bar, and restaurant in Austin, ${AUSTIN_PLACES.toLocaleString('en-US')} places, loaded from one GeoJSON file.`,
      ],
      kicker: 'Thousands of points',
      title: 'Thousands of places on one map',
    },
    {
      body: [
        'Each is an HTML element you place inside the map. Each takes a tone, such as primary or danger, for its color.',
      ],
      items: MAP_FEATURES.map((feature) => ({ body: feature.body, name: feature.title })),
      kicker: 'What you can add',
      title: 'Markers, routes, and live positions',
    },
    {
      items: MAP_STEPS.map((step) => ({ body: `${step.body} ${step.code}`, name: step.title })),
      kicker: 'Get started',
      title: 'Add a map in three steps',
    },
    {
      body: [
        'The parts of Helix Maps, from the elements you write to the map data. MapLibre or Leaflet draws the map itself.',
      ],
      items: MAP_STACK.map((layer) => ({
        body: `${layer.stage ?? layer.owner}. ${layer.body}`,
        name: layer.title,
      })),
      kicker: 'Under the hood',
      title: 'How it is built',
    },
  ],
  lede: 'Interactive maps styled with your theme. Add places, routes, live positions, and thousands of data points to a map drawn by MapLibre or Leaflet.',
  source: 'rendered by the page, which reads this module',
  title: 'Maps',
}
