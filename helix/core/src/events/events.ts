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

/*
 * Names are `helix-{verb}`, lowercase and prefixed.
 *
 * The prefix is what stops a collision with a native name: an event dispatched
 * inside a shadow root is retargeted to look like it came from the host, so a
 * bare `input` from a `<helix-input>` is indistinguishable from the inner
 * control's own. Prefixed, it cannot be mistaken for either.
 *
 * The name also decides the framework prop, and decides it verbatim: React
 * slices `on` off the prop and listens for exactly what is left, so `helix-open`
 * is `onhelix-open`. Nothing strips the prefix and nothing camel-cases it, which
 * is what leaves the prefix free to do the third job below.
 *
 * The prefix earns its place three times over:
 *
 * 1. **Retargeting.** Stated above, and the reason it exists.
 * 2. **React's claimed verbs.** Its synthetic system owns `change`, `input`,
 *    `submit`, `copy`, `focus` and the rest, and a prop matching one of those
 *    is wired to the native event. Prefixed, `onhelix-change` matches none of
 *    them and reaches us.
 * 3. **The type map below, which is global.** `HTMLElementEventMap` is shared
 *    with every element in a consumer's application, and our classes extend
 *    `Event`, so an entry named `select` does not fail to compile: it silently
 *    retypes `textarea.addEventListener('select', …)` as carrying our detail,
 *    which at runtime is `undefined`. Measured. An unprefixed name is not a
 *    collision we would notice, it is one a consumer would.
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

/**
 * Fired when the reader asks for the next thing in a set.
 *
 * Paired with `helix-previous` rather than being one event carrying a
 * direction, which is the reason `helix-open` gives for its own pair: a
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
      cancelable: true,
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

/** The eyedropper closing, whether or not a colour was taken. */
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
 * Detail carried by `helix-change`.
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
 * Fired when a value changes on something that is not a native input.
 *
 * `helix-change` rather than the `helix-value-change` this was called. The
 * rename was made on the belief that React binds no event whose name carries
 * two hyphens, which is false: it binds them fine, measured in Chrome against
 * 19.2.8. The shorter name stays for being shorter and for naming the thing
 * rather than the thing's field, and not for the reason it was chosen.
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

/** Detail carried by `helix-toggle`. */
export interface ToggleDetail {
  /** The state being asked for, as a boolean and not a word that reads like one. */
  checked: boolean
}

/**
 * Fired when something that is checked or unchecked is about to change.
 *
 * **Separate from `helix-change` because the payload is a boolean and that one
 * carries a string.** It was not separate, and the cost was exact: the checked
 * mixin dispatched `value: String(checked)`, so a consumer received `"false"`,
 * which is truthy. Our own checkbox group decoded it with
 * `detail.value === 'true'`, which is what a workaround looks like when it has
 * been in the codebase long enough to read as a convention.
 *
 * A generic `HelixChangeEvent<T>` was measured first and reached `jsx.d.ts`
 * intact, so the manifest and the generator both carry one. It fails one step
 * later: the map below derives from the registry through
 * `InstanceType<Registry[K]>`, which resolves an unspecified parameter to
 * `unknown` rather than to its default, so every `addEventListener` consumer
 * traded a wrong type for no type. Restoring the entry means an override list
 * beside the registry, which is the second list the registry exists to abolish.
 * A union (`string | boolean`) fails differently and worse: every consumer of
 * every text field narrows for a case that cannot happen to them, and the next
 * numeric control widens it again.
 *
 * So the split follows the shape already in this file. `helix-open` carries
 * `{ open: boolean }` rather than stringifying into a change, and this is the
 * same decision for the same reason.
 *
 * It also ends a collision. Checkbox Group listened for its boxes' change and
 * dispatched its own under the same name from the same host, so it had to call
 * `stopImmediatePropagation` to keep a consumer from receiving one box's
 * boolean alongside the whole set. Two names, two facts.
 *
 * The detail carries no `name`. Which control changed is `composedPath()[0]`,
 * which is right across a shadow boundary where `event.target` is retargeted,
 * and the group already identifies its boxes that way.
 */
