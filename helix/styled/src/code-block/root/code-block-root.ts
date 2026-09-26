import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCodeBlock } from '@fusion.dev/helix-headless/code-block'
import type { CSSResultGroup } from 'lit'
import { styles } from './code-block-root.css.js'
import '../../copy-button/index.js'

/**
 * @summary A block of code with an optional name and a copy button.
 *
 * @description
 * The header sits above the code rather than floating on it, and the copy
 * button stands at its end. Overlaid, which is the usual build, the button
 * covers the first line, which is the one line of a snippet a reader is most
 * likely to be reading. A block with no name has no header, and the button
 * stands beside the code in room the block keeps clear: an end gutter for code,
 * a band above the first hunk for a diff.
 *
 * A diff is drawn a block per file in the same frame, each changed line washed
 * in its tone at Tag's resting strength with its `+` or `-` in the tone's ink,
 * so the change does not rest on telling two pale grounds apart. A split diff
 * stacks its two versions below about 40rem of the file's own width.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @documentation https://fusion.dev/helix/components/code-block
 *
 * @cssproperty --code-block-backdrop - A backdrop filter for the block and its header, for a translucent background.
 * @cssproperty --code-block-background-color - The background behind the code. Set it for a block that sits on a surface other than the page background.
 * @cssproperty --code-block-border-color - The line around the block and its header.
 * @cssproperty --code-block-header-background-color - The background behind the name. The default is `surface-raised`.
 * @cssproperty --code-block-radius - The corner radius of the header's top and the block's bottom, which form one shape.
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
