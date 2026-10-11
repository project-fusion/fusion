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

/** A side of a card, as JSON Canvas names it. */
type PasteSide = 'top' | 'right' | 'bottom' | 'left'

/**
 * What a paste adds to a board: a JSON Canvas document whose ids the board
 * does not hold yet, its cards moved clear of the ones they were copied from.
 * The shape is the format's, which `fromJsonCanvas` reads.
 */
export interface PasteDetail {
  document: {
    edges?: Array<{
      color?: string | undefined
      fromEnd?: 'none' | 'arrow' | undefined
      fromNode: string
      fromSide?: PasteSide | undefined
      id: string
      label?: string | undefined
      path?: 'curve' | 'straight' | 'step' | undefined
      toEnd?: 'none' | 'arrow' | undefined
      toNode: string
      toSide?: PasteSide | undefined
    }>
    nodes?: Array<{
      background?: string | undefined
      backgroundStyle?: 'cover' | 'ratio' | 'repeat' | undefined
      color?: string | undefined
      file?: string | undefined
      height: number
      id: string
      label?: string | undefined
      subpath?: string | undefined
      text?: string | undefined
      type: 'text' | 'file' | 'link' | 'group'
      url?: string | undefined
      width: number
      x: number
      y: number
    }>
  }
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

/** A hardware button Device Screen draws, named for what it does on the device. */
export type DeviceButton =
  | 'back'
  | 'home'
  | 'power'
  | 'recents'
  | 'rotate-left'
  | 'rotate-right'
  | 'volume-down'
  | 'volume-up'

/** Detail carried by `helix-device-button`. */
export interface DeviceButtonDetail {
  /** Which button was pressed. */
  button: DeviceButton
  /**
   * How long the button was held, in milliseconds. `0` for a press from a key
   * or a script, which has no length.
   */
  duration: number
}

/** Detail carried by `helix-device-key`. */
export interface DeviceKeyDetail {
  /** Whether Alt, or Option on a Mac, was held. */
  altKey: boolean
  /** The physical key, as `KeyboardEvent.code` names it: `KeyA`, `Enter`, `ArrowLeft`. */
  code: string
  /** Whether Control was held. */
  ctrlKey: boolean
  /** What the press produced, as `KeyboardEvent.key` names it: `a`, `A`, `Enter`. */
  key: string
  /** Whether Command on a Mac, or the Windows key, was held. */
  metaKey: boolean
  /** Whether the key went down or came up. */
  phase: 'down' | 'up'
  /** Whether the press is the key repeating while it is held. */
  repeat: boolean
  /** Whether Shift was held. */
  shiftKey: boolean
}

/** Detail carried by `helix-device-scroll`. */
export interface DeviceScrollDetail {
  /** How far across, in device units, in the wheel's sense: positive scrolls toward the right. */
  deltaX: number
  /** How far down, in device units, in the wheel's sense: positive scrolls toward the bottom. */
  deltaY: number
  /** The screen's height in the units the point is measured in. */
  height: number
  /** The screen's width in the units the point is measured in. */
  width: number
  /** Where the pointer is, across from the screen's left edge. */
  x: number
  /** Where the pointer is, down from the screen's top edge. */
  y: number
}

/** Detail carried by `helix-device-swipe`. */
export interface DeviceSwipeDetail {
  /** How long the finger was down, in milliseconds. */
  duration: number
  /** Where the touch began, across from the screen's left edge. */
  fromX: number
  /** Where the touch began, down from the screen's top edge. */
  fromY: number
  /** The screen's height in the units the points are measured in. */
  height: number
  /** Where the touch ended, across from the screen's left edge. */
  toX: number
  /** Where the touch ended, down from the screen's top edge. */
  toY: number
  /** The screen's width in the units the points are measured in. */
  width: number
}

/** Detail carried by `helix-device-tap`. */
export interface DeviceTapDetail {
  /** How long the finger was down, in milliseconds. A long press is a long tap. */
  duration: number
  /** The screen's height in the units the point is measured in. */
  height: number
  /** The screen's width in the units the point is measured in. */
  width: number
  /** Where the tap was, across from the screen's left edge. */
  x: number
  /** Where the tap was, down from the screen's top edge. */
  y: number
}

/** Detail carried by `helix-device-text`. */
export interface DeviceTextDetail {
  /** The text, as plain text. */
  text: string
}

/** Detail carried by `helix-device-touch`. */
export interface DeviceTouchDetail {
  /** The screen's height in the units the point is measured in. */
  height: number
  /**
   * Which finger, counting from `0`. A finger keeps its number until it lifts,
   * and the lowest free number goes to the next finger down.
   */
  id: number
  /**
   * Where the touch is in its life: `down` as the finger lands, `move` as it
   * moves, `up` as it lifts, and `cancel` when the browser takes the touch
   * away, which ends it without a lift.
   */
  phase: 'cancel' | 'down' | 'move' | 'up'
  /** The screen's width in the units the point is measured in. */
  width: number
  /** Where the finger is, across from the screen's left edge. */
  x: number
  /** Where the finger is, down from the screen's top edge. */
  y: number
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
 * Detail carried by `helix-before-reorder`, `helix-reorder`, and
 * `helix-reordered`: one row, item, or column moved to a new place.
 *
 * `from` and `to` count from 0 in the old order and in `keys`. Where your
 * array holds every key in the same order, `rows.splice(to, 0,
 * ...rows.splice(from, 1))` makes the same move.
 *
 * **`kind` is a field because one element sends both.** A data table moves its
 * rows and its columns, and both are `helix-reorder` from the same host.
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

/**
 * What a press came from, React Aria's `PointerType`: a pointer by its kind, a
 * key, or `virtual` for a press with neither behind it, which is how a screen
 * reader's press and a script's `click()` arrive.
 */
export type PressPointerType = 'keyboard' | 'mouse' | 'pen' | 'touch' | 'virtual'

/** Detail carried by `helix-press`. */
export interface PressDetail {
  /** What the press came from. */
  pointerType: PressPointerType
}

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

/** Detail carried by `helix-band`. */
export interface BandDetail {
  /** The band the reading is in now, or `''` where it is in none. */
  band: '' | 'fair' | 'good' | 'poor'
}

/** Detail carried by `helix-tour-status`. */
export interface TourStatusDetail {
  /** The stop it happened at, counting from 0. */
  index: number
  /** Waiting at a `wait` stop for its target, skipped, or completed. */
  status: 'completed' | 'skipped' | 'waiting'
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

/** Detail carried by `helix-strands-fallback`. */
export interface StrandsFallbackDetail {
  /**
   * Why the gradient shows: `software` for a renderer that draws on the CPU,
   * `unavailable` for no WebGL or a program the browser refused, and `lost`
   * for a context the browser took back, on a GPU reset or past its limit of
   * about sixteen.
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

/** Detail carried by `helix-terminal-input`. */
export interface TerminalInputDetail {
  /**
   * Whether `data` holds one byte per character, which some mouse reports
   * do, where the rest of input is text. Write it to the process as those
   * bytes, such as with `Uint8Array.from(data, (character) => character.charCodeAt(0))`.
   */
  binary: boolean

  /** What to write to the process, encoded as the program reads keys and pastes. */
  data: string
}

/** Detail carried by `helix-terminal-link`. */
export interface TerminalLinkDetail {
  /** The address, as the program wrote it. */
  href: string
}

/** Detail carried by `helix-terminal-resize`. */
export interface TerminalResizeDetail {
  /** How many character cells fit across the grid. */
  columns: number

  /** How tall the grid is, in CSS pixels, which a pseudo-terminal's size also takes. */
  height: number

  /** How many lines of cells fit down the grid. */
  rows: number

  /** How wide the grid is, in CSS pixels. */
  width: number
}

/** Detail carried by `helix-terminal-title`. */
export interface TerminalTitleDetail {
  /** The title, as the program set it. Empty where it cleared its title. */
  title: string
}
