import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Loader, whose `delay` keeps quick work from flashing it,
 * on the fake clock each half sets as the timers capability.
 */

/** Loaders: a wait run out, and a wait started again when work starts again. */
export const LOADER: readonly Scenario[] = [
  {
    family: 'loader',
    intents: [
      { kind: 'wait', ms: 299 },
      { kind: 'wait', ms: 1 },
    ],
    name: 'stays unseen until its delay is over',
    setup: el('helix-loader', { delay: 300, label: 'Saving' }),
  },
  {
    family: 'loader',
    intents: [
      { kind: 'set', prop: 'idle', value: false },
      { kind: 'wait', ms: 199 },
      { kind: 'wait', ms: 1 },
      { kind: 'set', prop: 'idle', value: true },
    ],
    name: 'waits again when work starts again, and is not waiting while idle',
    setup: el('helix-loader', { delay: 200, idle: true, label: 'Saving' }),
  },
]
