import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Orb, whose dots are drawn on the GPU and out of a screen
 * reader's reach. The record holds what a reader hears of the host as the
 * state changes: its role, its name, whether it is busy, and its state.
 */

const set = (state: string) => ({ kind: 'set' as const, prop: 'state', value: state })

/** Orbs: a task passing through its states, a state it does not draw, and announcing. */
export const ORB: readonly Scenario[] = [
  {
    family: 'orb',
    intents: [set('fetching'), set('working'), set('done')],
    name: 'is a busy progress bar named for each state, and an image once done',
    setup: el('helix-orb', { state: 'thinking' }),
  },
  {
    family: 'orb',
    intents: [set('compiling'), set('listening')],
    name: 'a state it does not draw is thinking',
    setup: el('helix-orb', { label: 'Reading report.pdf', state: 'waiting' }),
  },
  {
    family: 'orb',
    intents: [set('working'), set('done')],
    name: 'under announce, a status that is never busy',
    setup: el('helix-orb', { announce: true, state: 'connecting' }),
  },
]
