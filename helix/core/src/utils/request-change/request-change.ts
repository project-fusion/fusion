/**
 * Announces a change, then applies it unless a listener refused.
 *
 * One path for every stateful change in the library. The four controller
 * mixins call it, and so does any component whose state is not one of theirs,
 * so a fault here is a fault in every stateful component at once.
 *
 * **The order is the whole point.** The event goes first and carries the state
 * being *proposed*, so a listener calling `preventDefault()` stops it before
 * anything moves. A component that mutated itself and then announced it would
 * leave a consumer reacting to a decision already made.
 *
 * **Control is an action, not a mode.** This used to decide whether to apply by
 * asking if the consumer had declared ownership, which meant an element that
 * had been handed a `value` applied nothing and waited to be told. That is
 * gone: the element always owns its state and always applies it, and a consumer
 * takes over for one interaction by refusing here and assigning their own. See
 * 294 for the argument, which is that a mode forks the event vocabulary by prop
 * presence, has no ergonomic spelling in HTML, and is invisible enough to need
 * an audit to make it audible.
 *
 * **The audit went with it, and that is not a loss.** It existed to warn that
 * `value="Ada"` looks like the native seed and was not one. It is one now, so
 * the trap it detected cannot happen and the machinery to detect it, two
 * `WeakMap`s and a warning judged on the second request, has nothing to do.
 *
 * Returns whether the change was applied, so a caller that needs to know (a key
 * handler deciding whether to also move focus) can ask.
 *
 * **There is one channel, and it is the event.** `onCheckedChange`,
 * `onOpenChange`, `onValueChange` and `onActiveChange` were a second one,
 * invoked from here once the state had been applied. They were removed on
 * 19 Aug 2026, for working in fewer places than the thing they duplicated:
 * React takes any `on[A-Z]` prop into its own branch and calls
 * `addEventListener('CheckedChange', …)` with it, an event nothing dispatches,
 * so no consumer writing JSX could reach one.
 */
export interface ChangeRequestOptions<T> {
  /** Applies the change. Called only if no listener refused it. */
  apply: (next: T) => void

  /** Builds the cancelable event announcing the change. */
  event: (next: T) => Event

  /** The element announcing the change. */
  host: EventTarget

  /** The state being requested. */
  next: T
}

export const requestChange = <T>({
  apply,
  event,
  host,
  next,
}: ChangeRequestOptions<T>): boolean => {
  if (!host.dispatchEvent(event(next))) {
    return false
  }
  apply(next)
  return true
}
