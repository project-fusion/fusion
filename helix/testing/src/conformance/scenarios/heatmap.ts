import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Heatmap, a table's rows as a strip of cells a reader reads
 * a cell at a time. Both halves tap the strip at a point of it, as a finger
 * lands on a cell, walk the cells a day down and a week across with the keys,
 * and select a range with Shift, and the comparison holds the two records to
 * each other: each move of the reading and each press it sends, with the row
 * of the table, each change of the selection asked and told, and the words a
 * screen reader is told.
 */

/** `count` days of commits as data, with the strip's props. */
const days = (
  count: number,
  props: Readonly<Record<string, boolean | number | string>> = {},
): Setup => ({
  children: [],
  data: {
    caption: 'Commits',
    columns: ['Day', 'Commits'],
    rows: Array.from({ length: count }, (_, at) => [`Day ${at + 1}`, (at * 3) % 7]),
  },
  props,
  tag: 'helix-heatmap',
})

/** Heatmaps: taps on a cell, the keys down a column and across, and a selection with Shift. */
export const HEATMAP: readonly Scenario[] = [
  {
    family: 'heatmap',
    intents: [
      /* The second of six cells a quarter across, then the last. */
      { kind: 'tap', part: 'plot', x: 0.25, y: 0.5 },
      { kind: 'tap', part: 'plot', x: 0.9, y: 0.5 },
    ],
    name: 'a tap shows the cell under the finger and presses it',
    setup: days(6),
  },
  {
    family: 'heatmap',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'PageDown', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'the keys move a day down and a week across, and Page Down four weeks',
    setup: days(14, { rows: 7 }),
  },
  {
    family: 'heatmap',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: ' ', kind: 'key' },
      { held: { shift: true }, key: 'ArrowDown', kind: 'key' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'Space selects a cell and Shift with an arrow takes in the days after it',
    setup: days(14, { rows: 7, 'selection-mode': 'multiple' }),
  },
]
