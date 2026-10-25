import type { Transition } from '../../capabilities/types.generated.js'
import type { ReorderInput, ReorderSpan } from './context.js'

/*
 * What a family binds a reorder host to. The host is in `host.ts`, which
 * re-exports these, and the two are one file split at the 400 lines a file
 * may have.
 */

/**
 * What a screen reader hears as an item moves. `{name}` is the item's name,
 * `{position}` the place it stands at once the step is done, counting from 1,
 * and `{count}` the number of items it moves among.
 */
export interface ReorderWords {
  /** Said when a move is put back, or the page refuses it. */
  readonly canceled: string
  /** Said when the item is let go. */
  readonly dropped: string
  /** Said each time a key moves the held item, and for a nudge the page took. */
  readonly moved: string
  /** Said when a key or a click takes hold of the item. */
  readonly pickedUp: string
}

/** What every event about an item carries of the set it moves in, as the family draws it now. */
export type ReorderSet = Pick<ReorderInput, 'all' | 'axis' | 'enabled' | 'keys' | 'rtl'>

/** The box that scrolls while a dragged item nears one of its edges. */
export interface ReorderScroller<N> {
  /** Its end edge along the axis, measured as `span` measures an item. */
  readonly end: number
  /** The part the scroll capability scrolls. */
  readonly node: N
  /** Its start edge along the axis, measured as `span` measures an item. */
  readonly start: number
}

/**
 * What a family binds a reorder to: its items and where they are drawn, the
 * words a move says, the box that scrolls, and the runner to send events to.
 * Each part reads what the family draws now.
 */
export interface ReorderParts<N> {
  /** The grip of the item with `key`, which takes focus back after a move from the keys. */
  readonly grip: (key: string) => N | undefined

  /**
   * The item with `key`, which glides to its new place, or back to its own, on
   * a host that draws glides. While a pointer drags it, the keys are heard in
   * the window that shows it.
   */
  readonly item: (key: string) => N | undefined

  /** The locale the words are written in, which writes their numbers and picks their plural forms. */
  readonly locale: () => string

  /** The name of the item with `key`, which fills `{name}`. */
  readonly name: (key: string) => string

  /** The box that scrolls while a dragged item nears one of its edges, or `null` where none does. */
  readonly scroller: () => ReorderScroller<N> | null

  /** Sends an event to the runner, as `Runner.send` does. */
  readonly send: (event: number, input: ReorderInput) => void

  /** The set the item with `key` moves in. */
  readonly set: (key: string) => ReorderSet

  /**
   * The extent of the item with `key` along the axis, in the coordinates the
   * gesture capability tells a pointer in, or `undefined` for one a window did
   * not draw.
   */
  readonly span: (key: string) => ReorderSpan | undefined

  /** How a glide runs, from the family's motion tokens. */
  readonly transition: () => Transition

  /** The words a screen reader hears at each step. */
  readonly words: () => ReorderWords
}
