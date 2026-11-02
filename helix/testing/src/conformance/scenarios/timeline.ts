import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Timeline, whose entry writes how long ago it was under
 * `relative` and ticks on the fake clock each half sets as the timers
 * capability, as core's wall clock runs on both.
 */

/** The time of day the fake clock starts at, as core's timers fake starts it. */
const START = Date.UTC(2026, 0, 5, 9)

/** A moment `minutes` before the fake clock starts, as an attribute writes it. */
const ago = (minutes: number): string => new Date(START - minutes * 60_000).toISOString()

/** Timeline entries: a reading that ticks, and one that starts again on a new moment. */
export const TIMELINE: readonly Scenario[] = [
  {
    family: 'timeline',
    intents: [
      { kind: 'wait', ms: 60_000 },
      { kind: 'hide' },
      { kind: 'wait', ms: 120 * 60_000 },
      { kind: 'show' },
    ],
    name: 'an entry reads how long ago, ticks as its words go stale, and catches up as it comes back',
    setup: el('helix-timeline-item', { datetime: ago(59), lang: 'en', relative: 'long' }),
  },
  {
    family: 'timeline',
    intents: [
      { kind: 'wait', ms: 60_000 },
      { kind: 'set', prop: 'datetime', value: ago(5) },
    ],
    name: 'an entry reads a new moment as soon as it is written',
    setup: el('helix-timeline-item', { datetime: ago(59), lang: 'en', relative: 'short' }),
  },
]
