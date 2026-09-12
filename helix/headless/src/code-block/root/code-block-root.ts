import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import '../../copy-button/index.js'
import { type DiffFile, type DiffHunk, type DiffLine, pairLines, parsePatch } from '../patch.js'

/**
 * @summary A block of code, with somewhere to put its name and a way to take it.
 *
 * @description
 * **`<pre><code>` and nothing cleverer.** The pair is what the platform means
 * by a block of code: `pre` keeps the whitespace, `code` says what the
 * whitespace is for, and losing either one loses something no styling puts
 * back. Indentation in a `div` is a paragraph with odd spacing.
 *
 * **It scrolls rather than wraps.** A wrapped line of code is a lie about where
 * the line ends, and in a language where a line break can be significant it is
 * a lie that costs someone an afternoon. The box takes its own scrollbar.
 *
 * **The copy button is here because the alternative is selecting it by hand.**
 * Every consumer would otherwise put one there, slightly differently, and the
 * one that forgot would be the one with the longest snippet. It is on unless
 * `no-copy` says otherwise, and takes its text from the slot rather than from a
 * property, so there is no second copy of the code to keep in step.
 *
 * A `Code` for a fragment inside a sentence. Separate families, because one
 * flows with prose and the other is a figure.
 *
 * **`diff` reads the code as a change.** The content is then a unified diff,
 * what `git diff` and `diff -u` write, in the same slot ordinary code goes in,
 * and it is drawn as the lines it added and removed. The block reads a diff and
 * never computes one, so the algorithm stays wherever the two versions are.
 * Numbers come from the hunk headers, which makes them the file's; changed lines
 * are `<ins>` and `<del>` with the `+` and `-` kept as text, so the change is not
 * carried by color; the numbers are hidden from the accessibility tree. Each
 * file in the patch is a block of its own under its own name, and its copy
 * button takes the file as it now reads. `variant="split"` sets the old version
 * beside the new, each removal opposite its replacement.
 *
 * **Before the script runs, a diff is its own text.** A server has no children
 * to read, so it renders the slot as ordinary code, which for a diff is the
 * patch in a `<pre>`: a legible diff, and the first render the client makes
 * too, which is what keeps hydration clean. The drawn diff replaces it once the
 * content can be read. Diff mode is experimental while the rest of the family
 * is stable.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Code block, Snippet, Pre
 * @documentation https://helix.fusion.dev/components/code-block
 *
 * @slot - The code.
 *
 * @csspart added - In a diff, a line only the new version has, an `<ins>`.
 * @csspart block - The scrolling `<pre>`.
 * @csspart code - The `<code>` inside it.
 * @csspart context - In a diff, a line both versions share.
 * @csspart copy - The copy button.
 * @csspart copy-button - The inner button.
 * @csspart copy-mark - The clipboard glyph, and the confirmation that replaces it.
 * @csspart copy-tooltip - The bubble, forwarded from the tooltip inside.
 * @csspart copy-tooltip-arrow - The point, resting against the trigger.
 * @csspart file - In a diff, one file's header and block.
 * @csspart filler - In a split diff, the empty row opposite a line the other side does not have.
 * @csspart frame - The code and the copy button beside it.
 * @csspart header - The bar carrying the name, where there is one.
 * @csspart hunk - In a diff, a `@@` line saying where the lines under it are.
 * @csspart label - The file name or language, where one is given.
 * @csspart marker - In a diff, the `+`, `-` or space that opens a line.
 * @csspart new - In a split diff, the new version's `<pre>`.
 * @csspart number - In a diff, a line number.
 * @csspart old - In a split diff, the old version's `<pre>`.
 * @csspart removed - In a diff, a line only the old version has, a `<del>`.
 * @csspart split - In a split diff, the two versions side by side.
 * @csspart text - In a diff, a line's code.
 */
@customElement('helix-headless-code-block')
export class HelixHeadlessCodeBlock extends HelixElement {
  /**
   * Whether the content is a unified diff, drawn as the lines it changed.
   *
   * Reflected, because the stylesheet paints a diff differently from code, and
   * `false` reflects as no attribute at all.
   */
  @property({ reflect: true, type: Boolean })
  diff = false

