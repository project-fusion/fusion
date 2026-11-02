import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Format Date, whose reading of how long ago ticks on the
 * fake clock each half sets as the timers capability, as core's wall clock
 * runs on both.
 */

/** The time of day the fake clock starts at, as core's timers fake starts it. */
const START = Date.UTC(2026, 0, 5, 9)

/** A moment `minutes` before the fake clock starts, as an attribute writes it. */
const ago = (minutes: number): string => new Date(START - minutes * 60_000).toISOString()

/** Format Dates: a reading that ticks, stops while away, and holds while frozen. */
export const FORMAT_DATE: readonly Scenario[] = [
  {
    family: 'format-date',
    intents: [
      { kind: 'wait', ms: 60_000 },
      { kind: 'wait', ms: 60_000 },
      { kind: 'hide' },
      { kind: 'wait', ms: 600_000 },
      { kind: 'show' },
    ],
    name: 'reads how long ago, ticks as its words go stale, and catches up as it comes back',
    setup: el('helix-format-date', { date: ago(5), locale: 'en-US', relative: 'long' }),
  },
  {
    family: 'format-date',
    intents: [
      { kind: 'set', prop: 'frozen', value: true },
      { kind: 'wait', ms: 120_000 },
      { kind: 'set', prop: 'frozen', value: false },
    ],
    name: 'keeps its words while frozen, and catches up once it is not',
    setup: el('helix-format-date', { date: ago(59), elapsed: true, locale: 'en-US' }),
  },
  {
    family: 'format-date',
    intents: [{ kind: 'set', prop: 'date', value: '2026-08-04' }],
    name: 'writes a day with no time as that day everywhere',
    setup: el('helix-format-date', { 'date-style': 'long', locale: 'en-US' }),
  },
]
