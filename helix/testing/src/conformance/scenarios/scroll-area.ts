import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Scroll Area, which sends `scroll` as its content moves
 * and `scrollend` once it comes to rest, as the web's scroller does.
 */

/** A named scroll area holding a few lines, on one axis where `orientation` names one. */
const area = (orientation?: 'horizontal' | 'vertical') =>
  el('helix-scroll-area', { label: 'Changes', ...(orientation ? { orientation } : {}) }, [
    'Added the export. Fixed the layout. Moved the settings. Renamed the project.',
  ])

/** Scroll areas: a scroll down on both axes and on one, and a scroll across. */
export const SCROLL_AREA: readonly Scenario[] = [
  {
    family: 'scroll-area',
    intents: [{ kind: 'scroll', x: 0, y: 40 }],
    name: 'a scroll down sends scroll, then scrollend once it rests',
    setup: area(),
  },
  {
    family: 'scroll-area',
    intents: [
      { kind: 'scroll', x: 0, y: 40 },
      { kind: 'scroll', x: 0, y: 80 },
    ],
    name: 'a vertical scroll area sends each scroll and each rest',
    setup: area('vertical'),
  },
  {
    family: 'scroll-area',
    intents: [{ kind: 'scroll', x: 30, y: 0 }],
    name: 'a scroll across sends scroll, then scrollend once it rests',
    setup: area('horizontal'),
  },
]
