import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One label and its value.
 *
 * @description
 * Each pair is its own element: the label is the `<dt>` and the value its
 * `<dd>`, and a screen reader hears them together however the list lays them
 * out.
 *
 * The value is the default slot, because it varies and is often more than text,
 * such as a tag, an avatar, or a link. The label is almost always text, so it
 * is also a property.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/description-list
 *
 * @slot - The value.
 * @slot label - The label, when it is more than text. Falls back to `label`.
 *
 * @csspart label - The `<dt>`, holding the label.
 * @csspart value - The `<dd>`, holding the value.
 */
@customElement('helix-headless-description-list-item')
export class HelixHeadlessDescriptionListItem extends HelixElement {
  /**
   * The label, when it is plain text.
   *
   * The fallback of the `label` slot, so slotted content replaces it rather than
   * appearing beside it. The value itself is the default slot: it is the half
   * that varies and is often more than text.
   */
  @property()
  label = ''

  protected override render(): TemplateResult {
    return html`<dt part="label"><slot name="label">${this.label}</slot></dt>
      <dd part="value"><slot></slot></dd>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-description-list-item': HelixHeadlessDescriptionListItem
  }
}
