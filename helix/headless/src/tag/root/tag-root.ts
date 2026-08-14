import { customElement, HelixElement, HelixRemoveEvent } from '@helix-io/core'
import { x } from '@helix-io/icons'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary Labels content with a short piece of metadata.
 *
 * @description
 * A tag is a label, and optionally a label the reader can take off. `removable`
 * is what separates it from a badge: a badge reports a state the reader cannot
 * change, a tag names something they can.
 *
 * Removing is a request, not an action. The tag dispatches `RemoveRequest` and
 * does nothing else, because the consumer owns the list it sits in; taking the
 * node out from under them would put their state and the document out of step.
 * The event is cancelable, so `preventDefault()` is a refusal.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Chip, Pill, Label
 * @documentation https://helix.fusion.dev/components/tag
 *
 * @slot - The tag's label.
 *
 * @csspart remove - The remove button, when `removable`.
 *
 * @event {HelixRemoveEvent} helix-remove - Fired when the reader asks to remove the tag.
 */
@customElement('helix-base-tag')
export class HelixBaseTag extends HelixElement {
  /** Whether the tag offers a control to remove itself. */
  @property({ reflect: true, type: Boolean })
  removable = false

  /**
   * Accessible name for the remove control.
   *
   * A property rather than text read from the tag, because naming the button
   * "Remove Draft" would mean reading `textContent` and the server has no tree
   * to read it from.
   *
   * The attribute is named explicitly. Lit lowercases a property name to get an
   * attribute rather than dash-casing it, so this would otherwise be reachable
   * only as `removelabel`, which nobody would guess and no linter would catch.
   */
  @property({ attribute: 'remove-label' })
  removeLabel = 'Remove'

  private readonly handleRemove = (): void => {
    // Reading text is safe here: a click only ever happens in a browser.
    this.dispatchEvent(new HelixRemoveEvent({ label: this.textContent?.trim() ?? '' }))
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>
      ${
        this.removable
          ? html`<button
            part="remove"
            type="button"
            aria-label=${this.removeLabel}
            @click=${this.handleRemove}
          >
            <svg viewBox=${x.viewBox} aria-hidden="true">${unsafeSVG(x.content)}</svg>
          </button>`
          : nothing
      }
    </span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-tag': HelixBaseTag
  }
}
