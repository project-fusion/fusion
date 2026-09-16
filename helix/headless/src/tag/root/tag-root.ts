import { customElement, HelixElement, MixinDismissible } from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type TemplateResult } from 'lit'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary Labels content with a short piece of metadata.
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
 * @slot prefix - A category the label belongs to, set before it and weightier.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the reader asks to remove the tag. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart dismiss - The control that asks to remove the tag.
 * @csspart dismiss-mark - The glyph on the dismiss control, where none is slotted.
 * @csspart prefix - The category before the label.
 */
@customElement('helix-headless-tag')
export class HelixHeadlessTag extends MixinDismissible(HelixElement) {
  /* "Remove" rather than the mixin's "Dismiss". A tag is taken out of a set,
     which is a different act from closing a message, and the control's name is
     what a screen-reader user hears. */
  override dismissLabel = 'Remove'

  protected override render(): TemplateResult {
    return html`<slot name="prefix" part="prefix"></slot>
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