  /**
   * What to call this block, usually a file name or a language.
   *
   * In a diff, each file is named from the patch, and this names a patch that
   * carries no name of its own.
   */
  @property()
  label = ''

  /**
   * Whether to leave the copy button off.
   *
   * Negative, which is not a style choice. A boolean attribute is true whenever
   * it is *present*, so a `copyable` defaulting to true could never be turned
   * off from markup: `copyable="false"` is the string "false", which is
   * present, which is true. Measured, and it is why this is named the other way
   * round. The platform already writes booleans like this for the same reason,
   * `novalidate` and `nomodule` and `noreferrer` among them.
   *
   * **Reflected, because the gutter is a stylesheet rule.** `code-block.css`
   * reserves the copy button's width with `:host(:not([no-copy]))`, so the
   * attribute is what decides whether the block pays for a control. Unreflected,
   * setting it from script takes the button away (`render` reads the property)
   * and leaves the 40px it stood in reserved.
   *
   * A false boolean reflects as the attribute's absence, so this costs no
   * `no-copy=""` on hosts that never asked for one, and the rule about a
   * reflected property taking no default is satisfied by the default being
   * `false`.
   */
  @property({ attribute: 'no-copy', reflect: true, type: Boolean })
  noCopy = false

  /**
   * How a diff's two versions are arranged; nothing without `diff`.
   *
   * Absent is unified, each removal above its replacement, which fits any
   * width. `split` sets the old version beside the new one. Optional rather
   * than defaulted, so the host carries no attribute the consumer did not write.
   */
  @property({ reflect: true })
  variant?: 'split'

  /** The last text read as a diff, and what it read as, so a render does not parse twice. */
  private parsed: { files: DiffFile[]; text: string } = { files: [], text: '' }

  /** The files in the content, when it is a diff and it can be read yet. */
  private get files(): DiffFile[] {
    if (!this.diff) {
      return []
    }
    const text = this.text
    if (text !== this.parsed.text) {
      this.parsed = { files: parsePatch(text), text }
    }
    return this.parsed.files
  }

