/**
 * How a stack of messages holds the messages passed into it, and how one
 * message stands in it, as a toast's region holds its toasts. Read as syntax,
 * as `tree.ts` says.
 */

/**
 * The messages passed into the element, which it stacks and holds, as a
 * toast's region holds its items:
 *
 * ```ts
 * notices({ hears: 'dismiss', max: 'max-visible', showing: 'showing', toward: 'swipe-direction' })
 * ```
 *
 * **Its messages are the elements drawn inside it whose source declares a
 * `notice`**, in the order they were first drawn. A touch on any of them
 * holds every one's clock, so a reader moving from one message to the next
 * does not lose the one behind them.
 */
export interface Notices {
  /**
   * An event of its messages the element hears after each message's own
   * handler, which a handler on the element may refuse, as the web's event
   * bubbles from a message to its region.
   */
  readonly hears?: string
  /**
   * The prop that says how many messages show at once. Past that many open
   * messages, in the order they were drawn, a message waits until one before
   * it goes. Unset, every message shows.
   */
  readonly max?: string
  /**
   * The name of the value the element computes, whether one of its messages
   * shows, which its layer's `open` binds.
   */
  readonly showing: string
  /**
   * The prop that names the edge a swipe dismisses a message toward: `end`,
   * the end of the line, `start`, `top`, or `bottom`. Unset is `end`.
   */
  readonly toward?: string
}

/** The messages passed into the element. */
export const notices = (fields: Notices): Notices => fields

/**
 * One message of the `notices` around it, as a toast item in its region:
 *
 * ```ts
 * notice({ part: 'item', waiting: 'waiting' })
 * ```
 *
 * **It waits while the element around holds it back** past its `max`, in the
 * state `waiting`, which a countdown's `waits` reads, so its clock starts as
 * it shows. **A touch swipes its `part` toward the edge the element around
 * names**, and past halfway, or quickly, asks its toggle to close, as its
 * dismiss button does. A refused close springs it back. Outside any
 * `notices`, it never waits and swipes toward the end of the line.
 */
export interface Notice {
  /** The part a touch swipes. */
  readonly part: string
  /** The state that holds while the element around holds the message back. */
  readonly waiting: string
}

/** One message of the `notices` around it. */
export const notice = (fields: Notice): Notice => fields
