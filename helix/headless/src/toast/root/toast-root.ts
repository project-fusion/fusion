import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary The region that holds toast messages, and the only element that announces them.
 *
 * @description
 * The region and its items are one family because a live region must be in the
 * document before a message is added to it. Assistive technology often does not
 * announce a region that arrives already holding its message. `Radio.Group` is
 * part of its family for the same reason.
 *
 * **The region is polite, never assertive.** `role="alert"` interrupts whatever
 * a screen reader is reading. For something that cannot wait, use a `Dialog`,
 * which stops the page for every user.
 *
 * **The region never creates or removes items.** You render items and remove
 * them. An item requests closing with a cancelable `helix-dismiss` event. A
 * dismissed item hides itself and stays in the DOM, so your framework's state
 * and the DOM stay in sync. It hides on its own unless you set `open`, which
 * makes the state yours.
 *
 * There is no `toast.show()`. For a `toast()` function, write a small one over
 * your app's state, which also lets you render the same messages on the server,
 * in a test, or more than once.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Toaster, Snackbar
 * @documentation https://fusion.dev/helix/components/toast
 *
 * @slot - The messages.
 *
 * @event {HelixDismissEvent} helix-dismiss - A message is being dismissed, by its control or by its timer. The message sends it, and you can listen for it on the region. Cancelable: canceling it keeps the message.
 *
 * @csspart region - The stack the messages are in.
 */
@customElement('helix-headless-toast')
export class HelixHeadlessToast extends HelixElement {
  /**
   * Accessible name for the region, such as "Notifications".
   */
  @property()
  label = 'Notifications'

  /**
   * Which corner or edge the stack sits at.
   *
   * Named here rather than on each message, because where a page puts its
   * toasts is a fact about the page: a stack whose members disagreed about
   * where they were would not be a stack.
   *
   * **Six corners in one word, where `Carousel` splits the same question in
   * two.** That family takes a placement and an alignment, and argues at its own
   * declaration that one attribute naming both facts multiplies rather than
   * composing. It is right there and wrong here, and the difference is the
   * shape of the product. A carousel's is ragged: its `overlay` belongs to no
   * edge at all, and its two groups of chrome move independently, shipping
   * different defaults so they do not land on each other, which is what makes
   * rewriting one to move the other a real cost. A stack's is two edges by
   * three alignments, every pair real and every pair named this way by every
   * toast a reader has already met. Fusing spells the domain out and loses
   * nothing; a stack has one position and takes it once.
   *
   * **Optional, and bottom-end is the absence of it.** Reflecting *and*
   * defaulting is the pair that writes onto a host: every toast region anybody
   * rendered would gain a `placement="bottom-end"` nobody typed, which a React
   * consumer's server markup does not have. A sheet carries the resting
   * arrangement in its own `:host` rule and the selectors describe only the
   * departures, which is what `orientation` does.
   */
  @property({ reflect: true })
  placement?:
    | 'bottom-center'
    | 'bottom-end'
    | 'bottom-start'
    | 'top-center'
    | 'top-end'
    | 'top-start'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* On the host through internals, so the region is a landmark to anything
       walking the light DOM as well as to a screen reader, and so nothing is
       written onto the host as an attribute a server's markup never had. */
    hostAria(this.internals, { label: this.label, role: 'status' })
    this.internals.ariaLive = 'polite'
    /* Additions are what a reader needs; a message going away is not news, and
       announcing removals means every dismissal is read out. */
    this.internals.ariaRelevant = 'additions'
    /* `role="status"` carries an implicit `aria-atomic="true"`, which means the
       whole region is re-read whenever any part of it changes. With a stack of
       four, the fifth arrival announces all five. `additions` alone does not
       help: it says which mutations count, not how much is read out when one
       does. Both are needed, and only one was here. */
    this.internals.ariaAtomic = 'false'
  }

  protected override render(): TemplateResult {
    return html`<div part="region"><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-toast': HelixHeadlessToast
  }
}
