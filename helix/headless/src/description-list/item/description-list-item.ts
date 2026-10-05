import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
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
 * **For a label with several values, write each value as a `<dd>`**, such as
 * the authors of a paper. The item then puts your `<dd>` elements after its
 * `<dt>` in place of its own, so a screen reader hears one term and each of
 * its descriptions, as in a native `<dl>`. A server cannot see your elements,
 * so the served item wraps them in its own `<dd>` until it runs.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/description-list
 *
 * @slot - The value, or several `<dd>` elements for several values.
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

  /**
   * Whether the values are the consumer's own `<dd>` elements, which the item
   * then does not wrap. Unknown on a server and while hydrating, where the
   * item draws its own.
   */
  private get several(): boolean {
    return this.knownChildren.some((child) => child.localName === 'dd')
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override render(): TemplateResult {
    const label = html`<dt part="label"><slot name="label">${this.label}</slot></dt>`
    /* The same slot either way, so a value changing from text to `<dd>`
       elements moves nothing but the wrapper. */
    return this.several
      ? html`${label}<slot @slotchange=${this.handleSlotChange}></slot>`
      : html`${label}
          <dd part="value"><slot @slotchange=${this.handleSlotChange}></slot></dd>`
  }

  /** A value arriving or leaving can change whether the item wraps them. */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-description-list-item': HelixHeadlessDescriptionListItem
  }
}
