import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import '../../copy-button/index.js'
import { type DiffFile, type DiffHunk, type DiffLine, pairLines, parsePatch } from '../patch.js'

/**
 * @summary A block of code with an optional name and a copy button.
 *
 * @description
 * Renders a `<pre><code>` pair: `pre` keeps the whitespace, and `code` marks it
 * as code. Long lines scroll inside the block and do not wrap, because a line
 * break can be significant in code.
 *
 * A copy button is on by default. Set `no-copy` to remove it. The button copies
 * the slotted text, so there is no second copy of the code to keep in sync.
 *
 * For a fragment of code inside a sentence, use `Code`.
 *
 * Set `diff` to show a change. Put a unified diff, the output of `git diff` or
 * `diff -u`, in the same slot, and the block draws the lines it added and
 * removed. The block never computes a diff itself. Line numbers come from the
 * hunk headers and are hidden from the accessibility tree. Changed lines are
 * `<ins>` and `<del>` with the `+` and `-` kept as text, so the change does not
 * depend on color. Each file in the patch is its own block under its own name,
 * and its copy button copies the new version of the file. `variant="split"`
 * shows the old version beside the new, each removal opposite its replacement.
 *
 * On the server, the slot renders as ordinary code, so a diff first appears as
 * the patch text in a `<pre>`. The client makes the same first render, which
 * keeps hydration clean, and draws the diff once it can read the content. Diff
 * mode is experimental. The rest of the family is stable.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Code block, Snippet, Pre
 * @documentation https://fusion.dev/helix/components/code-block
 *
 * @slot - The code.
 *
 * @csspart added - In a diff, a line only the new version has, an `<ins>`.
 * @csspart block - The scrolling `<pre>`.
 * @csspart code - The `<code>` inside it.
 * @csspart context - In a diff, a line both versions share.
 * @csspart copy - The copy button. It sits in the header when there is one, and beside the code otherwise.
 * @csspart copy-button - The inner button.
 * @csspart copy-mark - The clipboard icon, and the check mark that replaces it after a copy.
 * @csspart copy-text - The words on that button, trimmed to their capitals and baseline.
 * @csspart copy-tooltip - The copy button's tooltip.
 * @csspart copy-tooltip-arrow - The tooltip's arrow, which points at the copy button.
 * @csspart copy-tooltip-arrow-bottom - The arrow while the tooltip is below the copy button, on the tooltip's top edge. Applied with `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-left - The arrow while the tooltip is left of the copy button, on the tooltip's right edge. Applied with `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-right - The arrow while the tooltip is right of the copy button, on the tooltip's left edge. Applied with `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-top - The arrow while the tooltip is above the copy button, on the tooltip's bottom edge. Applied with `copy-tooltip-arrow`.
 * @csspart copy-tooltip-bottom - The tooltip while it is below the copy button. Applied with `copy-tooltip`.
 * @csspart copy-tooltip-left - The tooltip while it is left of the copy button. Applied with `copy-tooltip`.
 * @csspart copy-tooltip-right - The tooltip while it is right of the copy button. Applied with `copy-tooltip`.
 * @csspart copy-tooltip-top - The tooltip while it is above the copy button. Applied with `copy-tooltip`.
 * @csspart file - In a diff, one file's header and block.
 * @csspart filler - In a split diff, the empty row opposite a line the other side does not have.
 * @csspart frame - The code, and the copy button beside it where there is no header.
 * @csspart header - The bar that holds the name and the copy button, shown when there is a name.
 * @csspart hunk - In a diff, a `@@` line saying where the lines under it are.
 * @csspart label - The file name or language, where one is given.
 * @csspart marker - In a diff, the `+`, `-`, or space that starts a line.
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
   * The block's name, usually a file name or a language.
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
   * **Reflected, because the gutter is a stylesheet rule.** A sheet reserves
   * the copy button's width with `:host(:not([no-copy]))`, so the attribute is
   * what decides whether the block pays for a control. Unreflected, setting it
   * from script takes the button away (`render` reads the property) and leaves
   * the 40px it stood in reserved.
   *
   * A false boolean reflects as the attribute's absence, so this costs no
   * `no-copy=""` on hosts that never asked for one, and the rule about a
   * reflected property taking no default is satisfied by the default being
   * `false`.
   */
  @property({ attribute: 'no-copy', reflect: true, type: Boolean })
  noCopy = false

  /**
   * How a diff's two versions are arranged. It has no effect without `diff`.
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
    return html`${this.renderHeader(this.label)}
      <div part="frame">
        <pre part="block"><code part="code"><slot @slotchange=${() =>
          this.requestUpdate()}></slot></code></pre>
        ${this.label ? nothing : this.renderCopy()}
      </div>`
  }

  /**
   * The name with the copy button beside it, or nothing when there is no name.
   *
   * **The button is in the header wherever there is one**, because beside the
   * code it stands over the block and the block has to make room for it. A
   * diff cannot: its washes run to the edge, so the button stood on the hunk
   * line and the line under it. In the header it is over nothing.
   *
   * **No name draws no header**, rather than a bar to hold one button, which
   * turned a `Usage` section of one-line imports into a run of empty strips.
   * The button then stands beside the code, in room the block keeps for it.
   */
  private renderHeader(name: string, value?: string): TemplateResult | typeof nothing {
    return name
      ? html`<div part="header"><span part="label">${name}</span>${this.renderCopy(value)}</div>`
      : nothing
  }

  private renderCopy(value?: string): TemplateResult | typeof nothing {
    return this.noCopy ? nothing : this.renderCopyButton(value)
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
      exportparts="button: copy-button, text: copy-text, mark: copy-mark, tooltip: copy-tooltip,
        tooltip-arrow: copy-tooltip-arrow, tooltip-arrow-bottom: copy-tooltip-arrow-bottom,
        tooltip-arrow-left: copy-tooltip-arrow-left, tooltip-arrow-right: copy-tooltip-arrow-right,
        tooltip-arrow-top: copy-tooltip-arrow-top, tooltip-bottom: copy-tooltip-bottom,
        tooltip-left: copy-tooltip-left, tooltip-right: copy-tooltip-right, tooltip-top: copy-tooltip-top"
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
        ${this.renderHeader(name, now)}
        <div part="frame">
          ${
            this.variant === 'split'
              ? this.renderSplit(file, width)
              : html`<pre part="block"><code part="code">${file.hunks.map(
                  (hunk) =>
                    html`${this.renderHunk(hunk)}${hunk.lines.map((line) => this.renderLine(line, width))}`,
                )}</code></pre>`
          }
          ${name ? nothing : this.renderCopy(now)}
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
