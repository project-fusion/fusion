import { customElement, HelixDismissEvent, HelixElement } from '@helix-io/core'
import { x } from '@helix-io/icons'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
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
 * their state and the document out of step. Cancelling `helix-dismiss` is a
 * refusal.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Chip, Pill, Label
 * @documentation https://helix.fusion.dev/components/tag
 *
 * @slot - The tag's label.
 *
 * @csspart dismiss - The control that asks to remove the tag.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the reader asks to remove the tag.
 */
@customElement('helix-base-tag')
export class HelixBaseTag extends HelixElement {
  /** Whether the tag offers a control to remove itself. */
  @property({ reflect: true, type: Boolean })
  dismissible = false

  /**
   * Accessible name for the dismiss control.
   *
   * A property rather than text read from the tag, because naming the button
   * "Remove Draft" would mean reading `textContent` and the server has no tree
   * to read it from.
   *
   * The attribute is named explicitly. Lit lowercases a property name to get an
   * attribute rather than dash-casing it, so this would otherwise be reachable
   * only as `removelabel`, which nobody would guess and no linter would catch.
   */
  @property({ attribute: 'dismiss-label' })
  dismissLabel = 'Remove'

  private readonly handleDismiss = (): void => {
    // Reading text is safe here: a click only ever happens in a browser.
    this.dispatchEvent(new HelixDismissEvent({ label: this.textContent?.trim() ?? '' }))
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>
      ${
        this.dismissible
          ? html`<button
            part="dismiss"
            type="button"
            aria-label=${this.dismissLabel}
            @click=${this.handleDismiss}
          >
            <svg fill="currentColor" viewBox=${x.viewBox} aria-hidden="true">
              ${unsafeSVG(x.content)}
            </svg>
          </button>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-tag': HelixBaseTag
  }
}
