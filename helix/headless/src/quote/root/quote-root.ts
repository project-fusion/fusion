import { customElement, HelixElement } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A short quotation, set inline with the text around it.
 *
 * @description
 * Renders a real `<q>`, which is what supplies the quotation marks: the browser
 * inserts the right ones for the document's language, and nests them correctly
 * when one quotation sits inside another. Typing the marks into the content
 * instead gets both of those wrong in every language but one.
 *
 * A passage set off from the prose rather than run inside it is a blockquote,
 * which is a different element for a different job.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Q, InlineQuote
 * @documentation https://helix.fusion.dev/components/quote
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
