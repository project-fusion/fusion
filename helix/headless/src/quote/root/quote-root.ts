import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A short quotation, set inline with the text around it.
 *
 * @description
 * Renders a real `<q>`, so the browser supplies the quotation marks. It inserts
 * the correct marks for the document's language and nests them correctly when
 * one quotation sits inside another. Do not type quotation marks into the
 * content.
 *
 * For a passage set off from the surrounding text, use a blockquote.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Q, InlineQuote
 * @documentation https://fusion.dev/helix/components/quote
 *
 * @slot - The quoted text.
 *
 * @csspart quote - The quotation.
 */
@customElement('helix-headless-quote')
export class HelixHeadlessQuote extends HelixElement {
  /**
   * URL identifying where the quotation came from.
   */
  @property()
  cite = ''

  protected override render(): TemplateResult {
    return html`<q part="quote" cite=${this.cite || nothing}><slot></slot></q>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-quote': HelixHeadlessQuote
  }
}
