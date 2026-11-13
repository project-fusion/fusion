import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Spatial Scatter Chart, a table's rows as points in a box
 * seen in 3D, which a reader reads a point at a time. Both halves walk the
 * points in the table's order and the measures of a point with the keys, and
 * turn the view with Shift and an arrow, which moves no reading. The
 * comparison holds the two records to each other: each move of the reading
 * and each press it sends, with the row and the measure the keys rest on,
 * and the words a screen reader is told.
 */

/** Four servers by load, latency, and memory, two in each region, as data. */
const servers = (): Setup => ({
  children: [],
  data: {
    caption: 'Servers',
    columns: ['Server', 'Region', 'Load', 'Latency', 'Memory'],
    rows: [
      ['Alpha', 'East', 10, 20, 30],
      ['Beta', 'West', 40, 10, 60],
      ['Gamma', 'East', 70, 50, 10],
      ['Delta', 'West', 90, 80, 50],
    ],
  },
  props: { 'group-by': 'Region' },
  tag: 'helix-spatial-scatter-chart',
})

/** Spatial scatter charts: the keys along the points and among the measures, and the view they turn. */
export const SPATIAL_SCATTER_CHART: readonly Scenario[] = [
  {
    family: 'spatial-scatter-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'the arrows walk the points in the table’s order, and Enter presses one',
    setup: servers(),
  },
  {
    family: 'spatial-scatter-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Down and Up walk the measures of a point, and Escape puts the reading away',
    setup: servers(),
  },
  {
    family: 'spatial-scatter-chart',
    intents: [
      { kind: 'focus' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
      { held: { shift: true }, key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'Shift with an arrow turns the view and moves no reading',
    setup: servers(),
  },
]
