import { HelixBeforeChangeEvent } from '../../events/before-change.js'

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
 * **Control is an action, not a mode.** The element always owns its state and
 * always applies it, and a consumer takes over for one interaction by refusing
 * here and assigning their own. A mode instead would fork the event vocabulary
 * by prop presence, has no ergonomic spelling in HTML, and is invisible enough
 * to need an audit to make it audible.
 *
 * Returns whether the change was applied, so a caller that needs to know (a key
 * handler deciding whether to also move focus) can ask.
 *
 * **There is one channel, and it is the event.** A callback property beside it
 * (`onCheckedChange` and its kind) is unreachable from JSX: React takes any
 * `on[A-Z]` prop into its own branch and calls
 * `addEventListener('CheckedChange', …)` with it, an event nothing dispatches.
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

/**
 * Asks before a reader's press moves a value, then applies it and says so:
 * `helix-before-change` with the value it would leave, which a listener may
 * cancel, and `change` once it has moved.
 *
 * **The order every selectable set in the library keeps**, so a page reads the
 * same pair from a list, a tag group, a heatmap or a legend: the cancelable
 * question first, the platform's `change` after, bubbling and composed as a
 * native control's does. Returns whether the value moved.
 */
export const requestValue = (
  host: EventTarget,
  next: string,
  apply: (value: string) => void,
): boolean =>
  requestChange({
    apply: (value) => {
      apply(value)
      host.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    },
    event: (value) => new HelixBeforeChangeEvent({ value }),
    host,
    next,
  })
