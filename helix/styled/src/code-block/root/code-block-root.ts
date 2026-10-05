import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCodeBlock } from '@fusion.dev/helix-headless/code-block'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './code-block-root.css.js'
import '../../copy-button/index.js'

/**
 * @summary A block of code with an optional name and a copy button.
 *
 * @description
 * The header sits above the code with the copy button at its end, so the button
 * never covers the first line. A block with no name has no header. The button
 * then sits beside the code in space the block keeps clear: an end gutter for
 * code, and a band above the first hunk for a diff.
 *
 * A diff draws one block per file in the same frame. Each changed line is
 * tinted in its tone at Tag's resting strength, with its `+` or `-` in the
 * tone's ink color, so you can see the change without comparing two pale
 * backgrounds. A split diff stacks its two versions when the file is narrower
 * than about 40rem.
 *
 * Long lines scroll by default. Set `wrap` to wrap them instead, for prose-like
 * code such as a long command, and set `--code-block-max-block-size` to cap the
 * height of a long file, which then scrolls.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @documentation https://fusion.dev/helix/components/code-block
 *
 * @cssproperty --code-block-backdrop - A backdrop filter for the block and its header, for a translucent background.
 * @cssproperty --code-block-background-color - The background behind the code. Set it for a block that sits on a surface other than the page background.
 * @cssproperty --code-block-border-color - The line around the block and its header.
 * @cssproperty --code-block-expand-color - The color of the button under a capped block that shows every line.
 * @cssproperty --code-block-gutter-color - The color of the line numbers.
 * @cssproperty --code-block-header-background-color - The background behind the name. The default is `surface-raised`.
 * @cssproperty --code-block-max-block-size - The tallest the code grows before it scrolls, or until `expandable`'s button shows every line. The default is no limit.
 * @cssproperty --code-block-radius - The corner radius of the header's top and the block's bottom, which form one shape.
 */
@customElement('helix-code-block')
export class HelixCodeBlock extends HelixHeadlessCodeBlock {
  static override tier = 'helix-'

  /**
   * Whether long lines wrap.
   *
   * Off by default, so long lines scroll, because a line break can be
   * significant in code and a wrapped line reads as two. For prose-like code, such as a long command or
   * a log line, a wrap reads better than a scroll. Line numbers keep the lines
   * unwrapped, since a wrapped line would take one number and several rows.
   */
  @property({ reflect: true, type: Boolean })
  wrap = false

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-code-block': HelixCodeBlock
  }
}
