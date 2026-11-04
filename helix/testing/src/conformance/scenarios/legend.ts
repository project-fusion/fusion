import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Legend, a chart's key whose toggles hide a series. Both
 * halves press the toggles, and the comparison holds the two records to each
 * other: each `before-change` with the list a press would leave, and each
 * `change` once it stands.
 */

/** Three series over two quarters, read from a table by its id, with the legend's props. */
const revenue = (props: Readonly<Record<string, boolean | number | string>> = {}): Setup => ({
  children: [],
  props: { for: 'conformance-revenue', ...props },
  table: {
    data: {
      caption: 'Revenue by quarter',
      columns: ['Quarter', 'Booked', 'Renewals', 'Forecast'],
      rows: [
        ['Q1', 420, 310, 180],
        ['Q2', 488, 352, 240],
      ],
    },
    id: 'conformance-revenue',
  },
  tag: 'helix-legend',
})

/** Legends: toggles hiding and showing series, a list given to start from, and the rows of a ring. */
export const LEGEND: readonly Scenario[] = [
  {
    family: 'legend',
    intents: [
      { kind: 'press', label: 'Renewals' },
      { kind: 'press', label: 'Forecast' },
      { kind: 'press', label: 'Renewals' },
    ],
    name: 'a toggle hides its series and shows it again, asking first',
    setup: revenue({ toggles: true }),
  },
  {
    family: 'legend',
    intents: [{ kind: 'press', label: 'Booked' }],
    name: 'a list given to start from is the list a press changes',
    setup: revenue({ 'hidden-series': 'Forecast', toggles: true }),
  },
  {
    family: 'legend',
    intents: [{ kind: 'press', label: 'Q2' }],
    name: 'under categories a toggle hides a row',
    setup: revenue({ entries: 'categories', toggles: true }),
  },
]
