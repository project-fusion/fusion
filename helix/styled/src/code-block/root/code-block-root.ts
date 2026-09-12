import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCodeBlock } from '@fusion.dev/helix-headless/code-block'
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
 * A diff is drawn a block per file in the same frame, each changed line washed
 * in its tone at Tag's resting strength with its `+` or `-` in the tone's ink,
 * so the change does not rest on telling two pale grounds apart. A split diff
 * stacks its two versions below about 40rem of the file's own width.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @documentation https://helix.fusion.dev/components/code-block
 *
 * @cssproperty --code-block-backdrop - A filter over what shows through the block and its header, for a translucent ground.
 * @cssproperty --code-block-background-color - The ground behind the code, for a block that is not on the page.
 * @cssproperty --code-block-border-color - The line around the block and its header.
 * @cssproperty --code-block-header-background-color - The ground behind the name, where it should not be `surface-raised`.
 * @cssproperty --code-block-radius - The corner on the header's top and the block's bottom, which are one shape.
 */
@customElement('helix-code-block')
export class HelixCodeBlock extends HelixHeadlessCodeBlock {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-code-block': HelixCodeBlock
  }
}
