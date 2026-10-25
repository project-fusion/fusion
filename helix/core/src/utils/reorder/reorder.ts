/**
 * The state and the arithmetic of moving one item to a new place in its
 * collection: rows of a list or a data table, or a table's columns.
 *
 * Pure, so every transition and every sum has a spec with no DOM.
 * `ReorderController` holds the state, listens to the pointer and the keys, and
 * runs the effects each change of state calls for.
 */

/** Which way a collection runs: rows down the block axis, columns along the inline one. */
export type ReorderAxis = 'block' | 'inline'

/** What holds the item: a key or a press on its grip, or a pointer dragging it. */
export type ReorderHold = 'keyboard' | 'pointer'

/**
 * Where a move stands.
 *
 * - `idle`: nothing is held.
 * - `pressed`: a pointer is down on a grip and has not traveled far enough to
 *   be a drag.
 * - `held`: an item is held, and `to` is where it would go.
 * - `dropped` and `canceled`: the move has ended, for one step, so the
 *   controller can run what each calls for before it settles to `idle`.
 *
 * `from` and `to` count from 0 in the order the items are drawn.
 */
export type ReorderState =
  | { phase: 'idle' }
  | { from: number; key: string; phase: 'pressed'; pointer: number; x: number; y: number }
  | { by: ReorderHold; from: number; key: string; phase: 'held'; to: number }
  | { by: ReorderHold; from: number; key: string; phase: 'dropped'; to: number }
  | { by: ReorderHold; key: string; phase: 'canceled' }

/**
 * What can happen to a move.
 *
 * - `press`: a pointer went down on a grip.
 * - `drag`: the pointer moved, and `to` is the place under it.
 * - `release`: the pointer went up.
 * - `pick`: a grip was pressed with a key or a click. It holds the item, or
 *   drops the item that grip already holds.
 * - `step`: a key moved the held item to `to`.
 * - `target`: a click on another item dropped the held one at `to`.
 * - `drop` and `cancel`: Enter or Space, and Escape.
 * - `settle`: the controller has run the effects of a drop or a cancel.
 */
export type ReorderInput =
  | { from: number; key: string; pointer: number; type: 'press'; x: number; y: number }
  | { slop: number; to: number; type: 'drag'; x: number; y: number }
  | { type: 'release' }
  | { from: number; key: string; type: 'pick' }
  | { to: number; type: 'step' }
  | { to: number; type: 'target' }
  | { type: 'cancel' }
  | { type: 'drop' }
  | { type: 'settle' }

/** The state with nothing held. */
export const IDLE: ReorderState = { phase: 'idle' }

/**
 * The state after an input, or `null` where the input changes nothing.
 *
 * A press becomes a drag only once the pointer has traveled `slop` pixels, so a
 * click on a grip stays a click. A click on a grip holds the item for the
 * keys, and a second click on the same grip drops it, which is the move a
 * single pointer makes without dragging.
 */
export const reorderStep = (state: ReorderState, input: ReorderInput): ReorderState | null => {
  switch (input.type) {
    case 'press':
      return state.phase === 'idle'
        ? {
            from: input.from,
            key: input.key,
            phase: 'pressed',
            pointer: input.pointer,
            x: input.x,
            y: input.y,
          }
        : null
    case 'drag':
      if (state.phase === 'pressed') {
        return Math.hypot(input.x - state.x, input.y - state.y) < input.slop
          ? null
          : { by: 'pointer', from: state.from, key: state.key, phase: 'held', to: input.to }
      }
      return state.phase === 'held' && state.by === 'pointer' && state.to !== input.to
        ? { ...state, to: input.to }
        : null
    case 'release':
      if (state.phase === 'pressed') {
        return IDLE
      }
      return state.phase === 'held' && state.by === 'pointer'
        ? { ...state, phase: 'dropped' }
        : null
    case 'pick':
      if (state.phase === 'idle') {
        return { by: 'keyboard', from: input.from, key: input.key, phase: 'held', to: input.from }
      }
      return state.phase === 'held' && state.by === 'keyboard' && state.key === input.key
        ? { ...state, phase: 'dropped' }
        : null
    case 'step':
      return state.phase === 'held' && state.by === 'keyboard' && state.to !== input.to
        ? { ...state, to: input.to }
        : null
    case 'target':
      return state.phase === 'held' && state.by === 'keyboard'
        ? { ...state, phase: 'dropped', to: input.to }
        : null
    case 'drop':
      return state.phase === 'held' ? { ...state, phase: 'dropped' } : null
    case 'cancel':
      if (state.phase === 'pressed') {
        return IDLE
      }
      return state.phase === 'held' ? { by: state.by, key: state.key, phase: 'canceled' } : null
    case 'settle':
      return state.phase === 'dropped' || state.phase === 'canceled' ? IDLE : null
  }
}

