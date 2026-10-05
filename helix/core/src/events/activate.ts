import type { ActivateDetail } from './details.js'

/**
 * A set has made a different child current.
 *
 * The notification half of `helix-before-activate`, dispatched after the state
 * has moved, so `currentTarget.active` is the new value and the detail is a fact
 * rather than a proposal. `previous` is the value that was current before, where
 * the set knows it, as Web Awesome's `wa-video-change` carries both.
 *
 * **Not cancelable**, for the reason every notification here is not: the
 * decision was taken by the event before it, and a second refusable event for
 * one transition is two answers to one question.
 *
 * **Prefixed, and it has to be.** `activate` unprefixed is not in any
 * `*EventMap` in the DOM library, checked rather than assumed, but the prefix is
 * what stops an event dispatched inside a shadow root and retargeted to the host
 * being mistaken for something the host's own contents sent.
 */
export class HelixActivateEvent extends CustomEvent<ActivateDetail> {
  static readonly eventName = 'helix-activate'

  constructor(detail: ActivateDetail) {
    super(HelixActivateEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
