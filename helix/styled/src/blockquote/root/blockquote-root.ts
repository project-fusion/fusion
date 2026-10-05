import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessBlockquote } from '@fusion.dev/helix-headless/blockquote'
import type { CSSResultGroup } from 'lit'
import { styles } from './blockquote-root.css.js'

/**
 * @summary A passage set off from the prose around it.
 *
 * @description
 * Set in the display face, larger than body text, to mark a change of voice. No
 * quotation marks are drawn, because the size and spacing already set the
 * passage apart.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Pullquote, Citation, Excerpt
 * @documentation https://fusion.dev/helix/components/blockquote
 *
 * @cssproperty --blockquote-attribution-color - The color of the attribution.
 * @cssproperty --blockquote-attribution-size - The font size of the attribution.
 * @cssproperty --blockquote-color - The color of the quoted passage.
 * @cssproperty --blockquote-font-family - The typeface of the quoted passage, the display face by default.
 * @cssproperty --blockquote-gap - The space between the passage and its attribution.
 * @cssproperty --blockquote-size - The font size of the quoted passage.
 */
@customElement('helix-blockquote')
export class HelixBlockquote extends HelixHeadlessBlockquote {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-blockquote': HelixBlockquote
  }
}
