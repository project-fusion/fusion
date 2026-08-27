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
 * **A class rather than the raw `CustomEvent` this was.** It dispatched, it
 * bubbled, and it was invisible: `check:events` matches `new HelixSomethingEvent(`,
 * so a hand-rolled `CustomEvent` was not held to being declared, and nothing
 * carried it into the manifest. Consumers could hear it and could not find it,
 * which is the trap #75 is about, in its purest form.
 */
export class HelixTourAskEvent extends CustomEvent<TourAskDetail> {
  static readonly eventName = 'helix-tour-ask'

  constructor(detail: TourAskDetail) {
    super(HelixTourAskEvent.eventName, {
      bubbles: true,
      /* Not cancelable, and this is the one of the four where that was a real
         promise rather than an idle flag. The name says *ask*, so a consumer had
         every reason to think refusing it held the tour, and the root's
         `handleAsk` never read `defaultPrevented`: the tour moved anyway.
         Honoring it there would not have worked either, and the reason is
         ordering. The root registers its listener in `connectedCallback` and a
         consumer registers later, so on a bubbling event both are on the same
         target and the root's runs first: it would read `defaultPrevented`
         before the consumer had a chance to set it. `helix-shortcut` gets this
         right by reading the flag on the element that dispatched, where every
         listener has already run.

         **The veto exists and is elsewhere**, which is why this is a
         downgrade rather than a gap. Moving between stops goes through
         `requestChange` and announces `helix-before-activate`; leaving early
         dispatches `helix-before-close` and reads the flag before writing
         `open`. Both are honored. This event is the stop telling the root a
         button was pressed, and the decision is taken one step later. */
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
 * **A class rather than the bare `Event` these were.** They dispatched, they
 * bubbled, `ColorInput` bound both, and `check:events` matched
 * `new CustomEvent(` and so held neither to being declared: two pieces of
 * public API that a consumer could hear and could not find. The check reads
 * `new Event(` now as well.
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
 */
export interface ChangeDetail {
  /**
   * The property that changed, named as the element declares it.
   *
   * **One provenance, which it did not have.** This was `name`, and it carried
   * three different things depending on who dispatched: the property for the
   * splitter's `position`, the form control's name for a checkbox group, a
   * pane's identity for the sandbox, a literal nobody could derive for
   * `page-size`, and the empty string from the active mixin, which is no
   * identification at all. A listener switching on it was switching on a value
   * with four meanings.
   *
   * It answers one question now: *which property*. The other question, *which
   * element*, is `composedPath()[0]`, which is the one that survives a shadow
   * boundary where `event.target` is retargeted to the outermost host. Both
   * sandbox panes report `value` and are told apart by the element, which is
   * what the old comment here described doing by reference and dismissed.
   *
   * A form control's name is on the element too, so a form-level listener reads
   * it from the element it just identified rather than from a field that might
   * have been empty.
   */
  property: string
  /** The value after the change. */
  value: string
}

/**
 * A set is about to make a different child current, and can be refused.
 *
 * **The generic `helix-change` covered this and should not have.** Eleven
 * families that are not form controls announced their state under the word the
 * platform uses for a committed value, which is 294's whole complaint read from
 * the other end: `Tabs` moving to another tab, `Tree` marking another row and
 * `Steps` advancing are not a value changing, they are a set choosing. One word
 * for four questions is what `appearance` was before `check:axes`.
 *
 * `active` names which child is current, so `activate` is the verb, and unlike
 * `change` the platform has no claim on it. There is no notification half here:
 * a native `change` would be a lie about what moved, and no other native event
 * means this. The before event is the whole channel.
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
 * **It replaced `helix-change` and `helix-input` on the value controls**, which
 * were one mechanism under two names chosen by `announcesInput`. The name said
 * *phase* and the flag meant *granularity*, so a consumer reading "change" as
 * "the reader is done" wired a request to `onhelix-change` and got one per
 * character. Granularity is now what the platform already says it is, `input`
 * against `change`, and `announcesInput` picks which native one fires rather
 * than which name this carries. See 294.
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
 * **Its own event rather than a `helix-before-change` carrying a boolean**, and
 * the reason is recorded rather than aesthetic. Reported through the value
 * event the state arrived as `String(checked)`, so a consumer received the
 * string `"false"`, which is truthy, and this library's own checkbox group
 * decoded it with `detail.value === 'true'`. A test asserting the value would
 * have passed on that bug. A control whose state is a boolean wants an event
 * with a typed boolean in it.
 *
 * The notification is native, as it is for a value: the control relays `change`
 * from the inner input and announces `input` beside it, so `onChange` reads
 * `currentTarget.checked` and gets a boolean from the platform.
 *
 * It also ends a collision. Checkbox Group listened for its boxes' change and
 * dispatched its own under the same name from the same host, so it had to call
 * `stopImmediatePropagation` to keep a consumer from receiving one box's
 * boolean alongside the whole set. Two names, two facts.
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
         frame already wrote is a fact being relayed, and this element's own
         comment at the dispatch says "relayed rather than acted on". Nothing
         read the result. */
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
      /* Not cancelable, and it was until 27 Aug 2026. A measurement is not a
         proposal: the content is that tall whether or not anybody wants it to
         be, and neither dispatcher, `Heatmap` nor `Sandbox.Preview`, ever read
         the result. So `preventDefault()` on it was accepted and ignored, which
         is worse than refusing the call: a consumer had every reason to believe
         they had stopped something. */
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
 * is cancelable, and refusing it leaves the item alone; a component left
 * uncontrolled applies it once nobody has refused, which is the same contract
 * every other axis in the library uses.
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
 * and hands back a new set. In controlled mode nothing is written whatever the
 * answer, and this is the element reporting that a heading was clicked.
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
 * Every event this file publishes, and the one place a new one is added.
 *
 * The map below is derived from this rather than written beside it. Kept by
 * hand, the two drifted: `helix-filter` and `helix-navigate` were dispatched by
 * the calendar, the listbox and the pagination and were missing from the map
 * for weeks, so the one thing the augmentation exists to do was not done for
 * them and a consumer writing `addEventListener('helix-navigate', …)` got
 * `Event` and had to reach into `detail` through a cast. Nothing failed, which
 * is why two of the nine went missing.
 *
 * Derived, a class that is in here is typed and a class that is not is absent
 * from both halves at once, so the two cannot disagree. `check:events` fails
 * the build on an exported event class left out of this object, which is the
 * only step left that can be forgotten.
 */
const registry = {
  HelixBeforeActivateEvent,
  HelixBeforeChangeEvent,
  HelixBeforeCloseEvent,
  HelixBeforeCollapseEvent,
  HelixBeforeEditEvent,
  HelixBeforeOpenEvent,
  HelixBeforePinEvent,
  HelixBeforeResizeEvent,
  HelixBeforeToggleEvent,
  HelixCaretEvent,
  HelixCompleteEvent,
  HelixConsoleEvent,
  HelixCopyEvent,
  HelixCreateEvent,
  HelixDismissEvent,
  HelixFilterEvent,
  HelixNavigateEvent,
  HelixNextEvent,
  HelixPreviousEvent,
  HelixReadEvent,
  HelixResizeEvent,
  HelixSampleEndEvent,
  HelixSampleStartEvent,
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
