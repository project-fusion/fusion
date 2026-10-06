import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * Calls back whenever a child arrives at its host or leaves it.
 *
 * **A root that assigns its slots by hand needs this, and nothing else
 * does.** `slotchange` fires when an assignment changes, and under
 * `slotAssignment: 'manual'` the only thing that changes one is the host
 * calling `assign`. A child appended after the first render reaches no slot,
 * fires no `slotchange` and schedules no render, so it is drawn nowhere and
 * counted by nothing: a notification added to a feed of three was never shown
 * until some property changed. A default slot takes whatever is there and
 * needs no watcher.
 *
 * **`childList` and not `subtree`.** A child rewriting its own text, a
 * streaming chat turn on every frame, is no arrival, and a subtree watch would
 * render the whole host again for each change.
 *
 * Asks the host for an update unless given something else to do. Watches
 * from connection to disconnection, and again after a move.
 */
export class ChildrenController implements ReactiveController {
  private watcher: MutationObserver | undefined = undefined

  constructor(
    private readonly host: ReactiveControllerHost & Node,
    private readonly changed: () => void = () => host.requestUpdate(),
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    if (typeof MutationObserver === 'undefined') {
      return
    }
    this.watcher ??= new MutationObserver(() => this.changed())
    this.watcher.observe(this.host, { childList: true })
  }

  hostDisconnected(): void {
    this.watcher?.disconnect()
  }
}
