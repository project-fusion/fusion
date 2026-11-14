import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Spatial Treemap, a table's rows as blocks on a floor
 * shared out by their sizes, as tall as their heights, in a box seen in 3D,
 * which a reader reads a block at a time. Both halves walk the blocks with
 * the keys in the table's order and among a block's measures, go to the last
 * and the first, and turn the view with Shift and an arrow, which moves no
 * reading. The comparison holds the two records to each other: each move of
 * the reading and each press it sends, with the row, and the words a screen
 * reader is told.
 */

/** Four services by requests and response time, two in each region, as data. */
const services = (): Setup => ({
  children: [],
  data: {
    caption: 'Services',
    columns: ['Service', 'Region', 'Requests', 'Time'],
    rows: [
      ['Search', 'East', 400, 120],
      ['Cart', 'West', 250, 80],
      ['Login', 'East', 150, 40],
      ['Feed', 'West', 100, 200],
    ],
  },
  props: { 'group-by': 'Region' },
  tag: 'helix-spatial-treemap',
})

/** Spatial treemaps: the keys along the blocks, and the view they turn. */
export const SPATIAL_TREEMAP: readonly Scenario[] = [
  {
    family: 'spatial-treemap',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'the across arrows walk the blocks, and Enter presses one',
    setup: services(),
  },
  {
    family: 'spatial-treemap',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'End and Home go to the last and the first block',
    setup: services(),
  },
  {
    family: 'spatial-treemap',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Down and Up walk a block’s measures, and Escape puts the reading away',
    setup: services(),
  },
  {
    family: 'spatial-treemap',
    intents: [
      { kind: 'focus' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'Shift with an arrow turns the view and moves no reading',
    setup: services(),
  },
]
