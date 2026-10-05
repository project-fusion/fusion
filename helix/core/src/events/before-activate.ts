import type { ChangeDetail } from './details.js'

/**
 * A set is about to make a different child current, and can be refused.
 *
 * **Not a generic `helix-change`.** `Tabs` moving to another tab, `Tree` marking
 * another row and `Steps` advancing are not a value changing, they are a set
 * choosing, and the platform's word for a committed value would say the wrong
 * thing. `active` names which child is current, so `activate` is the verb, and
 * unlike `change` the platform has no claim on it.
 *
 * **This fires before the state moves.** Inside a handler `currentTarget.active`
 * still holds the previous value, and `detail.value` is a proposal another
 * listener may refuse, so a consumer who only wants to know which child is
 * current listens for `helix-activate` instead. `helix-select` is not that
 * notification either: it fires when an item is *chosen*, not when `active` is
 * assigned.
 *
 * The shape is the one `MixinControllerOpen` already has, a cancelable request
 * and a plain notification after the state has moved.
 */
export class HelixBeforeActivateEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-activate'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeActivateEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
