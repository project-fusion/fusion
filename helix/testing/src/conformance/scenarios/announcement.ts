import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Announcement, whose dismiss button and spent `duration`
 * each send `dismiss` with the words of its message, and which the page
 * takes out. Its countdown runs on the fake clock each half sets as the
 * timers capability, and holds while the page or the app is away.
 */

/** A dismissible announcement, with a duration where `duration` gives one. */
const announcement = (duration?: number) =>
  el('helix-announcement', { dismissible: true, ...(duration === undefined ? {} : { duration }) }, [
    'Maintenance tonight.',
  ])

/** Announcements: a dismissal, one refused, a duration spent, and one held while away. */
export const ANNOUNCEMENT: readonly Scenario[] = [
  {
    family: 'announcement',
    intents: [{ kind: 'press', part: 'dismiss' }],
    name: 'a dismissal says the announcement by its words',
    setup: announcement(),
  },
  {
    family: 'announcement',
    intents: [
      { event: 'dismiss', kind: 'refuse' },
      { kind: 'press', part: 'dismiss' },
    ],
    name: 'a refused dismissal is sent and refused',
    setup: announcement(),
  },
  {
    family: 'announcement',
    intents: [
      { kind: 'wait', ms: 4_999 },
      { kind: 'wait', ms: 1 },
    ],
    name: 'a spent duration sends dismiss once it is spent',
    setup: announcement(5_000),
  },
  {
    family: 'announcement',
    intents: [
      { kind: 'wait', ms: 2_000 },
      { kind: 'hide' },
      { kind: 'wait', ms: 10_000 },
      { kind: 'show' },
      { kind: 'wait', ms: 2_999 },
      { kind: 'wait', ms: 1 },
    ],
    name: 'a duration holds while the page is away, and runs on from what was left',
    setup: announcement(5_000),
  },
]
