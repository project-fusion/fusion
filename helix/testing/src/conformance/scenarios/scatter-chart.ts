import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Scatter Chart, a table's rows as points a reader reads a
 * row at a time. Both halves tap the plot at a point of it, as a finger finds
 * the point nearest it, and walk the rows left to right and the series of a
 * row with the keys, and the comparison holds the two records to each other:
 * each move of the reading and each press it sends, with the row and the
 * series the keys rest on, and the words a screen reader is told.
 */

/**
 * Four pages measured across and up, out of order, as data, with the chart's
 * props: their points stand at the corners and at the thirds of the plot.
 */
const pages = (props: Readonly<Record<string, boolean | number | string>> = {}): Setup => ({
  children: [],
  data: {
    caption: 'Page weight and load time',
    columns: ['Page', 'Weight', 'Load'],
    rows: [
      ['Pricing', 30, 20],
      ['Home', 10, 10],
      ['Docs', 40, 40],
      ['Blog', 20, 30],
    ],
  },
  props,
  tag: 'helix-scatter-chart',
})

/** Two series measured up against one across. */
const series = (): Setup => ({
  children: [],
  data: {
    caption: 'Page weight against load and paint',
    columns: ['Page', 'Weight', 'Load', 'Paint'],
    rows: [
      ['Home', 10, 10, 15],
      ['Docs', 40, 40, 25],
      ['Blog', 20, 30, 20],
    ],
  },
  props: {},
  tag: 'helix-scatter-chart',
})

/** Scatter charts: taps near a point, the keys along the rows and among the series. */
export const SCATTER_CHART: readonly Scenario[] = [
  {
    family: 'scatter-chart',
    intents: [
      /* Blog's point a third across and a third down, then Pricing's two thirds of each. */
      { kind: 'tap', part: 'plot', x: 0.34, y: 0.34 },
      { kind: 'tap', part: 'plot', x: 0.66, y: 0.66 },
    ],
    name: 'a tap shows the point nearest the finger and presses it',
    setup: pages(),
  },
  {
    family: 'scatter-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'focus shows the leftmost point, and the arrows walk the points left to right',
    setup: pages(),
  },
  {
    family: 'scatter-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Down and Up walk the series of a row, and Escape puts the reading away',
    setup: series(),
  },
]
