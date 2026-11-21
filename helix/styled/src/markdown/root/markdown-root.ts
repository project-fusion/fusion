import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMarkdown } from '@fusion.dev/helix-headless/markdown'
import type { CSSResultGroup } from 'lit'
import '../../callout/index.js'
import '../../checkbox/index.js'
import '../../code-block/index.js'
import { styles } from './markdown-root.css.js'

/**
 * @summary Markdown drawn as a document, which streams in place as a reply arrives.
 *
 * @description
 * The document is drawn by the page's prose recipe, from
 * `@fusion.dev/helix-styles`. A fence is drawn by `Code Block` and an alert by
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
 * @use A reply that arrives as Markdown while you watch, such as an agent's answer.
 * @use Markdown you already have, such as a README, drawn as a document.
 * @instead text - A heading or a paragraph you write in your own markup.
 * @instead editor - A document you write and edit in place.
 * @instead chat - A conversation's turns in one scrolling transcript.
 * @practice Set `text` to everything a reply has said so far, with `streaming` while more is coming. - Each time `text` grows, only what changed is drawn.
 * @practice Put `data-prose` on the element or on a container. - The page's prose recipe then sets the document's type, spacing, lists, and tables.
 * @practice On a server, render `markdownToHtml(text)` inside the element. - The element keeps markup that matches what it would draw, and draws nothing again.
 * @documentation https://fusion.dev/design/components/markdown
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
