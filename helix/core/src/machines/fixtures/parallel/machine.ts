import type { Statechart } from '../../statechart.js'

/*
 * A dropped item landing while the page draws the new order. A fixture of
 * the format, not a machine any family runs: it holds the compiler to the
 * reference over parallel regions, a move within one region, final states,
 * the parallel state's `done`, a deadline in a region, a move out of the
 * parallel state from one region, and a move from outside into one region's
 * state.
 */

/** What the drop holds. */
export interface ParallelContext {
  /** How many drops landed. */
  readonly drops: number
}

/** What an event carries. */
export interface ParallelInput {
  /** Whether the page draws the new order at once. */
  readonly ready: boolean
}

/** Whether the page has the new order drawn already. */
export const ready = (_context: ParallelContext, input: ParallelInput): boolean => input.ready

/** Counts a drop. */
export const counted = (context: ParallelContext): ParallelContext => ({ drops: context.drops + 1 })

type State = 'drawing' | 'drawn' | 'dropping' | 'gliding' | 'idle' | 'landed'

type Event = 'ABORT' | 'DRAWN' | 'DROP' | 'LANDED' | 'SKIP'

type Effect = 'draw' | 'land' | 'settle'

/** What a region's state answers to the events of the other region and of the idle state. */
const quiet = {
  ABORT: 'ignore',
  DRAWN: 'ignore',
  DROP: 'ignore',
  LANDED: 'ignore',
  SKIP: 'ignore',
} as const

/** The fixture, written once. `parallel.generated.ts` is what runs. */
export const parallel: Statechart<State, Event, ParallelContext, ParallelInput, Effect> = {
  effects: ['draw', 'land', 'settle'],
  events: ['DROP', 'LANDED', 'DRAWN', 'ABORT', 'SKIP'],
  initial: [{ target: 'idle' }],
  states: {
    dropping: {
      done: { effects: ['settle'], target: 'idle', update: counted },
      regions: {
        glide: {
          initial: 'gliding',
          states: {
            gliding: { entry: ['land'], on: { ...quiet, LANDED: { target: 'landed' } } },
            landed: { final: true, on: quiet },
          },
        },
        page: {
          initial: 'drawing',
          states: {
            drawing: {
              after: { ms: 1000, target: 'drawn' },
              entry: ['draw'],
              on: {
                ...quiet,
                ABORT: { target: 'idle' },
                DRAWN: [{ guard: ready, target: 'drawn' }, 'ignore'],
              },
            },
            drawn: { final: true, on: quiet },
          },
        },
      },
    },
    idle: {
      on: { ...quiet, DROP: { target: 'dropping' }, SKIP: { target: 'landed' } },
    },
  },
}
