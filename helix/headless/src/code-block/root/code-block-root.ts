import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { html } from 'lit/static-html.js'
import '../../copy-button/index.js'
import { highlightedLines } from '../highlight.js'
import { gutterNumbers, lineCount } from '../lines.js'
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
 * Set `line-numbers` to number the lines in a gutter beside the code, hidden
 * from the accessibility tree and left out of a copy. Set `highlight` to a
 * function that turns the code into highlighted markup, such as one wrapping
 * Shiki or Prism, and the block draws what it returns; the code stays in the
 * slot, so the copy button and the page's own text are the code as written.
 *
 * Set `expandable` on a block whose height is capped, such as by
 * `--code-block-max-block-size`, and a button under it shows every line and
 * then fewer again, as a docs site's long example does. The button is drawn
 * only while the cap hides something, says whether the block is expanded, and
 * the block carries `:state(expanded)` while it is.
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
 * @csspart copy-live - The copy button's live region, which speaks while the button is pending.
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
 * @csspart expand - The button under a capped block that shows every line, and fewer again. Drawn when `expandable` is set and the cap hides something.
 * @csspart file - In a diff, one file's header and block.
 * @csspart filler - In a split diff, the empty row opposite a line the other side does not have.
 * @csspart frame - The code, and the copy button beside it where there is no header.
 * @csspart gutter - The line numbers beside the code, shown when `line-numbers` is set.
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
 *
 * @cssstate expanded - The expand button has shown every line of a capped block.
 */
@customElement('helix-headless-code-block')
export class HelixHeadlessCodeBlock extends HelixElement {
  /**
   * The expand button's words while the block shows every line.
   */
  @property({ attribute: 'collapse-label' })
  collapseLabel = 'Show fewer lines'

  /**
   * The copy button's name and tooltip text after a copy.
   */
  @property({ attribute: 'copied-label' })
  copiedLabel = 'Copied'

  /**
   * The copy button's name and tooltip text before a copy.
   *
   * Where the block has a name, the button says it too, such as "Copy code,
   * app.ts", so each copy button on a page with several blocks is told apart.
   * In a diff, that is each file's own name.
   */
  @property({ attribute: 'copy-label' })
  copyLabel = 'Copy code'

  /**
   * Whether the content is a unified diff, drawn as the lines it changed.
   *
   * Reflected, because the stylesheet paints a diff differently from code, and
   * `false` reflects as no attribute at all.
   */
  @property({ reflect: true, type: Boolean })
  diff = false

  /**
   * Whether a block whose height is capped takes a button that shows every
   * line, and fewer again.
   *
   * The cap is the page's, `--code-block-max-block-size` on the styled tier;
   * the button is drawn only while the cap hides something, measured as the
   * block lays out. Not for a diff, whose files each scroll on their own.
   */
  @property({ type: Boolean })
  expandable = false

  /**
   * The expand button's words while the cap hides lines.
   */
  @property({ attribute: 'expand-label' })
  expandLabel = 'Show all lines'

  /**
   * Turns the code into highlighted markup, which the block draws in place of
   * the plain text.
   *
   * Called with the code as written and returning HTML, such as the output of
   * Shiki's `codeToHtml` or Prism's `highlight`. **The markup is drawn as
   * given**, so it has to escape the code it was handed, which those
   * highlighters do. A `<pre>` and `<code>` around the whole of it, which
   * Shiki writes, are taken off, so the lines sit level with the gutter's
   * numbers and the block keeps one tab stop. Bind the language in the function you pass. The code
   * stays in the slot, so the copy button copies it as written and a reader
   * without the script still has it. Not called on a server, which has no code
   * to read, nor for a diff.
   */
  @property({ attribute: false })
  highlight?: (code: string) => string

  /**
   * The block's name, usually a file name or a language.
   *
   * In a diff, each file is named from the patch, and this names a patch that
   * carries no name of its own.
   */
  @property()
  label = ''

  /**
   * Whether the lines are numbered in a gutter beside the code.
   *
   * The numbers are hidden from the accessibility tree and are not part of a
   * copy, which takes the code alone. Reflected, because the stylesheet lays
   * the gutter out beside the code. A diff numbers its lines from its hunks
   * whether or not this is set.
   */
  @property({ attribute: 'line-numbers', reflect: true, type: Boolean })
  lineNumbers = false

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

  /**
   * Watches the code for edits that change no slot assignment.
   *
   * A framework updating one string child writes the text node's data in
   * place, which React does, and that fires no `slotchange`. The block showed
   * the new code while its button copied the old, and a diff edited that way
   * was not redrawn.
   */
  private observer: MutationObserver | undefined

  /** Whether the cap hides lines, measured from the drawn block. */
  @state()
  private capped = false

  /** Whether the expand button has shown every line. */
  @state()
  private expanded = false

  /** Watches the drawn code's size, while the block is expandable. */
  private sizes: ResizeObserver | undefined

