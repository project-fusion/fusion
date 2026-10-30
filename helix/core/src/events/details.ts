/*
 * What the event classes carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime and every event module can
 * import from it without pulling another in. Several events share a detail,
 * `ChangeDetail` above all, which is why the details are kept together and the
 * classes are not.
 */

/** Detail carried by `helix-before-open` and `helix-before-close`. */
export interface OpenDetail {
  /** The state the element is moving to. */
  open: boolean
}

/**
 * Detail carried by a pan request, `helix-map-pan` being the one Map sends.
 *
 * Named for the surface rather than for the map, because the surface is shared:
 * `MixinViewport` is what asks, and a canvas or a graph asking the same question
 * should not be importing a type with `Map` in its name. `MapPanDetail` stays as
 * an alias, that being what a consumer of Map wrote before this was split.
 */
export interface ViewportPanDetail {
  /** Which way the reader asked to go, in reading order rather than compass order. */
  to: 'up' | 'down' | 'start' | 'end'
  /** How far, as a fraction of the viewport the map is drawn in. */
  by: number
}

/** Detail carried by a zoom request, named for the surface for the same reason. */
export interface ViewportZoomDetail {
  /** Which way, `1` in and `-1` out, so a consumer can multiply by their own step. */
  by: number
}

/** Detail carried by `helix-before-navigate` and `helix-navigate`. */
export interface NavigateDetail {
  /**
   * The page asked for, as a number, where the component pages by number.
   *
   * Beside `value` rather than in place of it, because a calendar pages by
   * month and its `value` is a month.
   */
  page?: number
  /** Where the view is moving to, in whatever the component pages by. */
  value: string
}

/** Detail carried by `helix-before-filter` and `helix-filter`. */
export interface FilterDetail {
  /** What the list is being narrowed to. */
  value: string
}

/** Detail carried by `helix-found`. */
export interface FoundDetail {
  /** How many matches the search found. */
  count: number

  /** Which match is current, counting from 0, or -1 for none. */
  index: number
}

/** Detail carried by `helix-before-sort` and `helix-sort`. */
export interface SortDetail {
  /**
   * The order being asked for, as `field:direction`.
   *
   * **One string rather than a field and a direction beside it**, because a sort
   * is one fact and two properties holding half of it each is the mistake
   * `helix-table`'s `columns` string already made in this family: the headings
   * and the widths were two halves of one thing kept in two places with nothing
   * holding them together. `name:asc` is also what a URL query carries and what
   * an API takes, so a consumer syncing either does no translation.
   *
   * Empty means unsorted, which is a state a reader can ask for: a third click
   * on a sortable heading returns the set to the order it arrived in, and that
   * order is information the data came with.
   */
  value: string
}

/** Detail carried by `helix-dismiss`. */
export interface DismissDetail {
  /** Text content of the element asking to go, for identifying which it was. */
  label: string
}

/**
 * Detail carried by every request that proposes a value.
 *
 * **`value` is a string, and the things that are not strings are the rule
 * rather than the exception to it.** Pagination's page, its page size, the
 * splitter's position and the carousel's index all announce through `String()`.
 * That is deliberate: an HTML value is a string, a consumer parses one back
 * with `Number()`, and nothing is lost on the way.
 *
 * A boolean is the case where it *is* lost, because `"false"` is truthy, so a
 * consumer who forgets to compare against the word gets the opposite answer and
 * no error. That is why checkedness has `helix-before-check` and its own boolean, and
 * it is the line to hold: **stringify a value, never a fact.** A new control
 * whose state is a boolean wants an event with a typed detail, not a `String()`
 * call here.
 *
 * **There is no `property` field.** Every verb in this file says by itself which
 * property a request is about, and two families sharing a verb are told apart by
 * the element rather than by a field: `composedPath()[0]` survives the retarget
 * that `event.target` does not.
 */
export interface ChangeDetail {
  /**
   * Why the change was asked for, where a family names its causes. Video
   * Playlist sends `ended`, `next`, `press`, `previous`, and `removed` on
   * `helix-before-activate`.
   */
  cause?: string
  /** The value after the change. */
  value: string
}