export class HelixToggleEvent extends CustomEvent<ToggleDetail> {
  static readonly eventName = 'helix-toggle'

  constructor(detail: ToggleDetail) {
    super(HelixToggleEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

/**
 * Fired as a value changes, on a control the reader edits continuously.
 *
 * **The platform's pair, and we had only half of it.** `<input type="text">`
 * fires `input` on every keystroke and `change` once the edit is committed.
 * Helix fired `helix-change` on every keystroke and relayed the native `change`
 * on commit, so an element carried two events whose names said the opposite of
 * their timings: a consumer reading "change" as "the reader is done" wired a
 * search request to `onhelix-change` and sent one per character. Web Awesome and
 * Spectrum both use the native pair, and anyone arriving from either, or from
 * HTML, reads ours backwards.
 *
 * So a control the reader types or drags in announces `helix-input`, and
 * `change` stays what it is: the native one, relayed, on commit. Five carry it:
 * Input, Textarea, Number Input, Pin Input and Slider. Everything else changes
 * in discrete steps, where one announcement per step is a change and is named
 * one: choosing an option, moving a tab, settling a divider.
 *
 * Same detail as `helix-change`, because it is the same fact at a different
 * moment, and same shape: cancelable, announced before the value moves, so
 * `preventDefault()` refuses the keystroke and the control is put back.
 *
 * It shares a name with the `<helix-input>` element, which is a collision only
 * to read: an event name and a tag name occupy different namespaces, and the
 * alternative was a name that no longer matches the platform's.
 */
export class HelixInputEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-input'

  constructor(detail: ChangeDetail) {
    super(HelixInputEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
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
 * What a picture reports when it settles, either way.
 */
export interface LoadDetail {
  /** The source that settled, so a listener can tell which one answered. */
  src: string
}

/**
 * A picture arrived.
 *
 * **The reason this exists at all is that the platform's own is unreachable.**
 * `load` and `error` on an `<img>` do not bubble and are not composed, so an
 * image inside a shadow root fires them where nobody outside can hear. A
 * consumer wanting to know when a picture landed had a reflected attribute and
 * a `MutationObserver`, which is a worse answer to a question the platform
 * already answers well.
 *
 * Bubbling and composed, unlike `helix-close`, because these are worth hearing
 * from a container: a gallery counting how many of its pictures have settled is
 * the ordinary case, and asking it to bind a listener per picture is the thing
 * delegation exists to avoid.
 */
export class HelixLoadEvent extends CustomEvent<LoadDetail> {
  static readonly eventName = 'helix-load'

  constructor(detail: LoadDetail) {
    super(HelixLoadEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}

/**
 * A picture is not coming.
 *
 * The counterpart, and the more useful of the two: a consumer swapping to
 * another source, hiding a section that has nothing to show, or reporting a
 * broken asset can do none of it without hearing this.
 */
export class HelixErrorEvent extends CustomEvent<LoadDetail> {
  static readonly eventName = 'helix-error'

  constructor(detail: LoadDetail) {
    super(HelixErrorEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
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
  HelixCaretEvent,
  HelixChangeEvent,
  HelixCloseEvent,
  HelixCompleteEvent,
  HelixConsoleEvent,
  HelixCopyEvent,
  HelixCreateEvent,
  HelixDismissEvent,
  HelixErrorEvent,
  HelixFilterEvent,
  HelixInputEvent,
  HelixLoadEvent,
  HelixNavigateEvent,
  HelixNextEvent,
  HelixOpenEvent,
  HelixPreviousEvent,
  HelixSampleEndEvent,
  HelixSampleStartEvent,
  HelixSelectEvent,
  HelixToggleEvent,
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