  /**
   * The code as text, read from what the default slot is given rather than
   * stored.
   *
   * **The host's own children rather than the slot's assigned nodes**, which
   * are the same nodes: text, and every element without a `slot`. A slot exists
   * only once a render has made it, so reading through one left the first render
   * with nothing to copy.
   *
   * Client only, and it has to be: the server has no children to read. The
   * copy button is a client-side affordance anyway, so nothing is lost, and
   * taking the text from a property instead would be a second copy of the code
   * that goes stale the moment the slot changes. Empty while hydrating what a
   * server sent, which rendered it empty.
   */
  private get text(): string {
    if (this.hydrating) {
      return ''
    }
    return [...(this.childNodes ?? [])]
      .filter(
        (node) =>
          node.nodeType === Node.TEXT_NODE ||
          (node.nodeType === Node.ELEMENT_NODE && (node as Element).slot === ''),
      )
      .map((node) => node.textContent ?? '')
      .join('')
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override render(): TemplateResult {
    const files = this.files
    if (files.length > 0) {
      return this.renderDiff(files)
    }
    /* The copy button sits beside the code, not in a bar above it. In the
       header, a block with nothing to call itself still draws a full-width bar
       to hold one button, so a `Usage` section of one-line imports is a run of
       empty strips. Beside the code, the header exists only when there is a
       name to put in it. */
    return html`${
      this.label ? html`<div part="header"><span part="label">${this.label}</span></div>` : nothing
    }
      <div part="frame">
        <pre part="block"><code part="code"><slot @slotchange=${() =>
          this.requestUpdate()}></slot></code></pre>
        ${this.noCopy ? nothing : this.renderCopyButton()}
      </div>`
  }

  /**
   * The button that takes the code, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own
   * copy control, wrap this one, or pass it something the base does not know
   * about, without reimplementing the whole template to do it. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * base button, and a styled subclass that sets `tier` renders the styled one
   * from the same template.
   */
  protected renderCopyButton(value: string = this.text): TemplateResult {
    return html`<${this.tag('copy-button')}
      part="copy"
      exportparts="button: copy-button, mark: copy-mark, tooltip: copy-tooltip,
        tooltip-arrow: copy-tooltip-arrow"
      label="Copy code"
      .value=${value}
    ></${this.tag('copy-button')}>`
  }

  /** A number padded to the widest in its file, so the columns line up as text. */
  private renderNumber(value: number | undefined, width: number): TemplateResult {
    return html`<span part="number" aria-hidden="true">${String(value ?? '').padStart(width)} </span>`
  }

  private renderLine(line: DiffLine, width: number, side?: 'new' | 'old'): TemplateResult {
    const numbers = side
      ? this.renderNumber(side === 'old' ? line.old : line.new, width)
      : html`${this.renderNumber(line.old, width)}${this.renderNumber(line.new, width)}`
    const text = html`<span part="text">${line.text}\n</span>`
    if (line.kind === 'added') {
      return html`<ins part="added">${numbers}<span part="marker">+</span>${text}</ins>`
    }
    if (line.kind === 'removed') {
      return html`<del part="removed">${numbers}<span part="marker">-</span>${text}</del>`
    }
    return html`<span part="context">${numbers}<span part="marker"> </span>${text}</span>`
  }

  private renderHunk(hunk: DiffHunk, hidden = false): TemplateResult {
    return html`<span part="hunk" aria-hidden=${hidden ? 'true' : nothing}>${hunk.header}\n</span>`
  }

  /**
   * The old version beside the new one, row for row.
   *
   * The new side's hunk headers are hidden from the accessibility tree, being
   * the old side's text again and there only to keep the rows level.
   */
  private renderSplit(file: DiffFile, width: number): TemplateResult {
    const hunks = file.hunks.map((hunk) => ({ hunk, rows: pairLines(hunk.lines) }))
    const filler = html`<span part="filler" aria-hidden="true">\n</span>`
    return html`<div part="split">
      <pre part="old"><code part="code">${hunks.map(
        ({ hunk, rows }) =>
          html`${this.renderHunk(hunk)}${rows.map(({ left }) =>
            left ? this.renderLine(left, width, 'old') : filler,
          )}`,
      )}</code></pre>
      <pre part="new"><code part="code">${hunks.map(
        ({ hunk, rows }) =>
          html`${this.renderHunk(hunk, true)}${rows.map(({ right }) =>
            right ? this.renderLine(right, width, 'new') : filler,
          )}`,
      )}</code></pre>
    </div>`
  }

  /**
   * Each file as a block of its own, the way one block of code is drawn.
   *
   * The slot stays in the tree, hidden, because it is still where the content
   * comes from: a diff edited later arrives by `slotchange` like any other.
   */
  private renderDiff(files: DiffFile[]): TemplateResult {
    return html`${files.map((file) => {
      const name = file.name || this.label
      const widest = Math.max(
        0,
        ...file.hunks.flatMap((hunk) =>
          hunk.lines.map((line) => Math.max(line.old ?? 0, line.new ?? 0)),
        ),
      )
      const width = String(widest).length
      /* What the file reads as now, which is what a reader copying from a review
         takes away: every line but the removed ones. */
      const now = file.hunks
        .flatMap((hunk) => hunk.lines.filter((line) => line.kind !== 'removed'))
        .map((line) => line.text)
        .join('\n')
      return html`<div part="file">
        ${name ? html`<div part="header"><span part="label">${name}</span></div>` : nothing}
        <div part="frame">
          ${
            this.variant === 'split'
              ? this.renderSplit(file, width)
              : html`<pre part="block"><code part="code">${file.hunks.map(
                  (hunk) =>
                    html`${this.renderHunk(hunk)}${hunk.lines.map((line) => this.renderLine(line, width))}`,
                )}</code></pre>`
          }
          ${this.noCopy ? nothing : this.renderCopyButton(now)}
        </div>
      </div>`
    })}<slot hidden @slotchange=${() => this.requestUpdate()}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-code-block': HelixHeadlessCodeBlock
  }
}
