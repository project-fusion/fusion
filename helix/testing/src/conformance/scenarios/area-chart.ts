import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Area Chart, the parts of a total over time a reader reads
 * a reading at a time. Both halves tap the plot at a point along it, as a finger reads the
 * reading in that slot, and walk the readings and the series of a reading
 * with the keys, and the comparison holds the two records to each other: each
 * move of the reading and each press it sends, with the reading's row and its
 * total, and the part the keys rest on, and the words a screen reader is told.
 */

/** Two plans over five months, as data, with the chart's props. */
const plans = (props: Readonly<Record<string, boolean | number | string>> = {}): Setup => ({
  children: [],
  data: {
    caption: 'Seats by plan',
    columns: ['Month', 'Team', 'Business'],
    rows: [
      ['Jan', 1180, 940],
      ['Feb', 1240, 1010],
      ['Mar', 1190, 1080],
      ['Apr', 1320, 1040],
      ['May', 1410, 1160],
    ],
  },
  props,
  tag: 'helix-area-chart',
})

/** One plan over five months. */
const seats = (): Setup => ({
  children: [],
  data: {
    caption: 'Seats a month',
    columns: ['Month', 'Seats'],
    rows: [
      ['Jan', 1180],
      ['Feb', 1240],
      ['Mar', 1190],
      ['Apr', 1320],
      ['May', 1410],
    ],
  },
  props: {},
  tag: 'helix-area-chart',
})

/** Area charts: taps along the plot, the keys along the readings and among the parts, shares, and the locale. */
export const AREA_CHART: readonly Scenario[] = [
  {
    family: 'area-chart',
    intents: [
      /* The third of five slots, March, and then the first, January. */
      { kind: 'tap', part: 'plot', x: 0.5, y: 0.5 },
      { kind: 'tap', part: 'plot', x: 0.1, y: 0.3 },
    ],
    name: 'a tap shows the reading in the slot under the finger and presses it',
    setup: plans(),
  },
  {
    family: 'area-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'focus shows the first reading, Right moves it, and Down and Up walk its parts',
    setup: plans(),
  },
  {
    family: 'area-chart',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'PageDown', kind: 'key' },
    ],
    name: 'Home and End go to the first and the last reading, and nothing moves past them',
    setup: plans(),
  },
  {
    family: 'area-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
    ],
    name: 'with one part, Down and Up move along the readings',
    setup: seats(),
  },
  {
    family: 'area-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'under share each part is said with its share of the total',
    setup: plans({ share: true }),
  },
  {
    family: 'area-chart',
    intents: [{ kind: 'focus' }, { key: 'ArrowRight', kind: 'key' }],
    name: 'the readings are said with where each stands in the words of the locale',
    setup: plans({ locale: 'de', 'position-label': '{position} von {count}' }),
  },
]