/**
 * How many of the other items the pointer has passed: the place the held item
 * goes, among the others.
 *
 * `centers` are the middles of the other items along the axis, in the order
 * drawn. `reversed` is a row laid out from the right, a right-to-left page,
 * where passing an item means being left of its middle.
 */
export const passedCount = (centers: readonly number[], at: number, reversed = false): number =>
  centers.filter((center) => (reversed ? at < center : at > center)).length

/**
 * The middles of the items along the axis, from their boxes, for
 * `passedCount`.
 *
 * An item with no box is one a window did not draw. One before every drawn
 * item counts as passed, one after them as not passed, and one between two
 * drawn items as where the drawn one before it is. `reversed` is the same
 * question on a row laid out from the right.
 */
export const centersOf = (
  spans: readonly ({ end: number; start: number } | undefined)[],
  reversed = false,
): number[] => {
  const drawn = spans.flatMap((span, index) => (span ? [index] : []))
  const first = drawn[0] ?? spans.length
  const last = drawn[drawn.length - 1] ?? -1
  let before = reversed ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
  return spans.map((span, index) => {
    if (span) {
      before = (span.start + span.end) / 2
      return before
    }
    if (index < first) {
      return reversed ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
    }
    return index > last ? (reversed ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY) : before
  })
}

/**
 * Where a key moves a held item, or `null` for a key that does not move one.
 *
 * The arrows along the axis move it one place, and Home and End move it to
 * either end. Along the inline axis the arrows follow the writing direction,
 * so on a right-to-left page the left arrow moves it forward. The answer is
 * held to the collection, so an arrow at an end returns where it already is.
 */
export const reorderKey = (
  key: string,
  { axis, count, rtl, to }: { axis: ReorderAxis; count: number; rtl: boolean; to: number },
): number | null => {
  const last = Math.max(0, count - 1)
  if (key === 'Home') {
    return 0
  }
  if (key === 'End') {
    return last
  }
  const back = axis === 'block' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'
  const forward = axis === 'block' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'
  if (key !== back && key !== forward) {
    return null
  }
  return Math.min(last, Math.max(0, to + (key === forward ? 1 : -1)))
}

/**
 * Where the drop indicator goes for a held item: before or after the item at
 * an index of the order drawn, or nowhere while the item would stay where it
 * is.
 *
 * Moving back, the item lands before the one now at `to`. Moving forward, it
 * lands after it.
 */
export const dropMark = (
  from: number,
  to: number,
): { edge: 'after' | 'before'; index: number } | undefined =>
  to === from ? undefined : { edge: to < from ? 'before' : 'after', index: to }

/**
 * Every key in a new order: `key` taken out and put back at `to` among the
 * shown ones.
 *
 * `all` is the whole order, which can hold keys that are not drawn: a hidden
 * column, or a row a search left out. `shown` is the order drawn. The key goes
 * after the shown one it now follows, or before the first shown one where it
 * moves to the front, so a key that is not drawn keeps its place among the
 * rest.
 */
export const placeKey = (
  all: readonly string[],
  shown: readonly string[],
  key: string,
  to: number,
): string[] => {
  const others = shown.filter((one) => one !== key)
  const rest = all.filter((one) => one !== key)
  const beside = others[to - 1] ?? others[0]
  if (beside === undefined) {
    return [...all]
  }
  rest.splice(rest.indexOf(beside) + (to > 0 ? 1 : 0), 0, key)
  return rest
}

/** How far in from each edge of a box a held item scrolls it, in pixels, where the box is long enough. */
export const EDGE_ZONE = 40

/**
 * How far to scroll a box in one frame while a held item is near one of its
 * edges, in pixels: negative toward the start, positive toward the end, and 0
 * away from both.
 *
 * `at` is the pointer along the axis, and `start` and `end` are the box's
 * edges. The speed rises from nothing at `zone` pixels in to `most` at the
 * edge and past it.
 */
export const edgeSpeed = (
  at: number,
  start: number,
  end: number,
  { most = 12, zone = EDGE_ZONE }: { most?: number; zone?: number } = {},
): number => {
  const reach = Math.min(zone, (end - start) / 2)
  if (reach <= 0) {
    return 0
  }
  if (at < start + reach) {
    return -Math.round(most * Math.min(1, (start + reach - at) / reach)) || 0
  }
  if (at > end - reach) {
    return Math.round(most * Math.min(1, (at - (end - reach)) / reach))
  }
  return 0
}
