/**
 * Event classes, one per event a Helix component dispatches.
 *
 * A named class rather than `dispatchEvent(new CustomEvent(name, …))` for three
 * reasons, all of them about the type reaching a consumer:
 *
 * 1. `@event {HelixBeforeOpenEvent} helix-before-open` puts the class name in the manifest,
 *    which is what lets the React generator emit a typed callback instead of
 *    `(detail: unknown)`.
 * 2. The augmentation of `HTMLElementEventMap` below types `addEventListener`
 *    for consumers writing plain HTML, who never see the React wrappers.
 * 3. The event name lives on the class as `eventName`, so a listener and a
 *    dispatch cannot disagree about the string.
 */

/*
 * Names are `helix-{verb}`, lowercase and prefixed.
 *
 * The prefix is what stops a collision with a native name: an event dispatched
 * inside a shadow root is retargeted to look like it came from the host, so a
 * bare `input` from a `<helix-input>` is indistinguishable from the inner
 * control's own. Prefixed, it cannot be mistaken for either.
 *
 * The name also decides the framework prop, and decides it verbatim: React
 * slices `on` off the prop and listens for exactly what is left, so `helix-before-open`
 * is `onhelix-before-open`. Nothing strips the prefix and nothing camel-cases it, which
 * is what leaves the prefix free to do the third job below.
 *
 * The prefix earns its place three times over:
 *
 * 1. **Retargeting.** Stated above, and the reason it exists.
 * 2. **React's claimed verbs.** Its synthetic system owns `change`, `input`,
 *    `submit`, `copy`, `focus` and the rest, and a prop matching one of those
 *    is wired to the native event. Prefixed, `onhelix-before-change` matches none
 *    of them and reaches us.
 * 3. **The type map below, which is global.** `HTMLElementEventMap` is shared
 *    with every element in a consumer's application, and our classes extend
 *    `Event`, so an entry named `select` does not fail to compile: it silently
 *    retypes `textarea.addEventListener('select', …)` as carrying our detail,
 *    which at runtime is `undefined`. Measured. An unprefixed name is not a
 *    collision we would notice, it is one a consumer would.
 *
 * Propagation follows the event's role rather than a single house rule:
 *
 * - **Lifecycle** (`helix-before-open`, `helix-before-close`) does not bubble and is not
 *   composed. Overlays nest, and an inner one's lifecycle must never reach the
 *   outer one that contains it.
 * - **Coordination** (`helix-select`, `helix-dismiss`, `helix-before-change`)
 *   bubbles and is composed, so a parent or a router can intercept it across a
 *   shadow boundary.
 */

/** Detail carried by `helix-before-open` and `helix-before-close`. */
export interface OpenDetail {
  /** The state the element is moving to. */
  open: boolean
}

/**
 * Fired when an element is about to open.
 *
 * Cancelable: `preventDefault()` refuses the change, and the element stays
 * closed. Paired with `helix-before-close` rather than being one event carrying a
 * boolean, so a listener that only cares about one direction says so by which
 * event it listens for.
 *
 * Neither bubbles nor composed. A dialog inside a drawer inside a popover is
 * three overlays, and an inner one opening must not read as the outer one
 * opening.
 */
export class HelixBeforeOpenEvent extends CustomEvent<OpenDetail> {
  static readonly eventName = 'helix-before-open'

  constructor() {
    super(HelixBeforeOpenEvent.eventName, {
      bubbles: false,
      cancelable: true,
      composed: false,
      detail: { open: true },
    })
  }
}

/** Fired when an element is about to close. See `HelixBeforeOpenEvent`. */
export class HelixBeforeCloseEvent extends CustomEvent<OpenDetail> {
  static readonly eventName = 'helix-before-close'

  constructor() {
    super(HelixBeforeCloseEvent.eventName, {
      bubbles: false,
      cancelable: true,
      composed: false,
      detail: { open: false },
    })
  }
}

/**
 * Fired when the reader asks for the next thing in a set.
 *
 * Paired with `helix-previous` rather than being one event carrying a
 * direction, which is the reason `helix-before-open` gives for its own pair: a
 * listener that only cares about one direction says so by which event it
 * listens for. The detail carries the direction anyway, so a consumer who does
 * want one handler can have one.
 *
 * Bubbles and is composed, because the thing that answers this is usually not
 * the thing that asked. A video has no notion of a set: it plays one resource,
 * and what comes next is a playlist's business or the consumer's, so the event
 * has to reach a wrapper.
 *
 * Not cancelable. There is no default action to refuse: the component that
 * fires this does nothing on its own, and an event whose `preventDefault` means
 * nothing is an event that lies about what it offers.
 */
export class HelixNextEvent extends CustomEvent<SkipDetail> {
  static readonly eventName = 'helix-next'

  constructor() {
    super(HelixNextEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: { to: 'next' },
    })
  }
}

/** Fired when the reader asks for the previous one. See `HelixNextEvent`. */
export class HelixPreviousEvent extends CustomEvent<SkipDetail> {
  static readonly eventName = 'helix-previous'

  constructor() {
    super(HelixPreviousEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: { to: 'previous' },
    })
  }
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
 * The board moved, which on a canvas is a fact rather than a request.
 *
 * **`Map` asks and `Canvas` tells, and the difference is who draws.** A map is
 * somebody else's, so the frame can only ask them to move it; a canvas is drawn
 * here from a document, so the same press moves it and this says that it did.
 * The detail is the same shape either way, being a direction and a distance.
 */
