import type { PageCopy } from '@/content/copy/copy'

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
    body: 'Places as elements inside the frame, named buttons a reader can tab to and walk with the arrow keys, rather than calls against a renderer’s API. Routes, areas and a live position come next.',
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

/**
 * The Maps page's words, which the page renders and its document serves.
 */
export const MAPS: PageCopy = {
  blocks: [
    {
      body: [
        'Pick a brand or a mode and only the map changes. It starts in this site’s theme, and every color in it is mixed from the page’s own tokens.',
      ],
      title: 'The map',
    },
    {
      body: [
        'From what a reader touches down to the data underneath. The renderer is the one part that is not ours.',
      ],
      items: MAP_STACK.map((layer) => ({
        body: `${layer.stage ?? layer.owner}. ${layer.body}`,
        name: layer.title,
      })),
      title: 'How it is built',
    },
  ],
  lede: 'Maps in your theme. A frame a screen reader can find, one connector for whichever renderer draws the map, and a style made from the same tokens as the rest of the page.',
  source: 'rendered by the page, which reads this module',
  title: 'Maps',
}
