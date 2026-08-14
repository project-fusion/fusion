/**
 * Options for a controlled change request.
 */
export interface ControlledChangeOptions<T> {
  /** Applies the change. Called only if no listener refused it. */
  apply: (next: T) => void

  /** Builds the cancelable event announcing the change. */
  event: (next: T) => Event

  /** The element announcing the change. */
  host: EventTarget

  /**
   * The consumer's callback, invoked after the change is applied.
   *
   * A second channel beside the event, for framework consumers. Note that a
   * React consumer cannot supply this through plain JSX: React reserves every
   * prop matching `on[A-Z]` for its own event system and drops the ones it does
   * not recognise, so `onOpenChange` never reaches the element. The generated
   * wrapper attaches a real listener instead. This is for a consumer holding a
   * reference, or a framework that assigns properties.
   */
  notify?: ((next: T) => void) | undefined

  /** The state being requested. */
  next: T
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
  event,
  host,
  notify,
  next,
}: ControlledChangeOptions<T>): boolean => {
  if (!host.dispatchEvent(event(next))) {
    return false
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
