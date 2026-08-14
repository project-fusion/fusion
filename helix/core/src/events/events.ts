/**
 * Event classes, one per event a Helix component dispatches.
 *
 * A named class rather than `dispatchEvent(new CustomEvent(name, …))` for three
 * reasons, all of them about the type reaching a consumer:
 *
 * 1. `@event {HelixOpenEvent} helix-open` puts the class name in the manifest,
 *    which is what lets the React generator emit a typed callback instead of
 *    `(detail: unknown)`.
 * 2. The augmentation of `HTMLElementEventMap` below types `addEventListener`
 *    for consumers writing plain HTML, who never see the React wrappers.
 * 3. The event name lives on the class as `eventName`, so a listener and a
 *    dispatch cannot disagree about the string.
 */

/**
 * Names are `helix-{verb}`, lowercase and prefixed.
 *
 * The prefix is what stops a collision with a native name: an event dispatched
 * inside a shadow root is retargeted to look like it came from the host, so a
 * bare `input` from a `<helix-input>` is indistinguishable from the inner
 * control's own. Prefixed, it cannot be mistaken for either.
 *
 * The name also decides the framework prop, because the manifest derives one
 * from the other by stripping `helix-` and camel-casing: `helix-open` is
 * `onOpen`. Two consequences:
 *
 * 1. **A verb React has claimed cannot be used.** React's synthetic system owns
 *    `change`, `input`, `submit`, `reset`, `copy`, `paste`, `scroll`, `drag`,
 *    `focus` and `blur` on custom elements: a `helix-change` would strip to
 *    `onChange`, which React has already wired to the native `change`, so ours
 *    would never fire. That is why a value change is `helix-value-change`.
 * 2. **The rest are free.** `open`, `close`, `toggle`, `select`, `dismiss`,
 *    `navigate` and `remove` are all unclaimed on a custom element, which is
 *    what lets the verb-only form work everywhere else.
 *
 * Propagation follows the event's role rather than a single house rule:
 *
 * - **Lifecycle** (`helix-open`, `helix-close`) does not bubble and is not
 *   composed. Overlays nest, and an inner one's lifecycle must never reach the
 *   outer one that contains it.
 * - **Coordination** (`helix-select`, `helix-dismiss`, `helix-value-change`)
 *   bubbles and is composed, so a parent or a router can intercept it across a
 *   shadow boundary.
 */

/** Detail carried by `helix-open` and `helix-close`. */
export interface OpenDetail {
  /** The state the element is moving to. */
  open: boolean
}

/**
 * Fired when an element is about to open.
 *
 * Cancelable: `preventDefault()` refuses the change, and the element stays
 * closed. Paired with `helix-close` rather than being one event carrying a
 * boolean, so a listener that only cares about one direction says so by which
 * event it listens for.
 *
 * Neither bubbles nor composed. A dialog inside a drawer inside a popover is
 * three overlays, and an inner one opening must not read as the outer one
 * opening.
 */
export class HelixOpenEvent extends CustomEvent<OpenDetail> {
  static readonly eventName = 'helix-open'

  constructor() {
    super(HelixOpenEvent.eventName, {
      bubbles: false,
      cancelable: true,
      composed: false,
      detail: { open: true },
    })
  }
}

/** Fired when an element is about to close. See `HelixOpenEvent`. */
export class HelixCloseEvent extends CustomEvent<OpenDetail> {
  static readonly eventName = 'helix-close'

  constructor() {
    super(HelixCloseEvent.eventName, {
      bubbles: false,
      cancelable: true,
      composed: false,
      detail: { open: false },
    })
  }
}

/** Detail carried by `helix-dismiss`. */
export interface DismissDetail {
  /** Text content of the element asking to go, for identifying which it was. */
  label: string
}

/**
 * Fired when an element asks to be taken away.
 *
 * A request rather than a notification: the element does not remove itself,
 * because the consumer owns the markup it is in and removing the node under
 * them would put their state and the document out of step. Cancelable, so
 * `preventDefault()` is a refusal.
 *
 * One verb for both shapes. A tag leaving a list and a banner closing itself
 * are the same act from the element's side.
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

/** Detail carried by `helix-value-change`. */
export interface ValueChangeDetail {
  /**
   * Which value changed, so one listener can serve several fields.
   *
   * A sandbox with a markup pane and a stylesheet pane emits the same event
   * from both; without a name the parent would have to identify the sender by
   * reference, which couples it to how the panes were arranged.
   */
  name: string
  /** The value after the change. */
  value: string
}

/**
 * Fired when a value changes on something that is not a native input.
 *
 * `helix-value-change` rather than `helix-change`, because the manifest strips
 * the prefix and React has already claimed `onChange` for the native `change`
 * event: a prop by that name would be bound to React's own plumbing and ours
 * would never arrive. A real input relays its native `change` instead.
 */
export class HelixValueChangeEvent extends CustomEvent<ValueChangeDetail> {
  static readonly eventName = 'helix-value-change'

  constructor(detail: ValueChangeDetail) {
    super(HelixValueChangeEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/** Detail carried by `helix-select`. */
export interface SelectDetail {
  /** Value of the item the reader chose. */
  value: string
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

declare global {
  interface HTMLElementEventMap {
    'helix-close': HelixCloseEvent
    'helix-open': HelixOpenEvent
    'helix-dismiss': HelixDismissEvent
    'helix-select': HelixSelectEvent
    'helix-value-change': HelixValueChangeEvent
  }
}
