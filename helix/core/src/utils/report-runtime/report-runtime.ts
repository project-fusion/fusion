/**
 * Where the library says, as it runs, that it was used wrong or could not do
 * what it was asked: one channel for every such warning, in every package.
 *
 * **Each warning is an event with a kind**, stable across versions, so
 * `@fusion.dev/helix-diagnostics` counts it by kind and tag, lists it beside
 * the findings, and sends it where a project's settings say. The sentence
 * prints in the console as it always did, unless the listener prints it in its
 * own place, which a project asks for with `core.warnings: false`.
 *
 * **The same kind of slot on `globalThis` as usage**, under a registered
 * symbol, so every copy of Helix on a page reports to one listener, and
 * diagnostics needs nothing imported from here.
 *
 * **Kept from the start of the page, a few hundred at most**, since the first
 * events happen as the modules load: a tag registered twice is reported before
 * any diagnostics can have started.
 */

/** What went wrong, stable across versions, so it can be counted. */
export type RuntimeKind =
  /** Another class asked for a tag that is already registered: two copies of Helix. */
  | 'duplicate-registration'
  /** The browser refused fullscreen, usually for a frame without the permission. */
  | 'fullscreen-refused'
  /** An Avatar Group's `max` is past the number the fold is written for. */
  | 'max-past-fold'
  /** A rating's `min` is no score between 0 and its `max`. */
  | 'min-out-of-range'
  /** A Stat was given one of Trend's directions, `up`, `down` or `neutral`, which lay nothing out. */
  | 'misread-direction'
  /** A React handler prop names an event the element never dispatches itself. */
  | 'misplaced-handler'
  /** An Image has no `alt`, so a screen reader announces its file name. */
  | 'missing-alt'
  /** The three.js driver could not load its layout, so the notes stay where they started. */
  | 'missing-layout'
  /**
   * A control has no accessible name, so a screen reader announces it by its role alone.
   * Reported in development builds only (the `development` export condition).
   */
  | 'missing-name'
  /** A selectable Data Table has no `row-key`, so it knows each row by its place. */
  | 'missing-row-key'
  /** A stencil names parts the shape does not have. */
  | 'missing-stencil-parts'
  /** A Skip Link's `href` names no element in its tree, so a press moves focus nowhere. */
  | 'missing-target'
  /** A tooltip's `for` names no element in its own tree. */
  | 'missing-trigger'
  /** An area chart was handed a negative number, which it draws as none. */
  | 'negative-value'
  /** A Graph connector was handed an element that is no Graph frame. */
  | 'not-a-graph'
  /** The browser refused picture in picture. */
  | 'picture-in-picture-refused'
  /** A Grid's `min` is no length it can write, so the grid lays out by its column count. */
  | 'refused-length'
  /** A React handler prop is a removed callback, which never ran from JSX. */
  | 'removed-callback'
  /** A React handler prop uses Solid's `on:`, which React reads as another event's name. */
  | 'solid-handler-syntax'
  /** A stencil's regions went unused: no named parts, or parts too small. */
  | 'stencil-regions-unused'
  /** A stencil has no inside to place the notes in. */
  | 'stencil-without-inside'
  /** A Data Table is drawing more rows at once than it stays responsive to. */
  | 'too-many-rows'
  /** A filter field marks more than one operator as its default. */
  | 'two-default-operators'
  /** A React handler prop names an event nothing dispatches. */
  | 'unknown-event'
  /** An Icon's `name` is in no icon set it can read, so it draws nothing. */
  | 'unknown-icon'
  /** A tooltip's trigger does not name it in `aria-describedby`, so it is not read out. */
  | 'unlinked-trigger'
  /** A Text is rendered as a label, a deprecated value whose shadow root reaches no control. */
  | 'unreachable-label'
  /** A virtualized list's box has no height of its own, so its window never settles. */
  | 'unsettled-window'
  /** A slotted trigger is a plain element, which cannot be told it opens something. */
  | 'untold-trigger'
  /** A tooltip wraps its trigger, so its text reaches no screen reader. */
  | 'wrapped-trigger'

/** One event: what went wrong, where, and the sentence that says what to do. */
export interface RuntimeEvent {
  /** What went wrong. */
  readonly kind: RuntimeKind
  /** Printed with `console.error` where `error`, and with `console.warn` otherwise. */
  readonly level?: 'error' | 'warn'
  /** The sentence the console prints, which says what to do. */
  readonly message: string
  /** The tag of the element it happened on, where there is one. */
  readonly tag?: string | undefined
  /** What else the console line carries, such as the error a platform call threw. */
  readonly detail?: unknown
}

/**
 * The key the listener is kept under. `@fusion.dev/helix-diagnostics` names
 * the same string.
 *
 * The listener returns `true` when it prints the event in its own place, and
 * then the console line here is not printed.
 */
export const RUNTIME_SLOT = Symbol.for('fusion.dev/helix/runtime')

/** The key the events reported so far are kept under, for a listener that starts late. */
export const RUNTIME_LOG = Symbol.for('fusion.dev/helix/runtime-log')

/** How many events the log keeps: the first ones, which happened before anyone listened. */
const KEPT = 200

/** Whether a listener's failure has been printed, so a failing listener prints once. */
let told = false

/**
 * Reports one event: to the log, to the listener where there is one, and to
 * the console unless the listener prints it itself.
 *
 * **A listener that throws never stops the report.** The error is printed
 * once, and the event is printed as if nothing listened.
 */
export const reportRuntime = (event: RuntimeEvent): void => {
  const store = globalThis as Record<symbol, unknown>
  const log = Array.isArray(store[RUNTIME_LOG]) ? (store[RUNTIME_LOG] as RuntimeEvent[]) : []
  if (log.length < KEPT) {
    log.push(event)
  }
  store[RUNTIME_LOG] = log
  let quiet = false
  const listener = store[RUNTIME_SLOT]
  if (typeof listener === 'function') {
    try {
      quiet = listener(event) === true
    } catch (error) {
      if (!told) {
        told = true
        console.error(
          'helix: a runtime listener threw, and the warning is printed here. Later failures are not printed.',
          error,
        )
      }
    }
  }
  if (quiet) {
    return
  }
  const print = event.level === 'error' ? console.error : console.warn
  if (event.detail === undefined) {
    print(event.message)
  } else {
    print(event.message, event.detail)
  }
}
