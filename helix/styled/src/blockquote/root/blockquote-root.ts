import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessBlockquote } from '@fusion.dev/helix-headless/blockquote'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './blockquote-root.css.js'

/**
 * @summary A passage set off from the prose around it.
 *
 * @description
 * Set in the display face, larger than body text, to mark a change of voice. No
 * quotation marks are drawn by default, because the size and spacing already
 * set the passage apart. `marks` draws one large opening mark over the passage,
 * as a pull quote sets it, in the element's language.
 *
 * `text-align` sets the passage and its attribution in the middle of the
 * column or against its far edge, as a pull quote often stands. There, the
 * mark `marks` draws stands over the passage rather than beside it.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Pullquote, Citation, Excerpt
 * @documentation https://fusion.dev/helix/components/blockquote
 *
 * @cssproperty --blockquote-attribution-color - The color of the attribution.
 * @cssproperty --blockquote-attribution-font-family - The typeface of the attribution, the page's by default.
 * @cssproperty --blockquote-attribution-font-weight - The weight of the attribution, the page's by default.
 * @cssproperty --blockquote-attribution-size - The font size of the attribution.
 * @cssproperty --blockquote-color - The color of the quoted passage.
 * @cssproperty --blockquote-font-family - The typeface of the quoted passage, the display face by default.
 * @cssproperty --blockquote-font-weight - The weight of the quoted passage, medium by default.
 * @cssproperty --blockquote-gap - The space between the passage and its attribution.
 * @cssproperty --blockquote-letter-spacing - The letter spacing of the quoted passage, the tight tracking by default.
 * @cssproperty --blockquote-line-height - The line height of the quoted passage, the tight leading by default.
 * @cssproperty --blockquote-mark-color - The color of the mark `marks` draws, the subtle foreground by default.
 * @cssproperty --blockquote-mark-size - The font size of the mark `marks` draws.
 * @cssproperty --blockquote-size - The font size of the quoted passage.
 */
@customElement('helix-blockquote')
export class HelixBlockquote extends HelixHeadlessBlockquote {
  /**
   * How the passage and its attribution align, set as `text-align`.
   *
   * `center` for a pull quote in the middle of a column and `end` for one
   * against its far edge. Under either, the mark `marks` draws stands over
   * the first line. Absent aligns as the prose around it does.
   *
   * Named for the CSS property it sets, as `Text.textAlign` is: `align` alone
   * is a legacy HTML attribute the browser maps to `text-align` by itself,
   * and it has no `start` or `end`.
   */
  @property({ attribute: 'text-align', reflect: true })
  textAlign?: 'start' | 'center' | 'end'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-blockquote': HelixBlockquote
  }
}