export class HelixCanvasPanEvent extends CustomEvent<ViewportPanDetail> {
  static readonly eventName = 'helix-canvas-pan'

  constructor(detail: ViewportPanDetail) {
    super(HelixCanvasPanEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/** The board zoomed, and told, for the same reason. */
export class HelixCanvasZoomEvent extends CustomEvent<ViewportZoomDetail> {
  static readonly eventName = 'helix-canvas-zoom'

  constructor(detail: ViewportZoomDetail) {
    super(HelixCanvasZoomEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
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

/**
 * Cards are about to move, and can be refused.
 *
 * **This is the controlled half, the way `helix-before-open` is for a
 * dialog.** A board moves its own cards by default, writing `x` and `y` onto
 * each one the way an input writes its own value. A consumer who keeps the
 * positions in their own state calls `preventDefault()` here, writes what the
 * detail says into that state, and renders the cards where it puts them.
 *
 * Sent for every step of a drag, so a controlled board follows the pointer
 * rather than jumping on the drop.
 */
export class HelixBeforeMoveEvent extends CustomEvent<MoveDetail> {
  static readonly eventName = 'helix-before-move'

  constructor(detail: MoveDetail) {
    super(HelixBeforeMoveEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * Cards moved, and the move is finished: a drag let go, or a key press.
 *
 * The `change` to `helix-before-move`'s `input`: what a consumer binds who
 * only wants to save a board once somebody has finished rearranging it.
 */
export class HelixMoveEvent extends CustomEvent<MoveDetail> {
  static readonly eventName = 'helix-move'

  constructor(detail: MoveDetail) {
    super(HelixMoveEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
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

/**
 * A reader asked for two cards to be joined.
 *
 * **A request with no default, which is the difference from a move.** A board
 * writes a card's position onto the card, because the card is already there.
 * A connection is a new element, and a board that added one to markup React
 * renders would have it put back or thrown away on the next render. So the board
 * asks and the page adds the `helix-canvas-edge`, the way `Map` asks to be panned.
 */
export class HelixConnectEvent extends CustomEvent<ConnectDetail> {
  static readonly eventName = 'helix-connect'

  constructor(detail: ConnectDetail) {
    super(HelixConnectEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
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

/**
 * A connection's end is about to move to another card or another side, and can
 * be refused.
 *
 * **A move, not a request, and that is the difference from `helix-connect`.**
 * The connection is already an element on the page, so the board rewrites its
 * ends itself, the way it writes a card's position onto the card; a page that
 * holds its connections in state refuses this and writes them there.
 */
export class HelixBeforeReconnectEvent extends CustomEvent<ReconnectDetail> {
  static readonly eventName = 'helix-before-reconnect'

  constructor(detail: ReconnectDetail) {
    super(HelixBeforeReconnectEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/** A connection's end moved, and the move is finished. */
export class HelixReconnectEvent extends CustomEvent<ReconnectDetail> {
  static readonly eventName = 'helix-reconnect'

  constructor(detail: ReconnectDetail) {
    super(HelixReconnectEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
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

/**
 * A label the board draws is about to change, and can be refused.
 *
 * **The board edits what it draws and asks for what it does not.** A
 * connection's label and a group's name are drawn by the board from an
 * attribute, so the board edits them in place and writes the attribute back,
 * the way it writes a card's position; a page holding them in state refuses
 * this and writes them there. A card's own content is the page's, which is why
 * that is `helix-canvas-edit`, a request, rather than this.
 */
export class HelixBeforeRelabelEvent extends CustomEvent<RelabelDetail> {
  static readonly eventName = 'helix-before-relabel'

  constructor(detail: RelabelDetail) {
    super(HelixBeforeRelabelEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/** A label the board draws changed. */
export class HelixRelabelEvent extends CustomEvent<RelabelDetail> {
  static readonly eventName = 'helix-relabel'

  constructor(detail: RelabelDetail) {
    super(HelixRelabelEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/**
 * A reader asked to edit a card: a double-click, or Enter or F2 on it.
 *
 * **A request, because what a card holds is the page's.** Text, a picture, a
 * chart: the board cannot know what editing any of those means, so it says
 * which card and the page opens its own editor, in place, in a dialog, or in a
 * panel beside the board.
 */
export class HelixCanvasEditEvent extends CustomEvent<{ name: string }> {
  static readonly eventName = 'helix-canvas-edit'

  constructor(detail: { name: string }) {
    super(HelixCanvasEditEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
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
 * A reader asked for cards or connections to be taken away.
 *
 * A request for the reason `helix-connect` is one: the elements are the page's,
 * so the page removes them. Nothing to refuse, because nothing happens unless
 * the page acts.
 */
export class HelixRemoveEvent extends CustomEvent<RemoveDetail> {
  static readonly eventName = 'helix-remove'

  constructor(detail: RemoveDetail) {
    super(HelixRemoveEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
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

/**
 * The board's view changed, however it changed: a drag, the wheel, a press on
 * a control, a card brought into view, or the board fitting itself.
 *
 * **One event for all of them**, because what a consumer keeping a minimap or a
 * saved position in step needs is where the board is now, not which of six
 * gestures put it there; `helix-canvas-pan` and `helix-canvas-zoom` still say
 * which control was pressed. Sent for every step of a drag, the way `input` is.
 */
export class HelixCanvasViewEvent extends CustomEvent<CanvasView> {
  static readonly eventName = 'helix-canvas-view'

  constructor(detail: CanvasView) {
    super(HelixCanvasViewEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/** What `ViewportPanDetail` was called when only Map had one. */
export type MapPanDetail = ViewportPanDetail

/** What `ViewportZoomDetail` was called when only Map had one. */
export type MapZoomDetail = ViewportZoomDetail

/** Detail carried by `helix-navigate`. */
export interface NavigateDetail {
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
   * one, which is `helix-toggle`'s rule and for the same reason: `"false"` is
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
 * A stop asking the tour to move.
 *
 * Composed and bubbling, because a stop is slotted into the root and the root
 * has to hear it across that boundary.
 *
 * **A class rather than a hand-rolled `CustomEvent`.** A dispatch is matched as
 * `new HelixSomethingEvent(`, so a raw `CustomEvent` is not held to being
 * declared and nothing carries it into the manifest: consumers can hear it and
 * cannot find it.
 */
export class HelixTourAskEvent extends CustomEvent<TourAskDetail> {
  static readonly eventName = 'helix-tour-ask'

  constructor(detail: TourAskDetail) {
    super(HelixTourAskEvent.eventName, {
      bubbles: true,
      /* Not cancelable. The name says *ask*, so refusing it looks like it should
         hold the tour, and honoring it here could not work: the root registers
         its listener in `connectedCallback` and a consumer registers later, so on
         a bubbling event both are on the same target and the root's runs first,
         reading `defaultPrevented` before the consumer has had a chance to set
         it. `helix-shortcut` gets this right by reading the flag on the element
         that dispatched, where every listener has already run.

         **The veto exists and is elsewhere.** Moving between stops goes through
         `requestChange` and announces `helix-before-activate`; leaving early
         dispatches `helix-before-close` and reads the flag before writing
         `open`. This event is the stop telling the root a button was pressed,
         and the decision is taken one step later. */
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/**
 * The eyedropper opening, and closing again.
 *
 * Two events rather than one carrying a flag, because what a consumer does with
 * them is not symmetrical: the surface holding the picker has to get out of the
 * way for the sample and come back afterwards, and those are two moments with
 * different work in each.
 *
 * **A class rather than a bare `Event`.** The check that holds an event to being
 * declared reads `new Event(` as well as `new HelixSomethingEvent(`, so a
 * hand-rolled one is public API a consumer can hear and cannot find.
 *
 * No detail, because there is nothing to say beyond that it happened.
 */
export class HelixSampleStartEvent extends Event {
  static readonly eventName = 'helix-sample-start'

  constructor() {
    super(HelixSampleStartEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}

/** The eyedropper closing, whether or not a color was taken. */
export class HelixSampleEndEvent extends Event {
  static readonly eventName = 'helix-sample-end'

  constructor() {
    super(HelixSampleEndEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}

/**
 * Fired when an element asks to be taken away.
 *
 * A request rather than a notification: the element does not remove itself,
 * because the consumer owns the markup it is in and removing the node under
 * them would put their state and the document out of step. Cancelable, so
 * `preventDefault()` is a refusal.
 *
 * One verb for both shapes. A tag leaving a list and an announcement closing
 * itself are the same act from the element's side.
 */
export class HelixDismissEvent extends CustomEvent<DismissDetail> {
  static readonly eventName = 'helix-dismiss'

  constructor(detail: DismissDetail) {
    super(HelixDismissEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
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
 * no error. That is why checkedness has `helix-toggle` and its own boolean, and
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

/**
 * A set is about to make a different child current, and can be refused.
 *
 * **Not a generic `helix-change`.** `Tabs` moving to another tab, `Tree` marking
 * another row and `Steps` advancing are not a value changing, they are a set
 * choosing, and the platform's word for a committed value would say the wrong
 * thing. `active` names which child is current, so `activate` is the verb, and
 * unlike `change` the platform has no claim on it.
 *
 * **This fires before the state moves.** Inside a handler `currentTarget.active`
 * still holds the previous value, and `detail.value` is a proposal another
 * listener may refuse, so a consumer who only wants to know which child is
 * current listens for `helix-activate` instead. `helix-select` is not that
 * notification either: it fires when an item is *chosen*, not when `active` is
 * assigned.
 *
 * The shape is the one `MixinControllerOpen` already has, a cancelable request
 * and a plain notification after the state has moved.
 */
export class HelixBeforeActivateEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-activate'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeActivateEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * A set has made a different child current.
 *
 * The notification half of `helix-before-activate`, dispatched after the state
 * has moved, so `currentTarget.active` is the new value and the detail is a fact
 * rather than a proposal.
 *
 * **Not cancelable**, for the reason every notification here is not: the
 * decision was taken by the event before it, and a second refusable event for
 * one transition is two answers to one question.
 *
 * **Prefixed, and it has to be.** `activate` unprefixed is not in any
 * `*EventMap` in the DOM library, checked rather than assumed, but the prefix is
 * what stops an event dispatched inside a shadow root and retargeted to the host
 * being mistaken for something the host's own contents sent.
 */
export class HelixActivateEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-activate'

  constructor(detail: ChangeDetail) {
    super(HelixActivateEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/**
 * The reader asked the map to move, which is as far as this library goes.
 *
 * **Helix draws no map and moves nobody's.** A tile renderer is a library and
 * the frame around it is what this adds, so panning is a request the consumer
 * answers against whatever they slotted: MapLibre, Leaflet, Google, or their
 * own. The direction is in reading order rather than compass order, because the
 * control that sent it is a button a reader pressed and `start` on a
 * right-to-left page is east.
 *
 * Not cancelable. Nothing here moves on its own, and an event whose
 * `preventDefault` means nothing is an event that lies about what it offers.
 */
export class HelixMapPanEvent extends CustomEvent<ViewportPanDetail> {
  static readonly eventName = 'helix-map-pan'

  constructor(detail: MapPanDetail) {
    super(HelixMapPanEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/**
 * The reader asked the map to zoom, and for the same reason it is a request.
 *
 * `by` is a direction rather than a level: a scale a consumer's map understands
 * is the consumer's to decide, and a frame that said "go to zoom 14" would be
 * asserting a numbering that Leaflet, MapLibre and a static tile server do not
 * agree on.
 */
export class HelixMapZoomEvent extends CustomEvent<ViewportZoomDetail> {
  static readonly eventName = 'helix-map-zoom'

  constructor(detail: MapZoomDetail) {
    super(HelixMapZoomEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/**
 * The reader asked the graph to move. A request, as a map's is: Helix draws no
 * graph, and the renderer the page slotted, or `connectGraph`, answers it.
 */
export class HelixGraphPanEvent extends CustomEvent<ViewportPanDetail> {
  static readonly eventName = 'helix-graph-pan'

  constructor(detail: ViewportPanDetail) {
    super(HelixGraphPanEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/** The reader asked the graph to zoom, a direction and not a level, as a map's is. */
export class HelixGraphZoomEvent extends CustomEvent<ViewportZoomDetail> {
  static readonly eventName = 'helix-graph-zoom'

  constructor(detail: ViewportZoomDetail) {
    super(HelixGraphZoomEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/** Where each note was laid out, by its `id`, in the renderer's own units. */
export interface GraphLayoutDetail {
  positions: Record<string, { x: number; y: number }>
}

/**
 * A layout settled, with where it put every note. Keep the positions and hand
 * them back as each note's `x` and `y`, and the graph opens where the reader
 * left it, with no layout to run.
 */
export class HelixGraphLayoutEvent extends CustomEvent<GraphLayoutDetail> {
  static readonly eventName = 'helix-graph-layout'

  constructor(detail: GraphLayoutDetail) {
    super(HelixGraphLayoutEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
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

/**
 * The frame's notes, links, selection, depth or gestures changed, which the
 * connector hears and the renderer is told. It stays on the frame, being the
 * family's own bookkeeping rather than news for a page.
 */
export class HelixGraphPartChangeEvent extends CustomEvent<GraphPartChangeDetail> {
  static readonly eventName = 'helix-graph-part-change'

  constructor(detail: GraphPartChangeDetail) {
    super(HelixGraphPartChangeEvent.eventName, {
      bubbles: false,
      cancelable: false,
      composed: false,
      detail,
    })
  }
}

/** One signal between two notes, as the frame's `signal()` sends it. */
export interface GraphSignalDetail {
  /** The note the signal leaves, by its `id`. */
  from: string
  /** What the signal means, which colors it. `primary` where none is given. */
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning' | undefined
  /** The note the signal reaches, by its `id`. */
  to: string
}

/**
 * Something passed between two notes, which the renderer draws traveling
 * from one to the other. The connector hears it and the renderer draws it; it
 * stays on the frame, being the family's own bookkeeping rather than news for
 * a page.
 */
export class HelixGraphSignalEvent extends CustomEvent<GraphSignalDetail> {
  static readonly eventName = 'helix-graph-signal'

  constructor(detail: GraphSignalDetail) {
    super(HelixGraphSignalEvent.eventName, {
      bubbles: false,
      cancelable: false,
      composed: false,
      detail,
    })
  }
}

/**
 * The graph has been drawn whole, laid out and settled, sent once each time it
 * is connected, from the frame, which then matches `:state(ready)`.
 */
export class HelixGraphReadyEvent extends Event {
  static readonly eventName = 'helix-graph-ready'

  constructor() {
    super(HelixGraphReadyEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
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

/**
 * The user asked the map to rotate, from a rotate button or key. Turn your map
 * in response. Not cancelable, because the frame moves nothing itself.
 */
export class HelixMapRotateEvent extends CustomEvent<MapRotateDetail> {
  static readonly eventName = 'helix-map-rotate'

  constructor(detail: MapRotateDetail) {
    super(HelixMapRotateEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/**
 * The user asked the map to tilt, from a tilt button or key. Tilt your map in
 * response. Not cancelable, because the frame moves nothing itself.
 */
export class HelixMapTiltEvent extends CustomEvent<MapTiltDetail> {
  static readonly eventName = 'helix-map-tilt'

  constructor(detail: MapTiltDetail) {
    super(HelixMapTiltEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
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

/**
 * A marker, a position, a route or an area changed what it says: where it is,
 * its points, its progress, its name.
 *
 * **Said rather than reflected.** The connector and the frame follow the
 * parts, and heard them through their attributes until the parts reflected
 * nothing CSS selects on: a live position's coordinates are state, and a
 * route's points are a payload, neither of which belongs in the markup. It
 * bubbles to the frame, whose light-DOM children the parts are, and goes no
 * further, being the family's own bookkeeping rather than news for a page.
 */
export class HelixMapPartChangeEvent extends CustomEvent<MapPartChangeDetail> {
  static readonly eventName = 'helix-map-part-change'

  constructor(detail: MapPartChangeDetail) {
    super(HelixMapPartChangeEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: false,
      detail,
    })
  }
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

/**
 * A reader pressed a cluster, one marker standing for several that would have
 * drawn over each other.
 *
 * **Opened by zooming in**, which the connector does, framing the places the
 * cluster holds, as pressing one does on every map a reader has used. Told
 * rather than asked: a page that lists them in a panel instead connects with
 * `clusterZoom: false`. Sent from the marker the cluster is drawn as, and
 * bubbles through the frame to the page.
 */
export class HelixMapClusterEvent extends CustomEvent<MapClusterDetail> {
  static readonly eventName = 'helix-map-cluster'

  constructor(detail: MapClusterDetail) {
    super(HelixMapClusterEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: false,
      detail,
    })
  }
}

/**
 * The map has been drawn whole: its style, every tile the view needs, and the
 * ground raised where it has terrain. Sent once each time a map is connected,
 * from the frame, which then matches `:state(ready)`.
 *
 * **What a page waits on to show a map that is finished**, where it would
 * otherwise watch it draw in stages: the streets, then the imagery tile by
 * tile, then the ground rising under the markers about half a second in. The
 * shapes the frame draws are left out of "whole", since a route that animates
 * is redrawn every frame and would never count as drawn.
 */
export class HelixMapReadyEvent extends Event {
  static readonly eventName = 'helix-map-ready'

  constructor() {
    super(HelixMapReadyEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}

/** A message is about to be pinned or unpinned, and can be refused. */
export class HelixBeforePinEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-pin'

  constructor(detail: ChangeDetail) {
    super(HelixBeforePinEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/** A divider is about to move, and can be refused. */
export class HelixBeforeResizeEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-resize'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeResizeEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * The divider between a sandbox's panes is about to move, and can be refused.
 *
 * Its own verb rather than a `helix-before-resize` carrying which divider moved:
 * a sandbox has two, and they were told apart by a field on a detail every other
 * request in this file also carries.
 */
export class HelixBeforeSplitEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-split'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeSplitEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * A sandbox's panel is about to change height, and can be refused.
 *
 * The sibling of `helix-before-split`, and named for the divider rather than for
 * the axis because a reader binding one of the two is choosing which divider they
 * care about. `value` is pixels here and a percentage there, which is what each
 * property already publishes.
 */
export class HelixBeforePanelResizeEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-panel-resize'

  constructor(detail: ChangeDetail) {
    super(HelixBeforePanelResizeEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/** A pane is about to collapse or reopen, and can be refused. */
export class HelixBeforeCollapseEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-collapse'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeCollapseEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/** Source is about to be edited, and can be refused. */
export class HelixBeforeEditEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-edit'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeEditEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * A value is about to change, and the change can be refused.
 *
 * **The request half of every value control.** It announces the value being
 * *proposed*, before anything moves, so a listener calling `preventDefault()`
 * refuses it and the control stays where it was. That is how a consumer takes
 * one decision without declaring a mode, which is what 294 settled: the element
 * always owns and applies its state, and refusing is the way to take it over.
 *
 * **The notification is native and separate.** Once this has gone out and the
 * value has moved, the control announces it again under the platform's own
 * name, `input` while a reader is editing and `change` when they are done, so
 * `onChange` in React and `onchange=` in HTML both reach it and
 * `currentTarget.value` is correct by the time a handler reads it. This event
 * carries the detail because at the moment it fires the value is not on the
 * element yet.
 *
 * **`announcesInput` picks which native notification fires, not which name this
 * carries.** Granularity is the platform's own distinction, `input` against
 * `change`; the request is always this one event.
 */
export class HelixBeforeChangeEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-change'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeChangeEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * A checked state is about to change, and the change can be refused.
 *
 * **Its own event rather than a `helix-before-change` carrying a boolean.**
 * Through the value event the state arrives as `String(checked)`, so a consumer
 * receives the string `"false"`, which is truthy, and a test asserting the value
 * passes on that bug. A control whose state is a boolean wants an event with a
 * typed boolean in it.
 *
 * The notification is native, as it is for a value: the control relays `change`
 * from the inner input and announces `input` beside it, so `onChange` reads
 * `currentTarget.checked` and gets a boolean from the platform.
 *
 * It also ends a collision: Checkbox Group listened for its boxes' change and
 * dispatched its own under the same name from the same host, so it needed
 * `stopImmediatePropagation` to keep a consumer from receiving one box's boolean
 * alongside the whole set. Two names, two facts.
 */
export class HelixBeforeToggleEvent extends CustomEvent<ToggleDetail> {
  static readonly eventName = 'helix-before-toggle'

  constructor(detail: ToggleDetail) {
    super(HelixBeforeToggleEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/** Detail carried by `helix-scrolled`. */
export interface ScrolledDetail {
  /**
   * Whether the page is scrolled away from the top, as a boolean and not a word
   * that reads like one. Follows `helix-toggle`'s rule for the same reason.
   */
  scrolled: boolean
}

/** Detail carried by `helix-toggle`. */
export interface ToggleDetail {
  /** The state being asked for, as a boolean and not a word that reads like one. */
  checked: boolean
}

/** Detail carried by `helix-create`. */
export interface CreateDetail {
  /** What the reader typed, which is being offered as a new answer. */
  value: string
}

/**
 * The reader asked for something the list does not hold.
 *
 * Cancelable, and announced before anything is applied, because the options are
 * the consumer's own light DOM and no component here writes into it. What the
 * control can do is say what was asked for and take the value; putting an
 * option in the list, or a row in a database, is the consumer's, and a consumer
 * who validates first refuses this and adds nothing.
 *
 * The detail carries the text as typed, not a slug of it. Trimming or lowering
 * it here would be this element deciding what a name means, and a consumer who
 * wants an identifier can make one from what they were given.
 */
export class HelixCreateEvent extends CustomEvent<CreateDetail> {
  static readonly eventName = 'helix-create'

  constructor(detail: CreateDetail) {
    super(HelixCreateEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/** Detail carried by `helix-copy`. */
export interface CopyDetail {
  /** What was put on the clipboard. */
  value: string
}

/**
 * Something was copied to the clipboard.
 *
 * Not cancelable, and deliberately: it is announced after the write, because a
 * clipboard write is a permission the platform may refuse and there is nothing
 * useful to report until it has either happened or not.
 */
export class HelixCopyEvent extends CustomEvent<CopyDetail> {
  static readonly eventName = 'helix-copy'

  constructor(detail: CopyDetail) {
    super(HelixCopyEvent.eventName, {
      bubbles: true,
      composed: true,
      detail,
    })
  }
}

/** Detail carried by `helix-console`. */
export interface ConsoleDetail {
  /** How the message was logged. */
  level: 'log' | 'info' | 'warn' | 'error'

  /** The message, already flattened to text. */
  text: string
}

/**
 * Fired when something being previewed writes to the console.
 *
 * Carries text rather than the logged values. The preview is a separate
 * document, so what arrives has crossed `postMessage` and been through
 * structured clone: a DOM node or a function does not survive that, and half a
 * value is worse than a string of it.
 */
export class HelixConsoleEvent extends CustomEvent<ConsoleDetail> {
  static readonly eventName = 'helix-console'

  constructor(detail: ConsoleDetail) {
    super(HelixConsoleEvent.eventName, {
      bubbles: true,
      /* Not cancelable, for the reason `helix-resize` is not: a log line the
         frame already wrote is a fact being relayed rather than a proposal, and
         nothing reads the result. */
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/** Detail carried by `helix-resize`. */
export interface ResizeDetail {
  /** How tall the content is, in CSS pixels. */
  size: number
}

/**
 * Fired when something reports how much room its content actually needs.
 *
 * **A measurement crossing a boundary the measurer is on the far side of.** A
 * sandboxed preview is its own document: nothing outside it can read the height
 * of what it drew, because the frame is opaque and a box sized from the outside
 * only ever reports the box. So the document measures itself and says so, and
 * this is what it says it with.
 *
 * A number rather than a box, because the width is the container's to decide and
 * only the block size follows the content. A consumer that wants to act on it
 * clamps it: what arrives is what was drawn, which for an empty example is
 * nearly nothing and for a long one is more than a page.
 */

export class HelixResizeEvent extends CustomEvent<ResizeDetail> {
  static readonly eventName = 'helix-resize'

  constructor(detail: ResizeDetail) {
    super(HelixResizeEvent.eventName, {
      bubbles: true,
      /* Not cancelable. A measurement is not a proposal: the content is that
         tall whether or not anybody wants it to be, and neither dispatcher,
         `Heatmap` nor `Sandbox.Preview`, reads the result. Accepting
         `preventDefault()` and ignoring it is worse than refusing the call, a
         consumer having every reason to believe they had stopped something. */
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/**
 * Fired when a header crosses the threshold between resting at the top of the
 * page and floating over it.
 *
 * **The threshold lives in a custom state, and is announced rather than
 * reflected.** A `data-scrolled` on the host is an attribute nobody rendered: a
 * server sends the element without it and the element adds it on upgrade, so a
 * framework hydrating the page finds markup that no longer matches what it sent.
 * A custom state is deliberately not in the DOM and therefore not something a
 * hydration pass can disagree with.
 *
 * That closes the observability an attribute would accidentally provide. A
 * `MutationObserver` can watch an attribute and there is no equivalent for
 * `ElementInternals.states`, so a component holding a boolean nothing can read
 * is a component with a private opinion its consumers demonstrably need: the
 * bar's own backdrop is drawn by the page around it, and the page has to know
 * when to light it.
 *
 * Not cancelable. It reports where the page is rather than asking permission to
 * be there, and refusing it would leave the state and the announcement
 * disagreeing.
 *
 * The hysteresis stays inside the header, which is the point of announcing at
 * all: a consumer listening to `scroll` itself would be a second opinion on
 * when the page counts as scrolled, and the two would part company at the eight
 * pixels of travel this waits for.
 */
export class HelixScrolledEvent extends CustomEvent<ScrolledDetail> {
  static readonly eventName = 'helix-scrolled'

  constructor(detail: ScrolledDetail) {
    super(HelixScrolledEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/** Detail carried by `helix-caret`. */
export interface CaretDetail {
  /** One-based column, counted in characters from the start of the line. */
  column: number

  /** One-based line. */
  line: number
}

/**
 * Fired when the cursor moves in a text editor.
 *
 * Not cancelable, unlike everything else here. The others announce something
 * about to happen and a listener can refuse it; this one reports where the
 * caret already is, and there is nothing left to refuse.
 *
 * It fires on every keystroke and every arrow press, which is why the status
 * bar reads it from the DOM rather than through a framework's state: routing a
 * caret position through React would re-render the workbench on every cursor
 * move.
 */
export class HelixCaretEvent extends CustomEvent<CaretDetail> {
  static readonly eventName = 'helix-caret'

  constructor(detail: CaretDetail) {
    super(HelixCaretEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
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
  /** Value of the item the reader chose. */
  value: string
}

/**
 * Fired when a component moves the view it is showing, rather than its value.
 *
 * A calendar paging to another month is not choosing a date, and the two have
 * to be separable: a consumer driving the view needs to hear that it moved
 * without being told the answer changed. `helix-change` belongs to the value,
 * and giving it both jobs would make either one unusable on its own.
 */
export class HelixNavigateEvent extends CustomEvent<NavigateDetail> {
  static readonly eventName = 'helix-navigate'

  constructor(detail: NavigateDetail) {
    super(HelixNavigateEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/** Detail carried by `helix-complete`. */
export interface CompleteDetail {
  /** What the control now holds, in full. */
  value: string
}

/**
 * Fired when a control that fills up has filled.
 *
 * The moment a code entry exists for: a six-character field is worth submitting
 * the instant the sixth character lands, and a consumer watching `helix-change`
 * has to know the length and compare it on every keystroke to find that moment
 * themselves.
 *
 * Separate from `helix-change` rather than a flag on it, because they are
 * answered by different code: one keeps a value in step and the other decides
 * whether to send a form. A listener that only cares about the second says so by
 * which event it listens for.
 *
 * `complete` is free as a verb. React's synthetic system claims `change`,
 * `input`, `submit`, `reset`, `copy`, `paste`, `scroll`, `drag`, `focus` and
 * `blur`, measured, and this is none of them.
 *
 * Not cancelable. It reports that something already happened, which is the same
 * reason `helix-caret` is not: there is nothing left to refuse once the last
 * character is in the box.
 */
export class HelixCompleteEvent extends CustomEvent<CompleteDetail> {
  static readonly eventName = 'helix-complete'

  constructor(detail: CompleteDetail) {
    super(HelixCompleteEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/**
 * Fired when the reader offers something they wrote.
 *
 * **Cancelable, and the composer clears only when nobody refused.** Sending is a
 * round trip: a composer that empties itself and then hears the request failed
 * has thrown away the only copy of what the reader typed, and a reader who has
 * just written three paragraphs is exactly who cannot afford that. Refusing
 * leaves the text where it is.
 *
 * Not `helix-create`, which is the combobox's event for a value a list does not
 * hold, and not `helix-change`, because nothing about a value changed: the
 * reader finished something and handed it over.
 */
export class HelixSendEvent extends CustomEvent<SendDetail> {
  static readonly eventName = 'helix-send'

  constructor(detail: SendDetail) {
    super(HelixSendEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * Fired when something a user comes back to is marked read, or unread.
 *
 * **Read state is reported rather than owned.** Marking a notification read is
 * usually a round trip, and a component that flips the state itself and then
 * hears the request failed has already told the reader something untrue. So this
 * is cancelable, and refusing it leaves the item alone; the component applies
 * it once nobody has refused, which is the same contract every other axis in
 * the library uses.
 *
 * Bubbles and is composed, so a feed hears its own items: one handler on the
 * list serves every notification in it, which is what a consumer syncing to a
 * server actually wants.
 */
export class HelixReadEvent extends CustomEvent<ReadDetail> {
  static readonly eventName = 'helix-read'

  constructor(detail: ReadDetail) {
    super(HelixReadEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * Fired when the reader asks for a different order.
 *
 * Cancelable, and refusing it leaves the order alone, which is what makes a
 * server-side sort expressible: the consumer refuses the local reorder, fetches,
 * and hands back a new set. This is the element reporting that a heading was
 * clicked, before it acts on it.
 *
 * Not `helix-change`: nothing about the data changed, only the order it is read
 * in, and a consumer listening for changes to a value should not hear a sort.
 * That is the same distinction `helix-filter` is drawn on.
 */
export class HelixSortEvent extends CustomEvent<SortDetail> {
  static readonly eventName = 'helix-sort'

  constructor(detail: SortDetail) {
    super(HelixSortEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * Fired when the reader changes which values a field is filtered by.
 *
 * **Not `helix-filter`, which is a different thing already taken.** That one
 * says a list narrowed itself to a string, and `Data Table` and `Listbox` both
 * dispatch it with exactly that meaning. This one carries a structured filter:
 * a field, a comparison and a set of values, which is a shape neither of those
 * has and neither should grow.
 *
 * Cancelable, and refusing it is how a consumer takes the decision for one
 * interaction, the way `requestChange` documents for every stateful change here.
 */
export class HelixFacetEvent extends CustomEvent<FacetDetail> {
  static readonly eventName = 'helix-facet'

  constructor(detail: FacetDetail) {
    super(HelixFacetEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * Fired when a component narrows what it is showing.
 *
 * Filtering hides rather than removes, so nothing about the value changes and
 * `helix-change` would be a lie. What a consumer wants to know is that the list
 * in front of the reader is no longer the whole list.
 */
export class HelixFilterEvent extends CustomEvent<FilterDetail> {
  static readonly eventName = 'helix-filter'

  constructor(detail: FilterDetail) {
    super(HelixFilterEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
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

/**
 * Fired when a shortcut's chord is pressed.
 *
 * Cancelable, and the key event is only consumed where this is not refused: a
 * consumer that decides the moment is wrong, a dialog is over the control or
 * the reader is mid-composition, calls `preventDefault()` and the keystroke
 * goes on to whatever would have had it.
 */
export class HelixShortcutEvent extends CustomEvent<ShortcutDetail> {
  static readonly eventName = 'helix-shortcut'

  constructor(detail: ShortcutDetail) {
    super(HelixShortcutEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * Fired when the reader selects an item in a set.
 *
 * Bubbles and is composed, because this is how a set coordinates: a tree, a
 * tab list and a toggle group all learn which of their children was chosen by
 * hearing it arrive.
 */
export class HelixSelectEvent extends CustomEvent<SelectDetail> {
  static readonly eventName = 'helix-select'

  constructor(detail: SelectDetail) {
    super(HelixSelectEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * Fired when the reader asks for the columns in a different order.
 *
 * Cancelable, and refusing it leaves the columns where they were, so a consumer
 * who stores the order, in a URL or a preference, can take the decision the way
 * a server-side sort takes `helix-sort`. The detail is the whole order as
 * space-separated fields rather than one move, because the order is the fact a
 * consumer stores, and a move is only meaningful against an order they would
 * then have to keep in step.
 *
 * Not `helix-sort`: that reorders the rows, this reorders the columns, and a
 * consumer listening for one should not hear the other.
 */
export class HelixReorderEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-reorder'

  constructor(detail: ChangeDetail) {
    super(HelixReorderEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * Fired when a reader reaches the oldest turn a transcript holds, while there are
 * older ones to fetch.
 *
 * **A report of where the reader is, not a request to be granted**, so it is not
 * cancelable: there is nothing for the transcript to do if nobody refuses, and
 * nothing to stop if somebody does. The consumer answers by fetching, and says
 * so through the transcript's `history` while the older turns are on their way.
 *
 * No detail. The consumer holds the transcript and knows its oldest turn, which
 * is the one thing a fetch needs.
 */
export class HelixHistoryEvent extends CustomEvent<Record<string, never>> {
  static readonly eventName = 'helix-history'

  constructor() {
    super(HelixHistoryEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: {},
    })
  }
}

/**
 * Every event this file publishes, and the one place a new one is added.
 *
 * The map below is derived from this rather than written beside it, so a class
 * that is in here is typed and one that is not is absent from both halves at
 * once. Kept by hand the two drifted, and nothing failed when they did: a
 * consumer writing `addEventListener('helix-navigate', …)` got `Event` and had
 * to reach into `detail` through a cast. The build fails on an exported event
 * class left out of this object, which is the only step left that can be
 * forgotten.
 */
const registry = {
  HelixActivateEvent,
  HelixBeforeActivateEvent,
  HelixBeforeChangeEvent,
  HelixBeforeCloseEvent,
  HelixBeforeCollapseEvent,
  HelixBeforeEditEvent,
  HelixBeforeMoveEvent,
  HelixBeforeOpenEvent,
  HelixBeforePanelResizeEvent,
  HelixBeforePinEvent,
  HelixBeforeReconnectEvent,
  HelixBeforeRelabelEvent,
  HelixBeforeResizeEvent,
  HelixBeforeSplitEvent,
  HelixBeforeToggleEvent,
  HelixCanvasEditEvent,
  HelixCanvasPanEvent,
  HelixCanvasViewEvent,
  HelixCanvasZoomEvent,
  HelixCaretEvent,
  HelixCompleteEvent,
  HelixConnectEvent,
  HelixConsoleEvent,
  HelixCopyEvent,
  HelixCreateEvent,
  HelixDismissEvent,
  HelixFacetEvent,
  HelixFilterEvent,
  HelixGraphLayoutEvent,
  HelixGraphPanEvent,
  HelixGraphPartChangeEvent,
  HelixGraphReadyEvent,
  HelixGraphSignalEvent,
  HelixGraphZoomEvent,
  HelixHistoryEvent,
  HelixMapClusterEvent,
  HelixMapPanEvent,
  HelixMapPartChangeEvent,
  HelixMapReadyEvent,
  HelixMapRotateEvent,
  HelixMapTiltEvent,
  HelixMapZoomEvent,
  HelixMoveEvent,
  HelixNavigateEvent,
  HelixNextEvent,
  HelixPreviousEvent,
  HelixReadEvent,
  HelixReconnectEvent,
  HelixRelabelEvent,
  HelixRemoveEvent,
  HelixReorderEvent,
  HelixResizeEvent,
  HelixSampleEndEvent,
  HelixSampleStartEvent,
  HelixScrolledEvent,
  HelixSelectEvent,
  HelixSendEvent,
  HelixShortcutEvent,
  HelixSortEvent,
  HelixTourAskEvent,
} as const

/**
 * Every name this library dispatches.
 *
 * Exported so a runtime check can ask whether a name is one of ours without
 * keeping a second list of them. `HelixElement` uses it to tell a consumer that
 * the handler prop they wrote is attached to nothing.
 */
export const helixEventNames: ReadonlySet<string> = new Set(
  Object.values(registry).map((event) => event.eventName),
)

type Registry = typeof registry

/**
 * The registry keyed by what each class dispatches as.
 *
 * `eventName` is `static readonly` with no annotation, so TypeScript infers the
 * string literal and it can be used as a key. That is also what makes the name
 * on the class the single source of it: the map key, the dispatch and the
 * listener all read the same declaration.
 */
type HelixEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends HelixEventMap {}
}
