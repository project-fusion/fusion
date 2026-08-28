import { customElement } from '@helix-io/core'
import { HelixHeadlessOutline } from '@helix-io/headless/outline'
import type { CSSResultGroup } from 'lit'
import { styles } from './outline-root.css.js'

/**
 * @summary Links to the headings on this page, marking the one being read.
 *
 * @description
 * A rule down the leading edge with the current section lit along it, which is
 * the shape a table of contents has taken since printed marginalia: the line
 * says the list is one thing, and the lit segment says where in it you are.
 *
 * Nesting is the consumer's, expressed as `data-level` on a link. A outline
 * that read heading levels itself would have to look at the document, and the
 * document is not always where the headings are.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Table of contents, On this page, Outline
 * @documentation https://helix.fusion.dev/components/outline
 *
 * @cssproperty --outline-indent - How far each level is inset from the one above.
 * @cssproperty --outline-rail - Width of the gutter the rule and the traveling mark share.
 */
@customElement('helix-outline')
export class HelixOutline extends HelixHeadlessOutline {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-outline': HelixOutline
  }
}
