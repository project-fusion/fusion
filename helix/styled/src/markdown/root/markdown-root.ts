import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMarkdown } from '@fusion.dev/helix-headless/markdown'
import type { CSSResultGroup } from 'lit'
import '../../callout/index.js'
import '../../code-block/index.js'
import { styles } from './markdown-root.css.js'

/**
 * @summary Markdown drawn as a document, which streams in place as a reply arrives.
 *
 * @description
 * The document is drawn by the page's prose recipe: put `data-prose` on the
 * element or on a container, and `@fusion.dev/helix-styles` sets its type,
 * spacing, lists, and tables. A fence is drawn by `Code Block` and an alert by
 * `Callout`, in this tier.
 *
 * While `streaming`, the block still arriving wraps its lines in the plain
 * way, never `pretty` or `balance`, since those move earlier line breaks as
 * each word arrives.
 *
 * @since 0.216.0
 * @status experimental
 * @category typography
 * @aliases Markdown renderer, Streaming text, Rich text
 * @documentation https://fusion.dev/helix/components/markdown
 */
@customElement('helix-markdown')
export class HelixMarkdown extends HelixHeadlessMarkdown {
  static override styles: CSSResultGroup = styles

  static override tier = 'helix-'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-markdown': HelixMarkdown
  }
}
