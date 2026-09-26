import { customElement, HelixElement, MixinDismissible } from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type TemplateResult } from 'lit'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary A short label that adds metadata to content.
 *
 * @description
 * A tag is a label, and optionally a label the reader can take off.
 * `dismissible` is what separates it from a badge: a badge reports a state the
 * reader cannot change, a tag names something they can.
 *
 * Dismissing is a request. The tag does not remove itself, because the consumer
 * owns the list it sits in and taking the node out from under them would put
 * their state and the document out of step. Canceling `helix-dismiss` is a
 * refusal.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Chip, Pill, Label
 * @documentation https://fusion.dev/helix/components/tag
 *
 * @slot - The tag's label.
 * @slot start - The category the label belongs to, shown before it in a heavier weight.
 *
 * @event {HelixDismissEvent} helix-dismiss - The remove button was pressed. The tag does not remove itself, so remove it in response. Cancelable.
 *
 * @csspart dismiss - The button that removes the tag.
 * @csspart dismiss-mark - The icon on the remove button.
 * @csspart start - The category before the label.
 */
@customElement('helix-headless-tag')
export class HelixHeadlessTag extends MixinDismissible(HelixElement) {
  /* "Remove" rather than the mixin's "Dismiss". A tag is taken out of a set,
     which is a different act from closing a message, and the control's name is
     what a screen-reader user hears. */
  override dismissLabel = 'Remove'

  protected override render(): TemplateResult {
    return html`<slot name="start" part="start"></slot>
      <slot></slot>
      ${
        this.dismissible
          ? html`<button
            part="dismiss"
            type="button"
            aria-label=${this.dismissLabel}
            @click=${() => this.dismiss()}
          >
            <svg part="dismiss-mark" fill="currentColor" viewBox=${x.viewBox} aria-hidden="true">
              ${unsafeSVG(x.content)}
            </svg>
          </button>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tag': HelixHeadlessTag
  }
}
