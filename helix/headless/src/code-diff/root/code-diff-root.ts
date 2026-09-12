import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { type DiffFile, type DiffHunk, type DiffLine, pairLines, parsePatch } from '../patch.js'

/**
 * @summary A change to some code, read as the lines it added and removed.
 *
 * @description
 * Every product that shows code eventually shows two versions of it: a review,
 * a migration preview, a config that drifted, an agent's proposed edit. Two code
 * blocks side by side ask the reader to diff by eye. This takes the diff itself.
 *
 * **It reads a diff and never computes one.** `patch` is a unified diff, the
 * format `git diff` and `diff -u` write and a code host's API returns, so the
 * algorithm and whatever it depends on stay wherever the two versions already
 * are, usually a server. What this owns is reading that text into lines and
 * numbering them from the hunk headers, which makes the numbers the file's.
 *
 * **`<ins>` and `<del>` for the changed lines**, the elements the platform has
 * for exactly this, with the `+` and `-` kept as text beside them. Color alone
 * says nothing to a reader who cannot see it, and `<ins>` is not announced by
 * every screen reader, so the mark is what every reader gets. The numbers are
 * hidden from the accessibility tree: read aloud, every line would open with
 * two of them.
 *
 * **Unified or split is one component with a `variant`**, since the model is
 * the same list of hunks and only the arrangement differs. Split pairs each
 * removed line with the line that replaced it, a longer run standing opposite
 * nothing, and puts the old file and the new one in two blocks.
 *
 * Without a stylesheet it still reads as a diff: the numbers are padded to the
 * widest one in the file and each line ends in a newline inside a `<pre>`, so
 * the unstyled text is the familiar numbered listing.
 *
 * @since 0.1.0
 * @status experimental
 * @category typography
 * @aliases Diff, Code diff, Patch, Changes
 * @documentation https://helix.fusion.dev/components/code-diff
 *
 * @csspart file - One file's changes: its header and its lines.
 * @csspart header - The bar carrying the file's name, where there is one.
 * @csspart label - The file's name.
 * @csspart block - The scrolling `<pre>` of a unified diff.
 * @csspart old - The old file's `<pre>`, in a split diff.
 * @csspart new - The new file's `<pre>`, in a split diff.
 * @csspart split - The two blocks of a split diff.
 * @csspart code - The `<code>` inside each block.
 * @csspart hunk - A `@@` line, saying where the lines under it are.
 * @csspart context - A line both versions share.
 * @csspart added - A line only the new version has, an `<ins>`.
 * @csspart removed - A line only the old version has, a `<del>`.
 * @csspart filler - The empty row opposite a line the other side does not have, in a split diff.
 * @csspart number - A line number.
 * @csspart marker - The `+`, `-` or space that opens a line.
 * @csspart text - The line's code.
 */
@customElement('helix-headless-code-diff')
export class HelixHeadlessCodeDiff extends HelixElement {
  /**
   * A name for a patch that carries none of its own.
   *
   * A patch from `git diff` names its files and those names are shown; a bare
   * hunk has no header to read one from, and this is what goes over it instead.
   */
  @property()
  label = ''

  /**
   * The change, as a unified diff.
   *
   * Several files are read in order, each under its own name. A property as
   * well as an attribute: a patch is usually a string a page already holds,
   * and an attribute is what a server writes.
   */
  @property()
  patch = ''

  /**
   * How the two versions are arranged.
   *
   * Absent is unified, one column with each removal above its replacement,
   * which fits any width. `split` sets the old file beside the new one, which
   * is easier to read across and needs room for both.
   *
   * Optional rather than defaulted, so the host carries no attribute the
   * consumer did not write.
   */
  @property({ reflect: true })
  variant?: 'split'

  private files: DiffFile[] = []

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('patch')) {
      this.files = parsePatch(this.patch)
    }
  }

  /** A number padded to the widest one in its file, so the columns line up as text. */
  private number(value: number | undefined, width: number): TemplateResult {
    return html`<span part="number" aria-hidden="true">${String(value ?? '').padStart(width)} </span>`
  }

  private line(line: DiffLine, width: number, side?: 'new' | 'old'): TemplateResult {
    const numbers = side
      ? this.number(side === 'old' ? line.old : line.new, width)
      : html`${this.number(line.old, width)}${this.number(line.new, width)}`
    const text = html`<span part="text">${line.text}\n</span>`
    if (line.kind === 'added') {
      return html`<ins part="added">${numbers}<span part="marker">+</span>${text}</ins>`
    }
    if (line.kind === 'removed') {
      return html`<del part="removed">${numbers}<span part="marker">-</span>${text}</del>`
    }
    return html`<span part="context">${numbers}<span part="marker"> </span>${text}</span>`
  }

  private hunk(hunk: DiffHunk, hidden = false): TemplateResult {
    return html`<span part="hunk" aria-hidden=${hidden ? 'true' : nothing}>${hunk.header}\n</span>`
  }

  private unified(file: DiffFile, width: number): TemplateResult {
    return html`<pre part="block"><code part="code">${file.hunks.map(
      (hunk) => html`${this.hunk(hunk)}${hunk.lines.map((line) => this.line(line, width))}`,
    )}</code></pre>`
  }

  /**
   * The old file beside the new one, row for row.
   *
   * The new side's hunk headers are hidden from the accessibility tree, being
   * the same text as the old side's and there only to keep the rows level.
   */
  private split(file: DiffFile, width: number): TemplateResult {
    const rows = file.hunks.map((hunk) => ({ hunk, rows: pairLines(hunk.lines) }))
    const filler = html`<span part="filler" aria-hidden="true">\n</span>`
    return html`<div part="split">
      <pre part="old"><code part="code">${rows.map(
        ({ hunk, rows }) =>
          html`${this.hunk(hunk)}${rows.map(({ left }) =>
            left ? this.line(left, width, 'old') : filler,
          )}`,
      )}</code></pre>
      <pre part="new"><code part="code">${rows.map(
        ({ hunk, rows }) =>
          html`${this.hunk(hunk, true)}${rows.map(({ right }) =>
            right ? this.line(right, width, 'new') : filler,
          )}`,
      )}</code></pre>
    </div>`
  }

  protected override render(): TemplateResult {
    return html`${this.files.map((file) => {
      const name = file.name || this.label
      const widest = Math.max(
        0,
        ...file.hunks.flatMap((hunk) =>
          hunk.lines.map((line) => Math.max(line.old ?? 0, line.new ?? 0)),
        ),
      )
      const width = String(widest).length
      return html`<div part="file">
        ${name ? html`<div part="header"><span part="label">${name}</span></div>` : nothing}
        ${this.variant === 'split' ? this.split(file, width) : this.unified(file, width)}
      </div>`
    })}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-code-diff': HelixHeadlessCodeDiff
  }
}
