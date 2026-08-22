import { customElement } from '@helix-io/core'
import { HelixBaseCodeBlock } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './code-block-root.css.js'
import '../../copy-button/index.js'

/**
 * @summary A block of code, with somewhere to put its name and a way to take it.
 *
 * @description
 * The header sits above the code rather than floating on it. Overlaid, which is
 * the usual build, the copy button covers the first line, which is the one line
 * of a snippet a reader is most likely to be reading.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @documentation https://helix.fusion.dev/components/code-block
 *
 * @cssproperty --code-block-background - The ground behind the code, for a block that is not on the page.
 */
@customElement('helix-code-block')
export class HelixCodeBlock extends HelixBaseCodeBlock {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-code-block': HelixCodeBlock
  }
}