/**
 * Detail carried by `helix-before-reorder` and `helix-reorder`: one row,
 * item, or column moved to a new place.
 *
 * `from` and `to` count from 0 in the old order and in `keys`. Where your
 * array holds every key in the same order, `rows.splice(to, 0,
 * ...rows.splice(from, 1))` makes the same move.
 *
 * **`kind` is a field because one element sends both.** A data table moves its
 * rows and its columns, and both are `helix-before-reorder` and `helix-reorder`
 * from the same host.
 */
export interface ReorderDetail extends ChangeDetail {
  /** Where the key was before the move, counting from 0 in the old order. */
  from: number

  /** The key of what moved: a row's key, an item's value, or a column's field. */
  key: string

  /** Every key in the new order. */
  keys: string[]

  /** What moved: a column of a data table, an item of a list, or a row of a data table. */
  kind: 'column' | 'item' | 'row'

  /**
   * The key of the branch a tree item moves into, and `''` for the top level,
   * where a `reorderable` tree moves an item into another branch. `keys` are
   * then that branch's items in their new order. Absent for a move among
   * siblings.
   */
  parent?: string

  /** Where the key is after the move, counting from 0 in `keys`. */
  to: number

  /**
   * The new order as one string: fields separated by spaces for columns, which
   * is what `order` takes, and keys separated by commas for rows and items.
   */
  value: string
}

/** Detail carried by `helix-activate`: the value after the move, and the one before it. */
export interface ActivateDetail extends ChangeDetail {
  /** The value that was current before the move, where the set knows it. */
  previous?: string
}

/** Detail carried by `helix-plot-change`. */
export interface PlotChangeDetail {
  /** `data` for the points or the axes, which are drawn again; `focus` for the point the keys rest on. */
  kind: 'data' | 'focus'
}

/** Detail carried by `helix-plot-turn`. */
export interface PlotTurnDetail {
  /** Steps to turn about the vertical, positive to the right. */
  across: number
  /** Steps to tilt, positive to look from higher. */
  up: number
}

/**
 * What a press came from, React Aria's `PointerType`: a pointer by its kind, a
 * key, or `virtual` for a press with neither behind it, which is how a screen
 * reader's press and a script's `click()` arrive.
 */
export type PressPointerType = 'keyboard' | 'mouse' | 'pen' | 'touch' | 'virtual'

/** Detail carried by `helix-reading-change` and `helix-reading-press`. */
export interface ReadingDetail {
  /** The reading's place among the table's rows, counting from 0, or `-1` once no reading is shown. */
  index: number
  /** The reading's name, its row's heading, such as `March`. Empty with no reading. */
  label: string
  /** What moved to the reading or pressed it. */
  pointerType: 'keyboard' | 'mouse' | 'pen' | 'touch'
  /**
   * The heading of the series the up and down keys rest on within the
   * reading, or `''` while the whole reading is read.
   */
  series: string
}

/** Detail carried by `helix-before-check` and `helix-check`. */
export interface CheckDetail {
  /** The state being asked for, as a boolean and not a word that reads like one. */
  checked: boolean
}

/** Detail carried by `helix-copy`. */
export interface CopyDetail {
  /** What was put on the clipboard. */
  value: string
}

/** Detail carried by `helix-resize`. */
export interface ResizeDetail {
  /** How tall the content is, in CSS pixels. */
  size: number
}

/** Detail carried by `helix-before-select` and `helix-select`. */
export interface SelectDetail {
  /**
   * Whether the reader took the row's second destination rather than its first.
   *
   * Absent everywhere but a command palette, where a row can carry two: the
   * value alone would say which was taken, since the two differ, but only by
   * comparing strings a consumer would have to keep in step with the markup.
   * A flag says it outright.
   */
  alternate?: boolean
  /**
   * The link of a row that is a link, which the browser follows once the event
   * is done unless it is canceled. A client-side router cancels it and follows
   * the link itself.
   */
  href?: string
  /** Value of the item the reader chose. */
  value: string
}

/** Detail carried by `helix-complete`. */
export interface CompleteDetail {
  /** What the control now holds, in full. */
  value: string
}

/** Detail carried by `helix-listen`. */
export interface ListenDetail {
  /** The phrase the field settled on, as it went into the value. */
  text: string
}
