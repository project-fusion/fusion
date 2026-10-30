import type { FollowDetail } from './details.js'

/**
 * You pressed a link inside the component, and the browser is about to load
 * the page it names.
 *
 * Sent only for a press that stays in this tab on this site: a modified press,
 * a link with `download` or another `target`, a link to another origin, and a
 * jump within the page all go to the browser. Cancelable: cancel it to keep the
 * page, and hand `detail.href` to your router.
 *
 * @followedBy helix-follow
 */
export class HelixBeforeFollowEvent extends CustomEvent<FollowDetail> {
  static readonly eventName = 'helix-before-follow'

  constructor(detail: FollowDetail) {
    super(HelixBeforeFollowEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
