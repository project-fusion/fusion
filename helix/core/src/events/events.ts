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
 *    would never fire. That is why a value change is `helix-change`.
 * 2. **The rest are free.** `open`, `close`, `toggle`, `select`, `dismiss`,
 *    `navigate` and `remove` are all unclaimed on a custom element, which is
 *    what lets the verb-only form work everywhere else.
 *
 * Propagation follows the event's role rather than a single house rule:
 *
 * - **Lifecycle** (`helix-open`, `helix-close`) does not bubble and is not
 *   composed. Overlays nest, and an inner one's lifecycle must never reach the
 *   outer one that contains it.
 * - **Coordination** (`helix-select`, `helix-dismiss`, `helix-change`)
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

/** Detail carried by `helix-change`. */
export interface ChangeDetail {
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
 * One hyphen, which is the limit of what React binds on a custom element.
 * `onhelix-change` reaches this; `onhelix-value-change`, which this was called,
 * reached nothing, because React stops at one hyphen and binds no event whose
 * name carries two.
 *
 * The prefix is what keeps it clear of the native `change`. A consumer writes
 * `onhelix-change` for this and `onChange` for a real input's own, and the two
 * cannot be confused for each other. A control wrapping a native input relays
 * that input's `change` under its own name as well.
 */
export class HelixChangeEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-change'

  constructor(detail: ChangeDetail) {
    super(HelixChangeEvent.eventName, {
      bubbles: true,
      cancelable: true,
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
      cancelable: true,
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
    'helix-caret': HelixCaretEvent
    'helix-change': HelixChangeEvent
    'helix-close': HelixCloseEvent
    'helix-complete': HelixCompleteEvent
    'helix-console': HelixConsoleEvent
    'helix-dismiss': HelixDismissEvent
    /* Both of these were declared as classes, dispatched by the calendar, the
       listbox and now the pagination, and left out of here, so the one thing
       this augmentation exists to do was not done for them: a consumer writing
       `addEventListener('helix-navigate', …)` got `Event` and had to reach into
       `detail` through a cast. Nothing fails when an entry is missing, which is
       why two of the nine went missing. */
    'helix-filter': HelixFilterEvent
    'helix-navigate': HelixNavigateEvent
    'helix-open': HelixOpenEvent
    'helix-select': HelixSelectEvent
  }
}
