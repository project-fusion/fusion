import type { Statechart } from '../../statechart.js'

/*
 * A disclosure with two pages inside it. A fixture of the format, not a
 * machine any family runs: it holds the compiler to the reference over one
 * level of nesting, answers a child leaves to its parent, a move to the
 * state around the leaf, a deadline on a state that holds others, marks,
 * and a cancel.
 */

/** What the disclosure holds. */
export interface NestedContext {
  /** How many pages were turned. */
  readonly turned: number
}

/** What an event carries. */
export interface NestedInput {
  /** Whether a turn past the last page goes back to the first. */
  readonly wraps: boolean
}

/** Whether a turn past the last page goes back to the first. */
export const wraps = (_context: NestedContext, input: NestedInput): boolean => input.wraps

/** Counts a page turned. */
export const turn = (context: NestedContext): NestedContext => ({ turned: context.turned + 1 })

/** Forgets the pages turned. */
export const forgotten = (_context: NestedContext): NestedContext => ({ turned: 0 })

type State = 'closed' | 'first' | 'open' | 'second'

type Event = 'CLOSE' | 'NEXT' | 'OPEN'

type Effect = 'focus' | 'hide' | 'reset' | 'show'

/** The fixture, written once. `nested.generated.ts` is what runs. */
export const nested: Statechart<State, Event, NestedContext, NestedInput, Effect> = {
  cancel: { effects: ['reset'], target: 'closed', update: forgotten },
  effects: ['focus', 'hide', 'reset', 'show'],
  events: ['OPEN', 'NEXT', 'CLOSE'],
  initial: [{ target: 'closed' }],
  states: {
    closed: { on: { CLOSE: 'ignore', NEXT: 'ignore', OPEN: { target: 'open' } } },
    open: {
      after: { ms: 3000, target: 'closed', update: forgotten },
      entry: ['show'],
      exit: ['hide'],
      initial: 'first',
      mark: true,
      on: { CLOSE: { target: 'closed' }, NEXT: { target: 'second', update: turn }, OPEN: 'ignore' },
      states: {
        first: { entry: ['focus'] },
        second: {
          mark: true,
          on: {
            NEXT: [{ guard: wraps, target: 'first', update: turn }, 'ignore'],
            OPEN: { target: 'open' },
          },
        },
      },
    },
  },
}
