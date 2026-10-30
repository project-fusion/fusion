import type { ScrolledDetail } from './details.js'

/**
 * Fired when a header crosses the threshold between resting at the top of the
 * page and floating over it.
 *
 * **The threshold lives in a custom state, and is announced rather than
 * reflected.** A `data-scrolled` on the host is an attribute nobody rendered: a
 * server sends the element without it and the element adds it on upgrade, so a
 * framework hydrating the page finds markup that no longer matches what it sent.
 * A custom state is deliberately not in the DOM and therefore not something a
 * hydration pass can disagree with.
 *
 * That closes the observability an attribute would accidentally provide. A
 * `MutationObserver` can watch an attribute and there is no equivalent for
 * `ElementInternals.states`, so a component holding a boolean nothing can read
 * is a component with a private opinion its consumers demonstrably need: the
 * bar's own backdrop is drawn by the page around it, and the page has to know
 * when to light it.
 *
 * Not cancelable. It reports where the page is rather than asking permission to
 * be there, and refusing it would leave the state and the announcement
 * disagreeing.
 *
 * The hysteresis stays inside the header, which is the point of announcing at
 * all: a consumer listening to `scroll` itself would be a second opinion on
 * when the page counts as scrolled, and the two would part company at the eight
 * pixels of travel this waits for.
 */
export class HelixScrolledEvent extends CustomEvent<ScrolledDetail> {
  static readonly eventName = 'helix-scrolled'

  constructor(detail: ScrolledDetail) {
    super(HelixScrolledEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
