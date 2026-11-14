import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Spatial Surface Chart, a table's rows as readings on a
 * grid of places across and in depth, drawn as a surface in a box seen in 3D,
 * which a reader reads a place at a time. Both halves walk the places with
 * the keys, across with the left and right arrows and in depth with the down
 * and up arrows, land on a place with no reading, and turn the view with
 * Shift and an arrow, which moves no reading. The comparison holds the two
 * records to each other: each move of the reading and each press it sends,
 * with the row, and the words a screen reader is told.
 */

/** Load by hour and by day, two days of three hours, the last hour of the second day missing, as data. */
const load = (): Setup => ({
  children: [],
  data: {
    caption: 'Load',
    columns: ['Slot', 'Hour', 'Day', 'Load'],
    rows: [
      ['Mon 0h', 0, 0, 10],
      ['Tue 0h', 0, 1, 40],
      ['Mon 1h', 1, 0, 30],
      ['Tue 1h', 1, 1, 50],
      ['Mon 2h', 2, 0, 20],
    ],
  },
  props: {},
  tag: 'helix-spatial-surface-chart',
})

/** Spatial surface charts: the keys across and in depth, and the view they turn. */
export const SPATIAL_SURFACE_CHART: readonly Scenario[] = [
  {
    family: 'spatial-surface-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'the across arrows walk the places, and Enter presses a reading',
    setup: load(),
  },
  {
    family: 'spatial-surface-chart',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'End and Home go to the last and the first place, and a place with no reading says so',
    setup: load(),
  },
  {
    family: 'spatial-surface-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Down and Up walk the places in depth, and Escape puts the reading away',
    setup: load(),
  },
  {
    family: 'spatial-surface-chart',
    intents: [
      { kind: 'focus' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'Shift with an arrow turns the view and moves no reading',
    setup: load(),
  },
]
