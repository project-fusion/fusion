import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Donut Chart, a ring a reader reads a slice at a time.
 * Both halves tap the ring at a point on it, as a finger reads a slice by its
 * angle, and walk the slices with the keys, and the comparison holds the two
 * records to each other: each move of the reading and each press it sends,
 * with the slice's row, and the words a screen reader is told.
 */

/** Four sources of sessions, as data, with the chart's props. */
const traffic = (props: Readonly<Record<string, boolean | number | string>> = {}): Setup => ({
  children: [],
  data: {
    caption: 'Sessions by source',
    columns: ['Source', 'Share'],
    rows: [
      ['Direct', 4200],
      ['Search', 3100],
      ['Referral', 1800],
      ['Social', 900],
    ],
  },
  props,
  tag: 'helix-donut-chart',
})

/** Donut charts: taps on the ring and in its hole, the keys on a whole and a half ring, and the locale. */
export const DONUT_CHART: readonly Scenario[] = [
  {
    family: 'donut-chart',
    intents: [
      /* Right of the middle on the band: Direct, from twelve to past five. */
      { kind: 'tap', part: 'plot', x: 0.86, y: 0.5 },
      /* Above and left of the middle: Referral, from about eight to eleven. */
      { kind: 'tap', part: 'plot', x: 0.21, y: 0.365 },
      /* The hole: no slice. */
      { kind: 'tap', part: 'plot', x: 0.5, y: 0.5 },
    ],
    name: 'a tap shows the slice under the finger and presses it, and the hole reads nothing',
    setup: traffic(),
  },
  {
    family: 'donut-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'focus shows the first slice, each arrow moves it, and Enter presses it',
    setup: traffic(),
  },
  {
    family: 'donut-chart',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
    ],
    name: 'Home and End go to the first and the last slice, and nothing moves past them',
    setup: traffic(),
  },
  {
    family: 'donut-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'the keys walk a half ring as they walk a whole one',
    setup: traffic({ sweep: 'half' }),
  },
  {
    family: 'donut-chart',
    intents: [{ kind: 'focus' }, { key: 'ArrowDown', kind: 'key' }],
    name: 'the slices are said in the locale, with where each stands in its words',
    setup: traffic({ locale: 'de', 'position-label': '{position} von {count}' }),
  },
]
