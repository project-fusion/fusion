import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Bar Chart, a table's categories as columns a reader reads
 * a category at a time. Both halves tap the plot at a point along it, as a
 * finger reads the category in that slot, along the bottom and down the side,
 * and walk the categories and the series of a category with the keys, and the
 * comparison holds the two records to each other: each move of the reading
 * and each press it sends, with the category's row and the series the keys
 * rest on, and the words a screen reader is told.
 */

/** Two services over four quarters, one below zero once, as data, with the chart's props. */
const deploys = (props: Readonly<Record<string, boolean | number | string>> = {}): Setup => ({
  children: [],
  data: {
    caption: 'Deploys per quarter',
    columns: ['Quarter', 'Gateway', 'Billing'],
    rows: [
      ['Q1', 34, 21],
      ['Q2', 47, -8],
      ['Q3', 41, 33],
      ['Q4', 52, 38],
    ],
  },
  props,
  tag: 'helix-bar-chart',
})

/** One series over three plans. */
const plans = (props: Readonly<Record<string, boolean | number | string>> = {}): Setup => ({
  children: [],
  data: {
    caption: 'Accounts by plan',
    columns: ['Plan', 'Accounts'],
    rows: [
      ['Free', 1840],
      ['Team', 612],
      ['Enterprise', 78],
    ],
  },
  props,
  tag: 'helix-bar-chart',
})

/** Bar charts: taps along the plot and down it, the keys along the categories and among the series, and the locale. */
export const BAR_CHART: readonly Scenario[] = [
  {
    family: 'bar-chart',
    intents: [
      /* The third of four slots, Q3, and then the first, Q1. */
      { kind: 'tap', part: 'plot', x: 0.6, y: 0.5 },
      { kind: 'tap', part: 'plot', x: 0.1, y: 0.3 },
    ],
    name: 'a tap shows the category in the slot under the finger and presses it',
    setup: deploys(),
  },
  {
    family: 'bar-chart',
    intents: [
      /* Down the side, the last of three rows, Enterprise, and then the first. */
      { kind: 'tap', part: 'plot', x: 0.3, y: 0.9 },
      { kind: 'tap', part: 'plot', x: 0.7, y: 0.1 },
    ],
    name: 'down the side a tap shows the category in the row under the finger',
    setup: plans({ orientation: 'horizontal' }),
  },
  {
    family: 'bar-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'focus shows the first category, Right moves it, and Down and Up walk its series',
    setup: deploys(),
  },
  {
    family: 'bar-chart',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'down the side Down moves along the categories and Right and Left walk the series',
    setup: deploys({ orientation: 'horizontal', stacked: true }),
  },
  {
    family: 'bar-chart',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'Home and End go to the first and the last category, and nothing moves past them',
    setup: plans(),
  },
  {
    family: 'bar-chart',
    intents: [{ kind: 'focus' }, { key: 'ArrowRight', kind: 'key' }],
    name: 'the categories are said with where each stands in the words of the locale',
    setup: deploys({ lines: 'Billing', locale: 'de', 'position-label': '{position} von {count}' }),
  },
]
