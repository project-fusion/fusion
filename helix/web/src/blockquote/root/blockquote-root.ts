import { customElement } from '@helix-io/core'
import { HelixBaseBlockquote } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './blockquote-root.css.js'

/**
 * @summary A passage set off from the prose around it.
 *
 * @description
 * Set larger than body text on the display face, because a pulled quotation is
 * a change of voice and the type is what says so. No quotation marks are drawn:
 * the size and the space around it already set the passage apart, and marks on
 * top of that are the same thing said twice.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Pullquote, Citation, Excerpt
 * @documentation https://helix.fusion.dev/components/blockquote
 *
 * @cssproperty --blockquote-size - Size of the quoted passage.
 */
@customElement('helix-blockquote')
export class HelixBlockquote extends HelixBaseBlockquote {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-blockquote': HelixBlockquote
  }
}
