import type { Answer, Statechart } from '../statechart.js'

/*
 * Roving focus: a set of items is one tab stop, and the arrow keys, Home, and
 * End move focus between its items. Arriving on an item also chooses it where
 * the set chooses on arrival, which is automatic activation.
 *
 * A machine lives for one press. Its host reads where the press starts from
 * the page, and reads the machine's state from that, because focus and the
 * items can change between two presses without telling the set. The host
 * turns a key into an event: the horizontal arrows follow the reading
 * direction, so on a right-to-left page Left is `NEXT`.
 */

/** What a move reads, taken at the press. */
export interface RovingContext {
  /** The index of the item the move starts from, among the reachable items, or -1. */
  at: number

  /** How many items can be reached. A set with none sends no event. */
  count: number

  /** Whether a move starts only from an item with focus. */
  focus: boolean

  /** Whether arriving on an item also chooses it. */
  selects: boolean

  /** Whether the ends join, so a move past the last item lands on the first. */
  wrap: boolean
}

/** Whether the press starts from an item. */
export const placed = (context: RovingContext): boolean => context.at >= 0

/** Whether a move starts only from an item with focus. */
export const followsFocus = (context: RovingContext): boolean => context.focus

/** Whether arriving on an item also chooses it. */
export const selects = (context: RovingContext): boolean => context.selects

/** Moves to the first item. */
export const toFirst = (context: RovingContext): RovingContext => ({ ...context, at: 0 })

/** Moves to the last item. */
export const toLast = (context: RovingContext): RovingContext => ({
  ...context,
  at: context.count - 1,
})

/** Moves to the next item, from the last to the first where the ends join. */
export const toNext = (context: RovingContext): RovingContext => ({
  ...context,
  at: context.wrap ? (context.at + 1) % context.count : Math.min(context.at + 1, context.count - 1),
})

/** Moves to the item before, from the first to the last where the ends join. */
export const toPrevious = (context: RovingContext): RovingContext => ({
  ...context,
  at: context.wrap ? (context.at - 1 + context.count) % context.count : Math.max(context.at - 1, 0),
})

type State = 'away' | 'placed' | 'unplaced'

type Event = 'FIRST' | 'LAST' | 'NEXT' | 'PREVIOUS'

type Effect = 'focus' | 'select'

/*
 * Shared answers are named and never read through a property: a bundler
 * keeps a property read, which might run a getter, and the data would then
 * reach every bundle that imports a function from this module.
 *
 * Each answer arrives on an item. The move focuses the item its update lands
 * on, then chooses it where the set chooses on arrival. The effects belong to
 * the move, so a press that starts from an item runs nothing until it moves.
 */

/** Arrives on the first item. */
const first: Answer<State, RovingContext, undefined, Effect> = [
  { effects: ['focus', 'select'], guard: selects, target: 'placed', update: toFirst },
  { effects: ['focus'], target: 'placed', update: toFirst },
]

/** Arrives on the last item. */
const last: Answer<State, RovingContext, undefined, Effect> = [
  { effects: ['focus', 'select'], guard: selects, target: 'placed', update: toLast },
  { effects: ['focus'], target: 'placed', update: toLast },
]

/** Arrives on the next item. */
const next: Answer<State, RovingContext, undefined, Effect> = [
  { effects: ['focus', 'select'], guard: selects, target: 'placed', update: toNext },
  { effects: ['focus'], target: 'placed', update: toNext },
]

/** Arrives on the item before. */
const previous: Answer<State, RovingContext, undefined, Effect> = [
  { effects: ['focus', 'select'], guard: selects, target: 'placed', update: toPrevious },
  { effects: ['focus'], target: 'placed', update: toPrevious },
]

/** The machine, written once. `roving-focus.generated.ts` is what runs. */
export const rovingFocus: Statechart<State, Event, RovingContext, undefined, Effect> = {
  effects: ['focus', 'select'],
  events: ['NEXT', 'PREVIOUS', 'FIRST', 'LAST'],
  initial: [
    { guard: placed, target: 'placed' },
    { guard: followsFocus, target: 'away' },
    { target: 'unplaced' },
  ],
  states: {
    /* The press came from outside the items, in a set whose moves start from
       focus: a tab panel is a stop of its own, and an arrow pressed there
       leaves the tabs alone. */
    away: { on: { FIRST: 'ignore', LAST: 'ignore', NEXT: 'ignore', PREVIOUS: 'ignore' } },
    /* The press came from an item, and each key moves along from it. */
    placed: { on: { FIRST: first, LAST: last, NEXT: next, PREVIOUS: previous } },
    /* Nothing is chosen and nothing has focus, in a set whose moves start from
       the chosen item: forward lands on the first item and back on the last.
       A state of its own, because `toPrevious` from -1 lands on the second to
       last item, a reader arrowing back into an unanswered group one short of
       the end. */
    unplaced: { on: { FIRST: first, LAST: last, NEXT: first, PREVIOUS: last } },
  },
}
