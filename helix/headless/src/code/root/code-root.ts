import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'

/**
 * @summary A fragment of code inside a line of prose.
 *
 * @description
 * Renders a real `<code>` element, which marks the text as code for translation
 * tools and document search. A styled span carries no such meaning, and a
 * screen reader announces nothing about it.
 *
 * **Code is left untranslated.** A page translator that rewrites prose would
 * also rewrite an identifier, so `Code` sets `translate="no"` on itself when
 * it connects. Set `translate="yes"` on the element for a fragment that is
 * words, and your value is kept.
 *
 * `Code` is inline only and never scrolls. For a block of code with its own
 * box, its own overflow, and copying, use `CodeBlock`, which is a separate
 * family.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Inline code
 * @documentation https://fusion.dev/helix/components/code
 *
 * @slot - The code.
 *
 * @csspart code - The `<code>` element.
 */
@customElement('helix-headless-code')
export class HelixHeadlessCode extends HelixElement {
  /* The slotted text inherits its translation mode from the host, its parent
     in the page, so the attribute has to be on the host: one on the inner
     `<code>` covers nothing a translator reads. A page's own value is kept. */
  override connectedCallback(): void {
    super.connectedCallback()
    if (!this.hasAttribute('translate')) {
      this.setAttribute('translate', 'no')
    }
  }

  protected override render(): TemplateResult {
    return html`<code part="code"><slot></slot></code>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-code': HelixHeadlessCode
  }
}
