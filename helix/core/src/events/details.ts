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

/** Detail carried by `helix-next` and `helix-previous`. */
export interface SkipDetail {
  /** Which way the reader asked to go. */
  to: 'next' | 'previous'
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

/**
 * Where a move or a resize puts each card it carries, in the board's own
 * units.
 *
 * **One contract for both**, because what a controlled page does with either
 * is the same: write the geometry the detail says onto the cards it renders. A
 * resize says `width` and `height` as well, and moves `x` and `y` too when it
 * is dragged from a corner other than the bottom right.
 */
export interface MoveDetail {
  /**
   * Every card the gesture moves, the one the reader took hold of first.
   *
   * **A list, because a group carries what is inside it.** Dragging a group
   * moves its cards with it, which is what every board does, and a controlled
   * consumer who refuses the move has to write every position it would have
   * written, not only the one the pointer was on.
   */
  nodes: Array<{ name: string; x: number; y: number; width?: number; height?: number }>
}

/** Which two cards a reader asked to join, by name, and the side they started from. */
export interface ConnectDetail {
  from: string
  to: string
  /** The side the reader drew from, where they drew from one. */
  fromSide?: 'top' | 'right' | 'bottom' | 'left' | undefined
  /** The side nearest where they let go, where they let go over a card. */
  toSide?: 'top' | 'right' | 'bottom' | 'left' | undefined
}

/** Where a connection's ends are going, and where they were. */
export interface ReconnectDetail {
  /** The connection's name, where it has one. */
  name: string
  /** Its ends before, so a page that named none of its connections can find it. */
  was: { from: string; to: string }
  from: string
  to: string
  fromSide?: 'top' | 'right' | 'bottom' | 'left' | undefined
  toSide?: 'top' | 'right' | 'bottom' | 'left' | undefined
}

/** A label a reader rewrote on a board, and what it said before. */
export interface RelabelDetail {
  /** What was relabelled: a connection, or a group, whose name the board draws. */
  target: 'edge' | 'group'
  /** Its name on the board. */
  name: string
  /** A connection's ends, so a page that named none of its connections can find it. */
  from?: string | undefined
  to?: string | undefined
  /** The new label, empty for none. */
  label: string
  /** The label before. */
  was: string
}

/** Why a file field did not take a file. */
export type Refusal = 'count' | 'invalid' | 'size' | 'type'

/** One file a file field did not take, and why. */
export interface RefusedFile {
  /** The file. */
  readonly file: File
  /** What the field's `validate` said about it, where it was the one refusing. */
  readonly message?: string
  /** Why it was not taken. */
  readonly reason: Refusal
}

/** The files a file field refused. */
export interface RejectDetail {
  /** Each refused file with its reason, in the order they arrived. */
  files: RefusedFile[]
}

/** What a reader asked to take off the board. */
export interface RemoveDetail {
  /** The cards, by name. */
  nodes: string[]
  /**
   * The connections, including every one attached to a card being removed,
   * since a line to nothing is not drawn but its element would stay behind.
   * Each carries its ends as well as its name, so a page that named none of
   * its connections can still find them.
   */
  edges: Array<{ name: string; from: string; to: string }>
}

/**
 * Where a board is looking: the point at the middle of the view, in the
 * document's own units, and how far it is zoomed.
 *
 * The middle rather than a corner, so a view saved in one box and restored in
 * a box of another size shows the same thing in the middle of it.
 */
export interface CanvasView {
  x: number
  y: number
  zoom: number
}

/** What `ViewportPanDetail` was called when only Map had one. */
export type MapPanDetail = ViewportPanDetail

/** What `ViewportZoomDetail` was called when only Map had one. */
export type MapZoomDetail = ViewportZoomDetail

/** Detail carried by `helix-navigate`. */
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

/** Detail carried by `helix-filter`. */
export interface FilterDetail {
  /** What the list is being narrowed to. */
  value: string
}

/**
 * Detail carried by `helix-facet`.
 *
 * **Everything needed to draw the chip, so nothing has to be looked up again.**
 * A consumer hearing this renders a `FilterChip` from it and stops: the labels
 * are the reader's words and the names are their own model's, and both are here
 * because only the thing that read the declarations knows both.
 */
export interface FacetDetail {
  /**
   * How many values the comparison in force takes.
   *
   * **What tells an empty filter from no filter.** `values` empty usually means
   * the field is not being filtered any more, and a consumer drops the chip; a
   * comparison of arity `none`, `is empty` or `is set`, is a filter that has no
   * values to carry and never will. Without this the two arrive identical, and
   * the thing that read the declaration is the only thing that could say which.
   */
  arity: 'many' | 'none' | 'one'
  /** What the consumer's model calls the field. */
  field: string
  /** What a reader is shown for the field. */
  label: string
  /** What the consumer's model calls the comparison in force. */
  operator: string
  /**
   * The comparison as a reader sees it, and **empty for the field's usual one**.
   *
   * Passed straight to a chip's `operator-label`, which draws the segment only
   * where there is one. Deciding it here is the point: the thing that read the
   * field knows which of its operators is the default, and the chip never has
   * to.
   */
  operatorLabel: string
  /** What the field is compared to, as the consumer's own values. */
  values: readonly string[]
}

/** Detail carried by `helix-read`. */
export interface ReadDetail {
  /**
   * The state being asked for, as a boolean rather than a word that reads like
   * one, which is `helix-before-toggle`'s rule and for the same reason: `"false"` is
   * truthy and a consumer who forgets that marks everything read.
   */
  read: boolean
}

/** Detail carried by `helix-send`. */
export interface SendDetail {
  /** What the reader wrote, as they left it. */
  value: string
}

/** Detail carried by `helix-sort`. */
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

/** What a stop's own controls ask the tour to do. */
export interface TourAskDetail {
  /**
   * Which control was pressed.
   */
  what: 'back' | 'next' | 'skip'
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
 * no error. That is why checkedness has `helix-before-toggle` and its own boolean, and
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
  /** The value after the change. */
  value: string
}

/** Where each note was laid out, by its `id`, in the renderer's own units. */
export interface GraphLayoutDetail {
  positions: Record<string, { x: number; y: number; z?: number | undefined }>
}

/** What changed on a graph frame that the renderer has to hear. */
export interface GraphPartChangeDetail {
  /**
   * `data` for the notes or the links, which are drawn again; `focus` for the
   * selected note or the depth, which change what is emphasized and shown;
   * `gestures` for which gestures the renderer takes.
   */
  kind: 'data' | 'focus' | 'gestures'
}

/** One signal between two notes, as the frame's `signal()` sends it. */
export interface GraphSignalDetail {
  /** The note the signal leaves, by its `id`. */
  from: string
  /**
   * What the signal means, which colors it. Where none is given, the signal
   * turns from the first note's color to the second's as it crosses.
   */
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning' | undefined
  /** The note the signal reaches, by its `id`. */
  to: string
}

/** Detail carried by `helix-graph-filter`. */
export interface GraphFilterDetail {
  /** The groups the graph would hide, by name: every group the reader has turned off, after this press. */
  hidden: readonly string[]
}

/** A rotate request: turn by some degrees, or turn to a bearing. */
export interface MapRotateDetail {
  /** Degrees to turn the map clockwise. Negative turns it counterclockwise. */
  by?: number
  /** The bearing to turn the map to, in degrees clockwise from north. `0` faces north. */
  to?: number
}

/** A tilt request, in degrees. */
export interface MapTiltDetail {
  /** Degrees to tilt the map toward the horizon. Negative tilts it back toward flat. */
  by?: number
  /** The tilt to go to, in degrees from looking straight down. `0` is flat. */
  to?: number
}

/** What changed on a part of a map: a line or a shape, or something standing on a place. */
export interface MapPartChangeDetail {
  /**
   * `layer` for a route or an area, which is redrawn; `place` for a marker or
   * a position, which is moved; `cluster` for a marker gathered into another
   * or let go, which moves the frame's tab stop; `menu` for the frame's layers
   * menu opening, which asks for its map-type previews; `gestures` for which
   * gestures the map takes, which the renderer is told.
   */
  kind: 'cluster' | 'gestures' | 'layer' | 'menu' | 'place'
}

/** What a cluster a reader pressed holds. */
export interface MapClusterDetail {
  /**
   * A points layer's count, as the connector keyed it, where the cluster is
   * one the renderer drew rather than one of markers.
   */
  key?: string | undefined
  /** The names of the places it stands for, the one it is drawn as first, where they are known. */
  labels: string[]
}

/** Detail carried by `helix-scrolled`. */
export interface ScrolledDetail {
  /**
   * Whether the page is scrolled away from the top, as a boolean and not a word
   * that reads like one. Follows `helix-before-toggle`'s rule for the same reason.
   */
  scrolled: boolean
}

/** Detail carried by `helix-before-toggle`. */
export interface ToggleDetail {
  /** The state being asked for, as a boolean and not a word that reads like one. */
  checked: boolean
}

/** Detail carried by `helix-create`. */
export interface CreateDetail {
  /** What the reader typed, which is being offered as a new answer. */
  value: string
}

/** Detail carried by `helix-aura-fallback`. */
export interface AuraFallbackDetail {
  /**
   * Why the gradient shows: `software` for a renderer that draws on the CPU,
   * `unavailable` for no WebGL or a shader the browser refused, and `lost` for
   * a context the browser took back, on a GPU reset or past its limit of about
   * sixteen.
   */
  reason: 'lost' | 'software' | 'unavailable'
}

/** Detail carried by `helix-range-change`. */
export interface RangeDetail {
  /** The index of the first item on screen. */
  first: number
  /** One past the index of the last item on screen. */
  last: number
}

/** Detail carried by `helix-typing`. */
export interface TypingDetail {
  /** Whether the user is writing now, as a boolean and not a word that reads like one. */
  typing: boolean
}

/** Detail carried by `helix-copy`. */
export interface CopyDetail {
  /** What was put on the clipboard. */
  value: string
}

/** Detail carried by `helix-console`. */
export interface ConsoleDetail {
  /** How the message was logged. */
  level: 'log' | 'info' | 'warn' | 'error'

  /** The message, already flattened to text. */
  text: string
}

/** Detail carried by `helix-resize`. */
export interface ResizeDetail {
  /** How tall the content is, in CSS pixels. */
  size: number
}

/** Detail carried by `helix-caret`. */
export interface CaretDetail {
  /** One-based column, counted in characters from the start of the line. */
  column: number

  /** One-based line. */
  line: number
}

/** Detail carried by `helix-select`. */
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

/** What a shortcut reports when its chord is pressed. */
export interface ShortcutDetail {
  /**
   * The chord that matched, as it was written.
   *
   * Given back rather than left to be remembered, so one handler can serve
   * several keys and answer by comparing what it was told.
   */
  keys: string
}
