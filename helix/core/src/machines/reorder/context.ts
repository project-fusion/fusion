import {
  centersOf,
  passedCount,
  type ReorderAxis,
  reorderKey,
} from '../../utils/reorder/reorder.js'

/*
 * The names of the reorder machine's states, events, and effects, what it
 * holds, what its events carry, and the places they put an item at. The
 * arithmetic is `utils/reorder`'s, which the web's controller and the native
 * pilot call too. The machine is in `machine.ts`, which re-exports the types:
 * the two are one file split at the 400 lines a file may have.
 */

/** The states of the machine. */
export type ReorderState =
  | 'dragging'
  | 'held'
  | 'idle'
  | 'landing'
  | 'pointing'
  | 'pressed'
  | 'returning'

/** The events a host sends it. */
export type ReorderEvent =
  | 'CANCEL'
  | 'DRAG'
  | 'DROP'
  | 'GLIDED'
  | 'LANDED'
  | 'NUDGE'
  | 'PICK'
  | 'PRESS'
  | 'RELEASE'
  | 'STEP'
  | 'TARGET'
  | 'TICK'

/** The effects its moves and states ask a host for. */
export type ReorderEffect =
  | 'back'
  | 'canceled'
  | 'dropped'
  | 'frame'
  | 'land'
  | 'lift'
  | 'listen'
  | 'moved'
  | 'pass'
  | 'picked-up'
  | 'refocus'
  | 'scroll'
  | 'unlisten'
  | 'untrack'

/** What the machine holds between events. */
export interface ReorderContext {
  /** Where the item stood when the move began, counted from 0 in the order drawn. */
  from: number
  /** Whether the host draws the held item gliding to its place, as a native host does. */
  glides: boolean
  /** The key of the item the move is about, or `''` before the first move. */
  key: string
  /** Every key in the order the last drop or nudge asked for, the hidden ones included. */
  order: readonly string[]
  /**
   * The press that holds the item, by the number the host gave it, counting
   * from 1, or 0 where the keys hold it.
   */
  pointer: number
  /** How far the last frame scrolls the page, in pixels: negative toward the start. */
  speed: number
  /** Where the item would go, among the others. */
  to: number
  /** The token the latest frame or glide was given. An end carrying another is stale. */
  token: number
  /** Where the pointer went down on the screen, across. */
  x: number
  /** Where the pointer went down on the screen, down. */
  y: number
}

/** An item's extent along the axis. */
export interface ReorderSpan {
  end: number
  start: number
}

/** What an event carries. Each field names the events that read it. */
export interface ReorderInput {
  /** Every key in order, the ones a filter hides included: `keys` where none is hidden. */
  all: readonly string[]
  /**
   * For `DRAG` and `TARGET`, the point along the axis that places the item:
   * the pointer on the web, the held item's middle on a native host, and
   * `NaN` for a click a key sent. For `TICK`, the pointer, or `NaN`.
   */
  at: number
  /** Which way the items run. */
  axis: ReorderAxis
  /** Whether items may move now: the host's `reorderable`. */
  enabled: boolean
  /** For `TICK`, the end edge of the box that scrolls. */
  end: number
  /** The item the event is about: the grip pressed, the item clicked, or the item nudged. */
  key: string
  /** For `STEP` and `NUDGE`, the key pressed, as `KeyboardEvent.key` names it. */
  keyName: string
  /** The keys of the items the item moves among, in the order drawn. */
  keys: readonly string[]
  /**
   * For `PRESS`, and every event `same` reads, the press the event is about:
   * the number the host gives each press, counting from 1, or 0 for an event
   * the keys or a click sent.
   */
  pointer: number
  /** Whether the page reads right to left. */
  rtl: boolean
  /** The other items' extents, in the order drawn, `undefined` for one a window did not draw. */
  spans: readonly (ReorderSpan | undefined)[]
  /** For `TICK`, the start edge of the box that scrolls. */
  start: number
  /** For `TICK` and `GLIDED`, the token the effect that ended was given. */
  token: number
  /** For `PRESS` and `DRAG`, where the pointer is on the screen, across. */
  x: number
  /** For `PRESS` and `DRAG`, where the pointer is on the screen, down. */
  y: number
}

/** How far a press on a grip travels before it lifts the item, in pixels, as on the web. */
export const SLOP = 4

/** Whether the items run along a line laid out from the right. */
const reversed = (input: ReorderInput): boolean => input.axis === 'inline' && input.rtl

/** The place among the others that `at` is over: the number of middles it has passed. */
export const placeOf = (input: ReorderInput): number =>
  passedCount(centersOf(input.spans, reversed(input)), input.at, reversed(input))

/** Where the key pressed moves an item standing at `to`, or `null` for a key that moves none. */
export const keyed = (input: ReorderInput, to: number): number | null =>
  reorderKey(input.keyName, { axis: input.axis, count: input.keys.length, rtl: input.rtl, to })

/** Where a click drops the held item: by where it landed, or on the item a key sent it to. */
export const aimOf = (input: ReorderInput): number =>
  Math.max(0, Number.isNaN(input.at) ? input.keys.indexOf(input.key) : placeOf(input))

/** Where a nudge moves its item, or `null` where it moves none. */
export const nudgeOf = (input: ReorderInput): number | null => {
  const from = input.keys.indexOf(input.key)
  return input.enabled && from >= 0 ? keyed(input, from) : null
}
