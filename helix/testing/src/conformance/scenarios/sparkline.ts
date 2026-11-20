import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Sparkline, a line a reader reads a reading at a time.
 * Both halves tap the plot at a point along it, as a finger reads a chart,
 * and walk the readings with the keys, and the comparison holds the two
 * records to each other: each move of the reading and each press it sends,
 * the words the readout draws, and the words a screen reader is told.
 */

/** Seven days of sessions, named, with its props. */
const sessions = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-sparkline', {
    label: 'Sessions',
    values: '1240 1318 1102 1291 1244 1180 1102',
    ...props,
  })

/** Sparklines: taps along the plot, the keys, the ends, Escape, a bar plot, and one that is decoration. */
export const SPARKLINE: readonly Scenario[] = [
  {
    family: 'sparkline',
    intents: [
      { kind: 'tap', part: 'svg', x: 0.5, y: 0.5 },
      { kind: 'tap', part: 'svg', x: 0.05, y: 0.5 },
      { kind: 'tap', part: 'svg', x: 0.98, y: 0.2 },
    ],
    name: 'a tap shows the reading under the finger and presses it',
    setup: sessions(),
  },
  {
    family: 'sparkline',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'focus shows the first reading, each arrow moves it, and Enter presses it',
    setup: sessions(),
  },
  {
    family: 'sparkline',
    intents: [
      { kind: 'focus' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Home and End go to the ends, nothing moves past them, and Escape puts the reading away',
    setup: sessions(),
  },
  {
    family: 'sparkline',
    intents: [
      { kind: 'tap', part: 'svg', x: 0.3, y: 0.9 },
      { kind: 'tap', part: 'svg', x: 0.9, y: 0.9 },
    ],
    name: 'a tap on a bar plot reads the column under it',
    setup: sessions({ plot: 'bar' }),
  },
  {
    family: 'sparkline',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
    ],
    name: 'the readings are said in the locale, with where each stands in its words',
    setup: sessions({ locale: 'de', 'position-label': '{position} von {count}' }),
  },
  {
    family: 'sparkline',
    intents: [{ kind: 'tap', part: 'svg', x: 0.5, y: 0.5 }],
    name: 'an unnamed sparkline is decoration and reads nothing',
    setup: el('helix-sparkline', { values: '1240 1318 1102 1291' }),
  },
]
