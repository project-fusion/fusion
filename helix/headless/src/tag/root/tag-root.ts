import { customElement, HelixElement, MixinDismissible } from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type TemplateResult } from 'lit'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary A short label that adds metadata to content.
 *
 * @description
 * A label that people can optionally remove. `dismissible` is the difference
 * from a badge: a badge shows a state that people cannot change, and a tag
 * names something they can remove.
 *
 * The remove button sends `helix-dismiss`. The tag does not remove itself,
 * because your code owns the list it is in, so remove it in your handler. A
 * listener can cancel `helix-dismiss`, and `dismiss()` then returns `false`.
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
 * @csspart label - The label, which the styled tag trims to its capitals and baseline so the letters sit at the middle in any font.
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
      <slot part="label"></slot>
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
