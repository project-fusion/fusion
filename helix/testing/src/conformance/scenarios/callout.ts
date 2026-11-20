import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Callout, whose dismiss button sends `dismiss` with what
 * the callout is called, and hides the callout unless a handler refuses.
 */

/** A dismissible warning, with a heading where `heading` names one. */
const callout = (heading?: string) =>
  el('helix-callout', { dismissible: true, tone: 'warning' }, [
    ...(heading === undefined ? [] : [el('strong', {}, [heading], 'heading')]),
    'Disk nearly full.',
  ])

/** Callouts: a dismissal named by the content or the heading, and one refused. */
export const CALLOUT: readonly Scenario[] = [
  {
    family: 'callout',
    intents: [{ kind: 'press', part: 'dismiss' }],
    name: 'a dismissal says the callout by its words',
    setup: callout(),
  },
  {
    family: 'callout',
    intents: [{ kind: 'press', part: 'dismiss' }],
    name: 'a dismissal says the callout by its heading',
    setup: callout('Storage'),
  },
  {
    family: 'callout',
    intents: [
      { event: 'dismiss', kind: 'refuse' },
      { kind: 'press', part: 'dismiss' },
    ],
    name: 'a refused dismissal is sent and refused',
    setup: callout(),
  },
]
