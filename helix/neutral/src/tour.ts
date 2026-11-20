/**
 * How a guided tour holds the stops passed into it, and how one stop stands
 * in it. Read as syntax, as `tree.ts` says.
 */

/**
 * The stops passed into the element, which it shows one at a time, as a
 * tour holds its stops:
 *
 * ```ts
 * tour: { onAsk: 'tourAsk', onBeforeChange: 'beforeActivate', prop: 'index', ... }
 * ```
 *
 * **Its stops are the elements drawn inside it whose source declares a
 * `stop`**, in the order they were first drawn. The element's `toggle`
 * holds whether it runs: a skip asks the toggle to close, and finishing the
 * last stop closes it with nothing asked.
 *
 * - **A move asks `onBeforeChange` first**, with the new index as `value`, which a
 *   handler may refuse, and sends `onChange` once it stands. Next on the last
 *   stop sends `onComplete` and ends the tour. Back passes over a `wait`
 *   stop.
 * - **A `wait` stop waits for its target to be drawn**, in the state
 *   `waiting`, and moves on by itself once it is.
 * - **A stop's `effect` runs as the tour reaches it**, before it is shown,
 *   in the state `preparing` while a promise it returns settles.
 * - **The spotlight lights the current target**: `lit` holds while it does,
 *   and the four lengths named after `spotlight` hold the lit box in the window,
 *   `spot-x`, `spot-y`, `spot-width`, and `spot-height`, the target and
 *   `spotlightPadding` around it. `veiled` holds while a stop with nothing to light
 *   shows.
 * - **Focus follows the run**: opening moves it to the first stop's panel, a
 *   move from inside the tour to the next one, and ending gives it back to
 *   where it was as the tour opened.
 */
export interface Tour {
  /** The event its stops send as one of their controls is pressed, which it answers. */
  readonly onAsk: string
  /** The prop that labels each stop's way back, where it holds words. */
  readonly backLabel?: string
  /** The cancelable event a move sends first, its `value` the new index. */
  readonly onBeforeChange: string
  /** The event sent once the last stop is finished. */
  readonly onComplete: string
  /** The prop that labels the last stop's way on, where it holds words. */
  readonly doneLabel?: string
  /** The prop that holds the index of the stop shown. */
  readonly prop: string
  /** The prop that seeds the index where nothing else writes one. */
  readonly defaultProp?: string
  /** The name of the value it computes, whether the spotlight lights a target. */
  readonly lit: string
  /** The event sent once a move stands, its `value` the new index. */
  readonly onChange: string
  /** The prop that labels each stop's way on, where it holds words. */
  readonly nextLabel?: string
  /** The prop that says what a press outside the stop and its target does: `close` ends the tour. */
  readonly outsidePress?: string
  /** The prop that holds the room around the target inside the spotlight, in pixels. */
  readonly spotlightPadding?: string
  /** The prop that holds each stop's place in words, with `{index}` and `{count}`. */
  readonly progressLabel?: string
  /** The state that holds while a stop's `effect` settles. */
  readonly preparing: string
  /** The prop that draws each stop's place as well as saying it. */
  readonly progress?: string
  /** The event sent as it waits at a `wait` stop, is skipped, or is completed. */
  readonly onStatus?: string
  /** The prop that labels each stop's way out, where it holds words. */
  readonly skipLabel?: string
  /** The start of the names of the lit box's four lengths. */
  readonly spotlight: string
  /** The name of the value it computes, whether a stop with nothing to light shows. */
  readonly veiled: string
  /** The state that holds while a `wait` stop waits for its target. */
  readonly waiting: string
}

/**
 * One stop of the `tour` around it, as a tour stop:
 *
 * ```ts
 * stop: { back: 'back', next: 'next', onAsk: 'tourAsk', skip: 'skip', target: 'for', ... }
 * ```
 *
 * **Its panel is placed against its `target`**, the view registered under
 * the id the prop holds, and shows while `shown` holds: while it is the
 * stop the tour is on, and not a `wait` stop. **The tour writes its place
 * on it**: `current`, `first`, and `last` hold as the tour stands, over what
 * the page wrote, and the stop computes the words its place is said in,
 * `place`, whether that place is drawn, `counted`, the panel's `name` and
 * what it `said` as it shows, how far its panel stands from its target,
 * `reach`, and the words of its three controls, `back-`, `next-`, and
 * `skip-` before `words`. **A press on `back`, `next`, or `skip` sends
 * `onAsk`**, with `what` it asks, and the tour answers it.
 */
export interface Stop {
  /** The event a press on one of its controls sends, its `what` the control. */
  readonly onAsk: string
  /** The part whose press goes back. */
  readonly back: string
  /** The name of the value it computes, whether its place is drawn as well as said. */
  readonly counted: string
  /** The prop the tour writes while it shows the stop. */
  readonly current: string
  /** The prop that holds what runs as the tour reaches the stop. */
  readonly effect?: string
  /** The prop the tour writes on its first stop. */
  readonly first: string
  /** The prop the tour writes on its last stop. */
  readonly last: string
  /** The name of the value it computes, the words its panel is named by. */
  readonly name: string
  /** The part whose press goes on, and finishes the tour on the last stop. */
  readonly next: string
  /** The name of the value it computes, its place in words, such as "2 of 5". */
  readonly place: string
  /** The name of the value it computes, how far its panel stands from its target. */
  readonly reach: string
  /** The name of the value it computes, the words said as its panel shows. */
  readonly said: string
  /** The name of the value it computes, whether its panel shows. */
  readonly shown: string
  /** The part whose press ends the tour. */
  readonly skip: string
  /** The prop that holds the id of what it points at. */
  readonly target: string
  /** The prop that says what kind of stop it is: a bubble, `dialog`, `floating`, or `wait`. */
  readonly type?: string
  /** The end of the names of the words its controls say: `back-words`, `next-words`, `skip-words`. */
  readonly words: string
}
