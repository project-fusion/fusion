import type { PageCopy } from '@/content/copy/copy'

/**
 * What Maps is made of, each with the stage it is actually at.
 *
 * **The stage is the real one**, as it is for Cortex's modules: a reader
 * deciding whether to build on this needs to know which parts exist, and a
 * page that lists only what ships describes a smaller idea than the one this
 * is.
 */
export const MAP_PARTS = [
  {
    body: 'A named region around any map, with pan and zoom as buttons a screen reader can find. An embedded map is otherwise a canvas with no node in the accessibility tree at all.',
    stage: 'Active',
    title: 'The frame',
  },
  {
    body: 'One connection between the frame and a renderer, MapLibre or Leaflet or one of your own: one tab stop, one set of keys, and the credit where the frame keeps it.',
    stage: 'Building',
    title: 'The connector',
  },
  {
    body: 'A MapLibre style drawn from four of your tokens, light and dark from the same four.',
    stage: 'Building',
    title: 'The style',
  },
  {
    body: 'Vector tiles built from OpenStreetMap and served without a key or a per-view bill. Until then the map draws OpenFreeMap’s, which are in the same schema.',
    stage: 'Declared',
    title: 'Tiles',
  },
  {
    body: 'Places, routes and positions as elements inside the frame, rather than calls against a renderer’s API.',
    stage: 'Declared',
    title: 'Layers',
  },
] as const

/**
 * The Maps page's words, which the page renders and its document serves.
 */
export const MAPS: PageCopy = {
  blocks: [
    {
      body: [
        'The map on this page is drawn in this site’s theme. Switch between light and dark, or change the brand color, and it follows: every color in it is mixed from four of the page’s own tokens.',
      ],
      title: 'The map',
    },
    {
      items: MAP_PARTS.filter((part) => part.stage !== 'Declared').map((part) => ({
        body: `${part.stage}. ${part.body}`,
        name: part.title,
      })),
      title: 'What is built',
    },
    {
      items: MAP_PARTS.filter((part) => part.stage === 'Declared').map((part) => ({
        body: `${part.stage}. ${part.body}`,
        name: part.title,
      })),
      title: 'What comes next',
    },
  ],
  lede: 'Maps in your theme. A frame a screen reader can find, one connector for whichever renderer draws the map, and a style made from the same tokens as the rest of the page.',
  source: 'rendered by the page, which reads this module',
  title: 'Maps',
}
