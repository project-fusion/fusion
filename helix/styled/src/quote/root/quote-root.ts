import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessQuote } from '@fusion.dev/helix-headless/quote'
import type { CSSResultGroup } from 'lit'
import { styles } from './quote-root.css.js'

/**
 * @summary A short quotation, set inline with the text around it.
 *
 * @description
 * Inherits the surrounding type, because an inline quotation is part of its
 * paragraph.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Q, InlineQuote
 * @documentation https://fusion.dev/helix/components/quote
 *
 * @cssproperty --quote-color - Color of the quoted text.
 */
@customElement('helix-quote')
export class HelixQuote extends HelixHeadlessQuote {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-quote': HelixQuote
  }
}
