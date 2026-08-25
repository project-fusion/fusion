/**
 * Options for a controlled change request.
 */
export interface ControlledChangeOptions<T> {
  /** Applies the change. Called only if no listener refused it. */
  apply: (next: T) => void

  /**
   * Whether the consumer owns this state, so `apply` will do nothing.
   *
   * Only for the audit below. Passing it wrong changes no behavior, because
   * `apply` is what actually decides; it changes whether a control that has
   * gone quiet says so.
   */
  controlled?: boolean | undefined

  /** Builds the cancelable event announcing the change. */
  event: (next: T) => Event

  /** The element announcing the change. */
  host: EventTarget

  /** The property being requested, named as a consumer writes it. */
  label?: string | undefined

  /** The state being requested. */
  next: T

  /** Reads the state as it stands, for the audit below. */
  read?: (() => T) | undefined
}

/**
 * Elements this has finished judging, either way.
 *
 * Once each: a control that answered is wired up, and a warning that repeats on
 * every keystroke is one a consumer turns off by filtering the console.
 */
const audited = new WeakSet<EventTarget>()

/** The first unanswered request an element made, held until it makes another. */
const pending = new WeakMap<EventTarget, { before: unknown; label: string }>()

/**
 * Says so when a controlled element asks for something and nothing answers.
 *
 * The trap this catches is the one our own examples fell into: `value="Ada"`
 * looks like the native seed and is not. In Helix a declared property is a
 * claim of ownership, so the control announces and waits, and a consumer who
 * meant to seed it gets a control that ignores every keystroke, with nothing
 * logged and nothing visibly wrong. React warns about the mirror image of this
 * ("a `value` prop without an `onChange` handler") for the same reason.
 *
 * **Judged on the next request, not on a timer.** This used to read the state
 * back after `setTimeout(0)`, on the reasoning that React commits a `setState`
 * from a handler before the next task. That is true of React and false of
 * anything slower: a consumer who answers by navigating, which our own
 * documentation nav does by deriving a tree's `active` from the route, cannot
 * possibly have moved the state within one task and was accused of not
 * listening. A warning that is sometimes wrong is one people learn to ignore,
 * and this one has to be believed the day it is right.
 *
 * So there is no deadline. The first unanswered request is remembered, and
 * judgment waits for the second: if the state has not moved between two
 * requests, nothing answered either of them, whatever the timing. A control
 * asked once and never again is never accused, which is the right trade, since
 * the symptom this exists for is a control that ignores everything.
 *
 * **Not gated behind a development flag**, because there is no build-time
 * define anywhere in this repo and inventing one across five packages plus the
 * sandbox's bundled frame is more machinery than one warning is worth. It costs
 * a map lookup per controlled request.
 */
const auditUnanswered = <T>(host: EventTarget, label: string, next: T, before: T): void => {
  if (audited.has(host)) {
    return
  }
  const first = pending.get(host)
  if (first === undefined) {
    pending.set(host, { before, label })
    return
  }
  /* `before` is this request's reading, taken before its event went out, and
     `first.before` is the reading from the one before that. Unmoved across two
     requests is unanswered, with no guess about how long an answer should take. */
  audited.add(host)
  pending.delete(host)
  if (!Object.is(before, first.before)) {
    return
  }
  /* `typeof` first, because `Element` is not a global everywhere this runs. The
     server has no DOM unless something shimmed one, and an audit that throws
     where it meant to warn turns a diagnostic into an outage. Found by testing
     this on a plain `EventTarget`, which is what it accepts. */
  const named = typeof Element !== 'undefined' && host instanceof Element
  const tag = named ? `<${(host as Element).localName}>` : 'A Helix element'
  console.warn(
    `${tag} is controlled: \`${label}\` was declared, so it announces changes and waits to be told. ` +
      `It has asked twice, most recently for ${JSON.stringify(next)}, and nothing assigned ` +
      `\`${label}\`, so it will not respond. Listen for its change event and assign \`${label}\`, ` +
      `or write \`default-${label.toLowerCase()}\` to let the element own it. To refuse a change on ` +
      'purpose, call preventDefault() on the event.',
  )
}

/**
 * Announces a change, then applies it if nobody refused.
 *
 * One audited path for every stateful change in the system. The order is the
 * whole point: the event goes first and carries the state being *proposed*, so
 * a listener calling `preventDefault()` stops it before anything moves. A
 * component that mutated itself and then announced it would leave a consumer
 * reacting to a decision already made.
 *
 * Returns whether the change was applied, so a caller that needs to know
 * (a key handler deciding whether to also move focus) can ask.
 *
 * **There is one channel, and it is the event.** `onCheckedChange`,
 * `onOpenChange`, `onValueChange` and `onActiveChange` were a second one,
 * invoked from here once the state had been applied. They were removed on
 * 19 Aug 2026, for working in fewer places than the thing they duplicated:
 * React takes any `on[A-Z]` prop into its own branch and calls
 * `addEventListener('CheckedChange', …)` with it, an event nothing dispatches,
 * so no consumer writing JSX could reach one. The justification written beside
 * them was that the generated React wrapper assigned them instead, and that
 * package was deleted in `46f5f7f`, which left four documented properties that
 * only a consumer holding a reference could use. `helix-change` reaches every
 * consumer in every framework, hydration included.
 */
export const requestControlledChange = <T>({
  apply,
  controlled,
  event,
  host,
  label,
  next,
  read,
}: ControlledChangeOptions<T>): boolean => {
  const auditing = controlled === true && label !== undefined && read !== undefined
  /* Read before the event, not after. A consumer answering synchronously from
     the handler has already moved the state by the time `dispatchEvent`
     returns, so a reading taken then is the answer, and comparing it against
     itself later would accuse every consumer who did the right thing. Taken
     first, "unchanged" means unchanged by anybody. */
  const before = auditing && read ? read() : undefined

  if (!host.dispatchEvent(event(next))) {
    return false
  }

  /* A canceled event never reaches here, and should not: somebody refused it,
     so somebody is listening, which is the opposite of what this looks for. */
  if (auditing && label !== undefined && read !== undefined) {
    auditUnanswered(host, label, next, before as T)
  }

  apply(next)

  return true
}
