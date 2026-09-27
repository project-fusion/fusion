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
    body: 'The box around the map, with a column of controls, keyboard controls, and a footer for the map credit. The controls are zoom buttons, a compass, a 3D button, and a layers menu.',
    role: 'Interface',
    stage: 'Active',
    title: 'The frame',
  },
  {
    body: 'Connects the frame to the renderer. It turns the frame’s buttons and keys into map movement, draws the layers you add, and moves the renderer’s credit into the frame.',
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
    body: 'A MapLibre style made from your theme, with your brand color on the main roads and light and dark versions from the same settings. It draws landmarks, highway signs, and labels in your theme’s typeface.',
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
      'Labels, landmarks, and highway signs in your theme’s typeface.',
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
      'Add terrain, 3D buildings, satellite imagery, and weather radar the same way.',
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

/** What a map can show under your places, each an element a page writes inside the frame. */
export const MAP_LAYERS: readonly MapFeature[] = [
  {
    body: 'Buildings raised to their real heights, from the map’s own tiles. Press the 3D button to tilt the map and see them, and press it again to lay them flat.',
    elements: ['<helix-map-buildings>'],
    title: '3D buildings',
  },
  {
    body: 'Hills and valleys shaded by their slopes. Add the raised attribute and the ground rises to its real height when you tilt the map.',
    elements: ['<helix-map-terrain>'],
    title: 'Terrain',
  },
  {
    body: 'Lines of equal height, closer together as you zoom in. Every fifth line is heavier and labeled with its height, in meters or feet.',
    elements: ['<helix-map-contours>'],
    title: 'Contour lines',
  },
  {
    body: 'The ground colored by what covers it, such as forest, farmland, sand, and ice. Each color is mixed into your theme’s land color.',
    elements: ['<helix-map-landcover>'],
    title: 'Land cover',
  },
  {
    body: 'Aerial photographs of the ground. The layers menu shows Standard, Hybrid, and Satellite as cards, each with a picture of the map.',
    elements: ['<helix-map-raster ground>'],
    title: 'Satellite imagery',
  },
  {
    body: 'Tiles laid over the map, such as weather radar, under your routes and place names. Give the layer several frames, such as the last hour of radar, and it plays them in order.',
    elements: ['<helix-map-raster frames>'],
    title: 'Weather radar',
  },
]

/** What every map draws from the style and the frame, each with the option that sets it. */
export const MAP_BASICS: readonly MapFeature[] = [
  {
    body: 'Parks, museums, schools, hotels, hospitals, and stations, each marked with an icon in a color for its kind. Cafés and shops appear as you zoom in to a street.',
    elements: ['mapLibreStyle(colors)'],
    title: 'Landmarks',
  },
  {
    body: 'Interstate, US route, and state route numbers on signs drawn from the official shapes, placed along the road.',
    elements: ['mapLibreStyle(colors)'],
    title: 'Highway signs',
  },
  {
    body: 'Place names, road names, and sign numbers in the typeface your theme uses. MapLibre draws the letters from the font your page has already loaded.',
    elements: ['mapLibreStyle(colors, { font })'],
    title: 'Your typeface',
  },
  {
    body: 'Zoom out and the world is drawn as a globe. It turns into the flat map as you zoom in.',
    elements: ['mapLibreStyle(colors, { globe: true })'],
    title: 'A globe',
  },
  {
    body: 'The compass needle points north as the map turns, and pressing it turns the map back to north. The 3D button tilts the map and raises its buildings and terrain.',
    elements: ['controls="compass tilt"'],
    title: 'A compass and a 3D button',
  },
  {
    body: 'One button opens a menu with a tile for each layer you add. Press a tile to turn its layer on or off. A route and its dotted legs share one tile.',
    elements: ['controls="layers"'],
    title: 'A layers menu',
  },
]

/** Elevation tiles, free and worldwide, that the terrain demo raises and traces contour lines from. */
export const ELEVATION = {
  attribution: 'Elevation from 3DEP and SRTM data, courtesy of the U.S. Geological Survey',
  src: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
}

/** Aerial photographs of the United States, in the public domain, that the demos offer as a map type. */
export const IMAGERY = {
  attribution: 'Imagery from USGS The National Map',
  src: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
}

/** The one command that installs a map, shown on the page with a link to the guide. */
export const MAP_INSTALL = 'bun add @fusion.dev/helix @fusion.dev/helix-map maplibre-gl'

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
      body: [
        'Terrain raises Yosemite Valley to its real height, contour lines trace its heights in feet, and land cover colors its forests and bare rock. Open the layers menu to switch to satellite imagery.',
      ],
      kicker: 'Terrain',
      title: 'Yosemite Valley in 3D',
    },
    {
      body: [
        'Each is an HTML element you place inside the map. Open the layers menu to turn each one on or off.',
      ],
      items: MAP_LAYERS.map((feature) => ({ body: feature.body, name: feature.title })),
      kicker: 'Layers',
      title: 'Terrain, buildings, imagery, and weather',
    },
    {
      body: [
        'The style Helix makes from your theme draws landmarks and highway signs on every map. An option on the style or the frame adds each of the rest.',
      ],
      items: MAP_BASICS.map((feature) => ({ body: feature.body, name: feature.title })),
      kicker: 'On every map',
      title: 'Landmarks, highway signs, and your typeface',
    },
    {
      body: [
        'Install Helix, the map connector, and MapLibre. The Maps guide shows how to add a map, connect it, and style it with your theme.',
        `\`${MAP_INSTALL}\``,
      ],
      kicker: 'Get started',
      title: 'Add a map to your site',
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
  lede: 'Interactive maps styled with your theme. Add places, routes, live positions, terrain, and thousands of data points to a map drawn by MapLibre or Leaflet.',
  source: 'rendered by the page, which reads this module',
  title: 'Maps',
}
