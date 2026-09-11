import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary The region messages arrive in, and the only thing that announces them.
 *
 * @description
 * **The region is why this is one family rather than two.** A live region has
 * to be in the document *before* a message is put into it: assistive technology
 * subscribes to the region, and a region that arrives already holding its
 * message is frequently not announced at all. So the container is a part of the
 * family and not an arranger of complete things, which is the same reasoning
 * that puts `Radio.Group` inside its own family.
 *
 * **Polite, never assertive.** `role="alert"` interrupts whatever a reader is
 * being told, and almost nothing that arrives in a corner of the screen has
 * earned that. Something that genuinely cannot wait is a `Dialog`, which stops
 * the page for everyone rather than only for the people who cannot see it.
 *
 * **It never creates or destroys anything.** The consumer renders items and
 * removes them; asking to go is a cancelable `helix-dismiss` from the item. An
 * item that has gone hides itself and stays in the tree, so a consumer whose
 * state still lists it does not have their framework fighting a node this
 * component took away. It hides without waiting to be told, unless the consumer
 * declared `open` and said the state is theirs.
 * There is no `toast.show()`, because an imperative queue inside a component is
 * a second copy of the application's state that nothing can render from: an app
 * that wants a `toast()` function writes a thin one over the state it already
 * has, and keeps the ability to render the same messages on the server, in a
 * test, or twice.
 *
 * @since 0.1.0
 * @status experimental
 * @category overlays
 * @aliases Toaster, Snackbar, Notifications
 * @documentation https://helix.fusion.dev/components/toast
 *
 * @slot - The messages, as `helix-toast-item` elements.
 *
 * @event {HelixDismissEvent} helix-dismiss - A message asking to go, by its control or by its timer, dispatched by the message and heard here because the stack is what a consumer holds. Cancelable: refusing it takes the decision and the message stays.
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
   * **Optional, and bottom-end is the absence of it.** Reflecting *and*
   * defaulting is the pair that writes onto a host: every toast region anybody
   * rendered would gain a `placement="bottom-end"` nobody typed, which a React
   * consumer's server markup does not have. The styled sheet carries the resting
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
