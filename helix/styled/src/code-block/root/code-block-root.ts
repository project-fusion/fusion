import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCodeBlock } from '@fusion.dev/helix-headless/code-block'
import type { CSSResultGroup } from 'lit'
import { styles } from './code-block-root.generated.css.js'
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
 * height of a long file, which then scrolls. A line `mark-lines` names takes a
 * band in the primary color, with an edge at its start.
 *
 * **To color code with no highlighter of your own**, install
 * `@fusion.dev/helix-sandbox` and import its `code-block` entry beside the
 * block's. It registers a highlighter for every block, which reads `css`,
 * `html`, `js`, `jsx`, `sh`, `ts` and `tsx`, and names such as `typescript`
 * and `bash`, with Lezer's grammars. It colors them as the sandbox's editor
 * does, from the `--helix-color-syntax-*` tokens:
 *
 * ```js
 * import '@fusion.dev/helix/code-block'
 * import '@fusion.dev/helix-sandbox/code-block'
 * ```
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Code block, Snippet, Pre
 * @documentation https://fusion.dev/helix/components/code-block
 *
 * @cssproperty --code-block-added-color - The color a diff's added lines are tinted in and their `+` is drawn in. The success color by default.
 * @cssproperty --code-block-backdrop - A backdrop filter for the block and its header, for a translucent background.
 * @cssproperty --code-block-background-color - The background behind the code. Set it for a block that sits on a surface other than the page background.
 * @cssproperty --code-block-border-color - The line around the block and its header.
 * @cssproperty --code-block-color - The color of the code. A highlighter's own colors win on the tokens it colors.
 * @cssproperty --code-block-expand-color - The color of the button under a capped block that shows every line.
 * @cssproperty --code-block-font-family - The typeface of the code and its line numbers. The mono face by default.
 * @cssproperty --code-block-font-size - The size of the code and its line numbers.
 * @cssproperty --code-block-gutter-color - The color of the line numbers.
 * @cssproperty --code-block-header-background-color - The background behind the name. The default is `surface-raised`.
 * @cssproperty --code-block-label-color - The color of the name in the header.
 * @cssproperty --code-block-line-height - The line height of the code and its line numbers, as a number or a length.
 * @cssproperty --code-block-mark-color - The band behind the lines `mark-lines` names. The primary color at a wash by default.
 * @cssproperty --code-block-mark-edge-color - The edge at the start of a band behind marked lines. The primary color by default.
 * @cssproperty --code-block-max-block-size - The tallest the code grows before it scrolls, or until `expandable`'s button shows every line. The default is no limit.
 * @cssproperty --code-block-radius - The corner radius of the header's top and the block's bottom, which form one shape.
 * @cssproperty --code-block-removed-color - The color a diff's removed lines are tinted in and their `-` is drawn in. The danger color by default.
 *
 * @replaces pre
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
