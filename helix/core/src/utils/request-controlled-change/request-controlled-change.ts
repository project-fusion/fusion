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

  /**
   * The consumer's callback, invoked after the change is applied.
   *
   * A second channel beside the event, for framework consumers. Note that a
   * React consumer cannot supply this through plain JSX: React reserves every
   * prop matching `on[A-Z]` for its own event system and drops the ones it does
   * not recognize, so `onOpenChange` never reaches the element. The generated
   * wrapper attaches a real listener instead. This is for a consumer holding a
   * reference, or a framework that assigns properties.
   */
  notify?: ((next: T) => void) | undefined

  /** The state being requested. */
  next: T

  /** Reads the state as it stands, for the audit below. */
  read?: (() => T) | undefined
}

/**
 * Elements whose first controlled request has already been audited.
 *
 * Once each, and only the first: a control that answered once is wired up, and
 * a warning that repeats on every keystroke is one a consumer turns off by
 * filtering the console.
 */
const audited = new WeakSet<EventTarget>()

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
 * **Deferred by a task, not a microtask.** The idiomatic React answer is
 * `setState` inside the handler, and the property assignment lands when React
 * commits, after the event has finished. Checking synchronously would accuse
 * every correctly written React consumer in the library.
 *
 * **Not gated behind a development flag**, because there is no build-time
 * define anywhere in this repo and inventing one across five packages plus the
 * sandbox's bundled frame is more machinery than one warning is worth. It costs
 * a `WeakSet` lookup per element per session, and a timer only on the first
 * controlled request an element ever makes.
 */
const auditUnanswered = <T>(
  host: EventTarget,
  label: string,
  next: T,
  read: () => T,
  before: T,
): void => {
  if (audited.has(host)) {
    return
  }
  audited.add(host)
  setTimeout(() => {
    if (!Object.is(read(), before)) {
      return
    }
    const tag = host instanceof Element ? `<${host.localName}>` : 'A Helix element'
    console.warn(
      `${tag} is controlled: \`${label}\` was declared, so it announces changes and waits to be told. ` +
        `It asked for ${JSON.stringify(next)} and nothing assigned \`${label}\`, so it will not respond. ` +
        `Listen for its change event and assign \`${label}\`, or write \`default-${label.toLowerCase()}\` ` +
        'to let the element own it. To refuse a change on purpose, call preventDefault() on the event.',
    )
  }, 0)
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
 * A throwing `notify` is caught and logged rather than rethrown. A consumer's
 * broken callback must not corrupt the element's state or abort the rest of a
 * coordinated update, and there is nothing useful this can do about it besides
 * make it visible.
 */
export const requestControlledChange = <T>({
  apply,
  controlled,
  event,
  host,
  label,
  notify,
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

  /* A cancelled event never reaches here, and should not: somebody refused it,
     so somebody is listening, which is the opposite of what this looks for. */
  if (auditing && label !== undefined && read !== undefined) {
    auditUnanswered(host, label, next, read, before as T)
  }

  apply(next)

  if (notify) {
    try {
      notify(next)
    } catch (error) {
      console.error('A Helix change callback threw. State was applied anyway.', error)
    }
  }

  return true
}
