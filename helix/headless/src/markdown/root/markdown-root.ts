import { customElement, HelixElement, words } from '@fusion.dev/helix-core'
import { type CSSResultGroup, css, html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import '../../callout/index.js'
import '../../code-block/index.js'
import { MarkdownWriter } from '../writer.js'

/**
 * @summary Markdown drawn as a document, which streams in place as a reply arrives.
 *
 * @description
 * Set `text` to the Markdown, or to everything a reply has said so far, with
 * `streaming` while more is coming. Each time `text` grows, only what changed
 * is drawn: a block that has ended is never drawn again, a word arriving is
 * added to the line it ends, and a code block, a list, or a table fills in
 * where it stands. Text you can already read does not move.
 *
 * - A fence becomes a `Code Block`, with its language as its `label` and its
 *   `language`, so a highlighter given to `registerHighlighter` colors it as it
 *   grows.
 * - An alert, `> [!NOTE]` through `> [!CAUTION]`, becomes a `Callout` in the
 *   tone `rehypeHelix` gives it.
 * - A table's columns are sized once from its header row, so the rows that
 *   follow never widen or narrow them.
 * - A list item's first paragraph is drawn the same whether the list is tight
 *   or loose, so a blank line arriving between items moves nothing.
 *
 * While `streaming`, the end of the text is read as still arriving. A `**`
 * whose closing pair has not come yet draws bold at once, a code span draws as
 * code, and a link draws as a link before its address arrives. A marker that
 * the next character decides, such as a `#` at the start of a line, waits for
 * that character.
 *
 * **The document is drawn in the element's own children**, so the page's
 * `data-prose` styles reach it, a reader can select and find its text, and a
 * server can send it. Put `data-prose` on the element or on a container. On a
 * server, render `markdownToHtml(text)` inside the element: where what it was
 * sent is exactly what it would draw, it keeps it and draws nothing again.
 *
 * What it reads is CommonMark with GitHub's tables, task lists,
 * strikethrough, autolinks, and alerts. A line of `===` or `---` under a
 * paragraph is not a heading, four spaces of indent are not a code block, and
 * reference links are not read, because each of those changes text above it
 * after it was drawn. HTML is drawn as text. An image is drawn as a link to the
 * picture, which loads nothing until a reader follows it. A link's address is
 * kept only where it is relative or on `http`, `https`, `mailto`, or `tel`.
 *
 * @since 0.215.0
 * @status experimental
 * @category typography
 * @aliases Markdown renderer, Streaming text, Rich text
 * @documentation https://fusion.dev/helix/components/markdown
 *
 * @slot - The drawn document. Written by the element; leave it empty, or fill it with `markdownToHtml(text)` on a server.
 *
 * @cssstate streaming - While `streaming` is set and more text is expected.
 */
@customElement('helix-headless-markdown')
export class HelixHeadlessMarkdown extends HelixElement {
  /* A document is a block, with no stylesheet from the page. */
  static override styles: CSSResultGroup = css`
    :host {
      display: block;
    }
  `

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-markdown': { noteHeading: 'Hinweis' } })`.
   */
  static words = 'helix-markdown'

  /** The heading of a `> [!CAUTION]` alert. */
  @words
  @property({ attribute: 'caution-heading' })
  cautionHeading = 'Caution'

  /** The heading of a `> [!IMPORTANT]` alert. */
  @words
  @property({ attribute: 'important-heading' })
  importantHeading = 'Important'

  /** The heading of a `> [!NOTE]` alert. */
  @words
  @property({ attribute: 'note-heading' })
  noteHeading = 'Note'

  /**
   * Whether more text is coming. While it is set, the end of `text` is read
   * as a block still arriving, and the element is busy to assistive
   * technology. Clear it when the reply ends, and the last block is read as
   * finished.
   */
  @property({ type: Boolean })
  streaming = false

  /**
   * The Markdown. Set it to the whole reply so far each time more arrives: a
   * text that starts with the one before is drawn by its new end alone.
   */
  @property()
  text = ''

  /** The heading of a `> [!TIP]` alert. */
  @words
  @property({ attribute: 'tip-heading' })
  tipHeading = 'Tip'

  /** The heading of a `> [!WARNING]` alert. */
  @words
  @property({ attribute: 'warning-heading' })
  warningHeading = 'Warning'

  private writer: MarkdownWriter | undefined

  /**
   * Adds text to the end of the document, as a chunk of a stream arrives.
   * The same as setting `text` to the text so far.
   */
  appendText(chunk: string): void {
    this.text += chunk
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaBusy = this.streaming ? 'true' : null
    this.toggleState('streaming', this.streaming)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const tier = (this.constructor as typeof HelixElement).tier
    const options = {
      headings: {
        caution: this.cautionHeading,
        important: this.importantHeading,
        note: this.noteHeading,
        tip: this.tipHeading,
        warning: this.warningHeading,
      },
      tags: { callout: `${tier}callout`, codeBlock: `${tier}code-block` },
    }
    if (!this.writer) {
      this.writer = new MarkdownWriter(this, options)
    } else if (
      ['cautionHeading', 'importantHeading', 'noteHeading', 'tipHeading', 'warningHeading'].some(
        (name) => changed.has(name),
      )
    ) {
      this.writer.configure(options)
    }
    if (changed.has('text') || changed.has('streaming')) {
      this.writer.write(this.text, !this.streaming)
    }
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-markdown': HelixHeadlessMarkdown
  }
}
