/**
 * A playlist's queue: which entry a press of next or previous lands on, what
 * an entry's end does, and where the queue goes when the current entry
 * leaves it. Pure, so the web's playlist and a phone's run the same answers.
 *
 * **Each answer is a move the caller applies**: play another entry, play the
 * same one again from its start, stop at the end, or stay. Nothing here
 * reaches a player or an entry. The shuffled order it deals is handed back,
 * and the caller holds it until the next question, so previous retraces what
 * next played.
 */

import { playOrder, type Repeat, stepTo } from './order.js'

export { playOrder, type Repeat, shuffled, stepTo } from './order.js'

/** What a queue is asked from. */
export interface Queue {
  /** The values of the entries that can play, in the order written. A disabled entry is left out. */
  readonly values: readonly string[]
  /** The entry that is current, where one is. */
  readonly current: string | undefined
  /** How the queue goes on at its end, where it goes on. */
  readonly repeat?: Repeat | undefined
  /** Whether it plays in a random order. */
  readonly shuffle: boolean
  /** The shuffled order dealt before, which is kept while it covers the same entries. */
  readonly dealt?: readonly string[] | undefined
  /** The source of chance for a new deal, `Math.random` unless a caller passes one. */
  readonly random?: () => number
}

/**
 * What the caller does: play the entry `to`, play the current entry again from
 * its start, stop because the last entry has ended, or nothing.
 */
export type QueueMove =
  | { readonly kind: 'end' }
  | { readonly kind: 'none' }
  | { readonly kind: 'play'; readonly to: string }
  | { readonly kind: 'replay' }

/** A move, and the shuffled order to hold until the next question, or none without shuffle. */
export interface QueueAnswer {
  readonly dealt: readonly string[] | undefined
  readonly move: QueueMove
}

const NONE: QueueMove = { kind: 'none' }

/** The order the queue plays in, and the deal to hold. */
const dealOf = (queue: Queue): { dealt: string[] | undefined; order: readonly string[] } => {
  const dealt = queue.shuffle
    ? playOrder(queue.values, true, queue.dealt, queue.current, queue.random)
    : undefined
  return { dealt, order: dealt ?? queue.values }
}

/**
 * The entry a step of `by` lands on in the order the queue plays, or
 * `undefined` past an end. `repeat="all"` goes round.
 */
export const queueNext = (
  queue: Queue,
  by: number,
): { dealt: readonly string[] | undefined; next: string | undefined } => {
  const { dealt, order } = dealOf(queue)
  return { dealt, next: stepTo(order, queue.current, by, queue.repeat === 'all') }
}

/**
 * A press of next, `by` 1, or previous, `by` -1: the entry it lands on, the
 * current one again where the order holds only it, or nothing past an end.
 */
export const queueStep = (queue: Queue, by: number): QueueAnswer => {
  const { dealt, next } = queueNext(queue, by)
  if (next === undefined) {
    return { dealt, move: NONE }
  }
  return { dealt, move: next === queue.current ? { kind: 'replay' } : { kind: 'play', to: next } }
}

/**
 * The current entry has played to its end: the same one again under
 * `repeat="one"`, the end past the last, or the next in the order where the
 * queue `advances`, and nothing where it does not.
 */
export const queueEnded = (queue: Queue, advances: boolean): QueueAnswer => {
  if (queue.repeat === 'one') {
    return { dealt: queue.dealt, move: { kind: 'replay' } }
  }
  const { dealt, next } = queueNext(queue, 1)
  if (next === undefined) {
    return { dealt, move: { kind: 'end' } }
  }
  if (!advances) {
    return { dealt, move: NONE }
  }
  return queueStep({ ...queue, dealt }, 1)
}

/**
 * Where the queue goes when the entry `current` leaves it: the first entry
 * after it in `known`, the order before the change, that is still `present`,
 * or the nearest before it where it was the last.
 */
export const queueRemoved = (
  known: readonly string[],
  current: string,
  present: ReadonlySet<string>,
): string | undefined => {
  const at = known.indexOf(current)
  return (
    known.slice(at + 1).find((value) => present.has(value)) ??
    known
      .slice(0, at)
      .reverse()
      .find((value) => present.has(value))
  )
}
