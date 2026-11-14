import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Spatial Heatmap, Heatmap's strip of readings drawn as a
 * relief of prisms a reader reads a reading at a time. Both halves walk the
 * readings a day down and a week across with the keys, go to the last and
 * the first, turn the view with Shift and an arrow, which moves no reading,
 * and select a range with Shift under `selection-mode="multiple"`, where
 * Shift with an arrow selects in place of turning. The comparison holds the
 * two records to each other: each move of the reading and each press it
 * sends, with the row of the table, each change of the selection asked and
 * told, and the words a screen reader is told.
 */

/** `count` days of commits as data, with the relief's props. */
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
  props: { rows: 7, ...props },
  tag: 'helix-spatial-heatmap',
})

/** Spatial heatmaps: the keys down a column and across, the view they turn, and a selection. */
export const SPATIAL_HEATMAP: readonly Scenario[] = [
  {
    family: 'spatial-heatmap',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'the keys move a day down and a week across, and Enter presses the reading',
    setup: days(14),
  },
  {
    family: 'spatial-heatmap',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'End and Home go to the last and the first reading, and Escape puts it away',
    setup: days(14),
  },
  {
    family: 'spatial-heatmap',
    intents: [
      { kind: 'focus' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
      { held: { shift: true }, key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'Shift with an arrow turns the view and moves no reading',
    setup: days(14),
  },
  {
    family: 'spatial-heatmap',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: ' ', kind: 'key' },
      { held: { shift: true }, key: 'ArrowDown', kind: 'key' },
      { held: { shift: true }, key: 'ArrowRight', kind: 'key' },
    ],
    name: 'under multiple, Shift with an arrow takes in the days after the one selected',
    setup: days(14, { 'selection-mode': 'multiple' }),
  },
]