  /**
   * Reads whether the cap hides lines: the scroller is taller inside than it
   * is drawn. The styled tier caps the `<code>`, and a page may cap the
   * `<pre>`, so both are asked. Not while expanded, which shows everything.
   */
  private readonly measure = (): void => {
    if (this.expanded) {
      return
    }
    const boxes = [
      ...(this.renderRoot?.querySelectorAll<HTMLElement>('[part="block"], [part="code"]') ?? []),
    ]
    this.capped = boxes.some((box) => box.scrollHeight > box.clientHeight + 1)
  }

  /* Measured after each render, and again whenever the drawn code changes
     size, which a font arriving or a narrower page does with no render. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (!this.expandable || this.diff || typeof ResizeObserver === 'undefined') {
      this.sizes?.disconnect()
      this.sizes = undefined
      this.capped = false
      return
    }
    this.sizes ??= new ResizeObserver(this.measure)
    this.sizes.disconnect()
    for (const box of this.renderRoot.querySelectorAll('[part="block"], [part="code"]')) {
      this.sizes.observe(box)
    }
    this.measure()
  }

  private toggleExpanded(): void {
    this.expanded = !this.expanded
    this.toggleState('expanded', this.expanded)
    if (!this.expanded) {
      this.updateComplete.then(this.measure)
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (typeof MutationObserver !== 'undefined') {
      this.observer ??= new MutationObserver(() => this.requestUpdate())
      this.observer.observe(this, { characterData: true, childList: true, subtree: true })
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.sizes?.disconnect()
    this.sizes = undefined
    this.observer?.disconnect()
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
    const text = this.text
    const highlighted =
      this.highlight && text !== '' ? highlightedLines(this.highlight(text)) : undefined
    /* The slot stays either way, hidden under highlighted markup, so a change
       to the code still reaches `slotchange` and the code stays the page's. */
    const code =
      highlighted === undefined
        ? html`<code part="code"><slot @slotchange=${() => this.requestUpdate()}></slot></code>`
        : html`<code part="code">${unsafeHTML(highlighted)}</code><slot
              hidden
              @slotchange=${() => this.requestUpdate()}
            ></slot>`
    /* Inside the `<pre>`, so the numbers are set in the code's own face and
       line height and stay level with its lines.

       **No lines renders `nothing`.** A server has no code to count, and an
       empty string serves no text node between the part's markers. Hydration
       then remembers the string as written, and the numbers the next render
       brings are written into the closing marker, a comment, so a served
       gutter stayed empty for good. `nothing` makes that render insert the
       text. */
    const lines = lineCount(text)
    const gutter = this.lineNumbers
      ? html`<span part="gutter" aria-hidden="true">${lines === 0 ? nothing : gutterNumbers(lines)}</span>`
      : nothing
    return html`${this.renderHeader(this.label)}
      <div part="frame">
        <pre part="block">${gutter}${code}</pre>
        ${this.label ? nothing : this.renderCopy()}
      </div>${this.renderExpand()}`
  }

  /**
   * The button that shows every line of a capped block, and fewer again, or
   * nothing while the cap hides nothing. Not on a server, which cannot
   * measure, so a served block draws none and the client adds it.
   */
  private renderExpand(): TemplateResult | typeof nothing {
    if (!this.expandable || !(this.capped || this.expanded)) {
      return nothing
    }
    return html`<button
      aria-expanded=${this.expanded ? 'true' : 'false'}
      part="expand"
      type="button"
      @click=${() => this.toggleExpanded()}
    >
      ${this.expanded ? this.collapseLabel : this.expandLabel}
    </button>`
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
      ? html`<div part="header"><span part="label">${name}</span>${this.renderCopy(value, name)}</div>`
      : nothing
  }

  private renderCopy(value?: string, name?: string): TemplateResult | typeof nothing {
    return this.noCopy ? nothing : this.renderCopyButton(value, name)
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
   *
   * @param value The text the button copies.
   * @param name The name of what it copies, which its label carries.
   */
  protected renderCopyButton(value: string = this.text, name = this.label): TemplateResult {
    return html`<${this.tag('copy-button')}
      part="copy"
      exportparts="button: copy-button, text: copy-text, mark: copy-mark, live: copy-live, tooltip: copy-tooltip,
        tooltip-arrow: copy-tooltip-arrow, tooltip-arrow-bottom: copy-tooltip-arrow-bottom,
        tooltip-arrow-left: copy-tooltip-arrow-left, tooltip-arrow-right: copy-tooltip-arrow-right,
        tooltip-arrow-top: copy-tooltip-arrow-top, tooltip-bottom: copy-tooltip-bottom,
        tooltip-left: copy-tooltip-left, tooltip-right: copy-tooltip-right, tooltip-top: copy-tooltip-top"
      copied-label=${this.copiedLabel}
      label=${name ? `${this.copyLabel}, ${name}` : this.copyLabel}
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
