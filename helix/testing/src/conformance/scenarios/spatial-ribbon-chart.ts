import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Spatial Ribbon Chart, a table's rows as places across and
 * its numeric columns as series, each series a ribbon in a box seen in 3D,
 * which a reader reads a reading at a time. Both halves walk the readings
 * with the keys, across from place to place and down and up from series to
 * series, land on a place with no value, and turn the view with Shift and an
 * arrow, which moves no reading. The comparison holds the two records to
 * each other: each move of the reading and each press it sends, with the
 * row, and the words a screen reader is told.
 */

/** Response times in two cities over three days, Wednesday's in Lima missing, as data. */
const latency = (): Setup => ({
  children: [],
  data: {
    caption: 'Latency',
    columns: ['Day', 'Oslo', 'Lima'],
    rows: [
      ['Mon', 40, 60],
      ['Tue', 30, 50],
      ['Wed', 70, null],
    ],
  },
  props: {},
  tag: 'helix-spatial-ribbon-chart',
})

/** Spatial ribbon charts: the keys across the places and among the series, and the view they turn. */
export const SPATIAL_RIBBON_CHART: readonly Scenario[] = [
  {
    family: 'spatial-ribbon-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'the across arrows walk the places, and Enter presses a reading',
    setup: latency(),
  },
  {
    family: 'spatial-ribbon-chart',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'End and Home go to the last and the first reading, and a place with no value says so',
    setup: latency(),
  },
  {
    family: 'spatial-ribbon-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Down and Up walk the series of a place, and Escape puts the reading away',
    setup: latency(),
  },
  {
    family: 'spatial-ribbon-chart',
    intents: [
      { kind: 'focus' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'Shift with an arrow turns the view and moves no reading',
    setup: latency(),
  },
]
