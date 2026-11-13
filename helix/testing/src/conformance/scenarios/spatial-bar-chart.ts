import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Spatial Bar Chart, a table's rows as categories and its
 * numeric columns as series, each place on the grid a block in a box seen in
 * 3D, which a reader reads a bar at a time. Both halves walk the bars with
 * the keys, across from category to category and down and up from series to
 * series, land on a place with no value, and turn the view with Shift and an
 * arrow, which moves no reading. The comparison holds the two records to each
 * other: each move of the reading and each press it sends, with the row, and
 * the words a screen reader is told.
 */

/** Sales in two quarters for three regions, South's second quarter missing, as data. */
const sales = (): Setup => ({
  children: [],
  data: {
    caption: 'Sales',
    columns: ['Region', 'Q1', 'Q2'],
    rows: [
      ['North', 40, 60],
      ['South', 30, null],
      ['West', 70, 20],
    ],
  },
  props: {},
  tag: 'helix-spatial-bar-chart',
})

/** Spatial bar charts: the keys across the categories and among the series, and the view they turn. */
export const SPATIAL_BAR_CHART: readonly Scenario[] = [
  {
    family: 'spatial-bar-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'the across arrows walk the categories, and Enter presses a bar',
    setup: sales(),
  },
  {
    family: 'spatial-bar-chart',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'End and Home go to the last and the first bar, and a place with no value says so',
    setup: sales(),
  },
  {
    family: 'spatial-bar-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Down and Up walk the series of a category, and Escape puts the reading away',
    setup: sales(),
  },
  {
    family: 'spatial-bar-chart',
    intents: [
      { kind: 'focus' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'Shift with an arrow turns the view and moves no reading',
    setup: sales(),
  },
]
