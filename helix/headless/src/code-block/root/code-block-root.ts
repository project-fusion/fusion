import {
  customElement,
  formatWords,
  HelixBeforeCheckEvent,
  HelixCheckEvent,
  HelixElement,
  inlineStep,
  requestChange,
  requestValue,
  stopPress,
  words,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import '../../copy-button/index.js'
import { highlightedLines } from '../highlight.js'
import { HighlighterController, registeredHighlighter } from '../highlighter.js'
import { keyedLines } from '../keyed-lines.js'
import { gutterNumbers, lineCount, lineRuns, lineSpans } from '../lines.js'
import {
  type DiffFile,
  type DiffHunk,
  type DiffLine,
  type DiffRun,
  foldContext,
  pairLines,
  parsePatch,
} from '../patch.js'

/** Whether an element is a Code Block, of either tier, by its tag. */
const isBlock = (element: Element | null): element is HelixHeadlessCodeBlock =>
  element?.localName.endsWith('code-block') === true

/** The Code Blocks a block holds as its code, which are files under its tabs. */
const blocksIn = (host: Element): HelixHeadlessCodeBlock[] =>
  [...host.children].filter(
    (child) => child.slot === '' && isBlock(child),
  ) as HelixHeadlessCodeBlock[]

/** A file's name on its tab: its `label`, or its `language` without one. */
const nameOf = (block: Element): string => {
  const { label, language } = block as { label?: unknown; language?: unknown }
  return (
    (typeof label === 'string' && label) ||
    block.getAttribute('label') ||
    (typeof language === 'string' && language) ||
    block.getAttribute('language') ||
    ''
  )
}

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
 * from the accessibility tree and left out of a copy. Set `mark-lines` to
 * mark lines a reader should look at, such as `2, 4-6`: the block draws a
 * band behind each run, placed where the lines are laid out, so it follows a
 * highlighter's markup and lines that wrap. `added-lines` and
 * `removed-lines` mark lines the same way as inserted and deleted, as
 * Expressive Code's `ins` and `del` do, in code that is not a diff. The bands
 * are drawn and hidden from screen readers, so say in the text around the
 * block what a marked line means. Set `wrap` to wrap long lines
 * rather than scroll them; a gutter then numbers each line where it starts.
 * Set `wrappable` for a button in the header that turns `wrap` on and off,
 * pressed while the lines wrap.
 *
 * The header holds the name, the `actions` slot, and the copy button. Slot a
 * control into `actions`, such as a button that sets `wrap` or one that opens
 * the code in an editor, and the block draws a header for it even with no
 * name. `copy-icon` and `copied-icon` replace the copy button's two icons. Set `highlight` to a
 * function that turns the code into highlighted markup, such as one wrapping
 * Shiki or Prism, and the block draws what it returns; it is handed the
 * block's `language`, so one function serves every block. The code stays in
 * the slot, so the copy button and the page's own text are the code as
 * written.
 *
 * **Code Block ships no grammar**, so plain code costs you no parser. To give
 * every block on the page one highlighter, call `registerHighlighter` once,
 * with the function and, for a highlighter that writes classes, the
 * stylesheet that colors them. A block's own `highlight` wins over it:
 *
 * ```js
 * import { registerHighlighter } from '@fusion.dev/helix-headless/code-block'
 * import { createHighlighter } from 'shiki'
 *
 * const shiki = await createHighlighter({ langs: ['css', 'html', 'ts'], themes: ['github-light'] })
 * registerHighlighter((code, lang) =>
 *   shiki.getLoadedLanguages().includes(lang)
 *     ? shiki.codeToHtml(code, { lang, theme: 'github-light' })
 *     : undefined,
 * )
 * ```
 *
 * A language the function returns `undefined` for is drawn plain.
 *
 * Set `expandable` on a block whose height is capped, such as by
 * `--code-block-max-block-size`, and a button under it shows every line and
 * then fewer again, as a docs site's long example does. The button is drawn
 * only while the cap hides something, says whether the block is expanded with
 * `aria-expanded`, names the block it opens with `aria-controls`, and the block
 * carries `:state(expanded)` while it is.
 *
 * Set `diff` to show a change. Put a unified diff, the output of `git diff` or
 * `diff -u`, in the same slot, and the block draws the lines it added and
 * removed. The block never computes a diff itself. Line numbers come from the
 * hunk headers and are hidden from the accessibility tree. Changed lines are
 * `<ins>` and `<del>` with the `+` and `-` kept as text, so the change does not
 * depend on color. Where a removed line is paired with the added line that
 * replaced it, the words each does not share with the other are the `changed`
 * part, so the eye goes to what changed within the line. Each file in the patch is its own block under its own name,
 * and its copy button copies the new version of the file. `layout="split"`
 * shows the old version beside the new, each removal opposite its replacement.
 * `context-lines` folds each long run of unchanged lines, keeping that many
 * beside each change, behind a button that shows them and hides them again,
 * as a code host draws a diff written with more context than a reader needs.
 *
 * **A block that scrolls is a tab stop.** While its lines run past its width or
 * its cap, the scroller is a region named for the block, such as "Code,
 * app.ts", that Tab reaches, so a keyboard scrolls it with the arrow keys in
 * every browser. Chromium and Firefox make a scrolling box focusable on their
 * own, and Safari does not. A block that fits is no stop at all.
 *
 * **The code the block draws is marked untranslated**, `translate="no"` on
 * its `<pre>`, so a page translator leaves highlighted lines and a diff as
 * written. Code in the slot takes its translation mode from the element, which
 * writes nothing onto itself, so set `translate="no"` on the element to keep a
 * translator off plain code too.
 *
 * On the server, the slot renders as ordinary code, so a diff first appears as
 * the patch text in a `<pre>`. The client makes the same first render, which
 * keeps hydration clean, and draws the diff once it can read the content. Diff
 * mode is experimental. The rest of the family is stable.
 *
 * **Several blocks are files**, one shown at a time under a row of tabs, as
 * Sandbox shows its source panes. Put Code Blocks in the default slot of a
 * Code Block, and each is a file named on its tab by its `label` or, without
 * one, its `language`. `file` holds the name of the file shown. The tabs are a
 * tab list: the arrow keys move to a tab and show its file, the two swapping
 * on a right-to-left page, and Home and End go to the first and the last.
 * Choosing one sends `helix-before-change` with the file's name, which you can
 * cancel, and `change` once `file` holds it. The files not shown carry
 * `hidden`, and the one shown draws no name of its own, its tab naming it. One
 * block draws no tabs. A server cannot see the blocks inside, so the client
 * draws the tabs once it upgrades.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Code block, Snippet, Pre
 * @documentation https://fusion.dev/helix/components/code-block
 *
 * @slot - The code.
 * @slot actions - Controls for the block, in the header before the copy button.
 * @slot copied-icon - The copy button's icon after a copy. Defaults to a check mark.
 * @slot copy-icon - The copy button's icon before a copy. Defaults to a clipboard.
 * @slot expand-icon - An icon on the button that shows every line of a capped block, before its words.
 * @slot label - The block's name in the header, such as a file icon beside the file name. Replaces `label` and `language` there, and draws the header.
 *
 * @event {Event} change - A file tab showed its file, whose name `file` now holds.
 * @event {HelixBeforeChangeEvent} helix-before-change - A file tab is about to show its file, with the file's name in `detail.value`. Cancelable: cancel it to keep the file shown.
 * @event {HelixBeforeCheckEvent} helix-before-check - The wrap button was pressed, with the `wrap` it asks for in `detail.checked`. Cancelable: cancel it to keep the lines as they are.
 * @event {HelixCheckEvent} helix-check - Fired after the wrap button changed `wrap`, with the new value in `detail.checked`.
 * @event {HelixCopyEvent} helix-copy - The copy button put the code on the clipboard, with the text in `detail.value`.
 * @event {HelixCopyErrorEvent} helix-copy-error - A press on the copy button put nothing on the clipboard: the browser did not allow the write, or there was no code.
 *
 * @csspart actions - The box in the header that holds the `actions` slot, drawn while something is slotted there.
 * @csspart added - In a diff, a line only the new version has, an `<ins>`.
 * @csspart block - The scrolling `<pre>`.
 * @csspart changed - In a diff, the words of a changed line that the line opposite it does not have, inside its `text`.
 * @csspart code - The `<code>` inside it.
 * @csspart context - In a diff, a line both versions share.
 * @csspart copy - The copy button. It sits in the header when there is one, and beside the code otherwise.
 * @csspart copy-button - The inner button.
 * @csspart copy-live - The copy button's live region, which speaks while the button is pending.
 * @csspart copy-mark - The clipboard icon, and the check mark that replaces it after a copy.
 * @csspart copy-spinner - The ring the copy button turns while it is pending.
 * @csspart copy-text - The words on that button, trimmed to their capitals and baseline.
 * @csspart copy-tooltip-arrow - The tooltip's arrow, which points at the copy button.
 * @csspart copy-tooltip-arrow-bottom - The arrow while the tooltip is below the copy button, on the tooltip's top edge. Applied with `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-left - The arrow while the tooltip is left of the copy button, on the tooltip's right edge. Applied with `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-right - The arrow while the tooltip is right of the copy button, on the tooltip's left edge. Applied with `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-top - The arrow while the tooltip is above the copy button, on the tooltip's bottom edge. Applied with `copy-tooltip-arrow`.
 * @csspart copy-tooltip-surface - The copy button's tooltip.
 * @csspart copy-tooltip-surface-bottom - The tooltip while it is below the copy button. Applied with `copy-tooltip-surface`.
 * @csspart copy-tooltip-surface-left - The tooltip while it is left of the copy button. Applied with `copy-tooltip-surface`.
 * @csspart copy-tooltip-surface-right - The tooltip while it is right of the copy button. Applied with `copy-tooltip-surface`.
 * @csspart copy-tooltip-surface-top - The tooltip while it is above the copy button. Applied with `copy-tooltip-surface`.
 * @csspart expand - The button under a capped block that shows every line, and fewer again. Drawn when `expandable` is set and the cap hides something.
 * @csspart file - In a diff, one file's header and block.
 * @csspart file-tab - One file tab, `aria-selected` while its file is shown.
 * @csspart files - The file tabs over the blocks a block holds, where there are several.
 * @csspart filler - In a split diff, the empty row opposite a line the other side does not have.
 * @csspart fold - In a diff with `context-lines`, the button that shows a folded run of unchanged lines, and hides it again, saying which with `aria-expanded`.
 * @csspart frame - The code, and the copy button beside it where there is no header.
 * @csspart gutter - The line numbers beside the code, shown when `line-numbers` is set.
 * @csspart header - The bar that holds the name and the copy button, shown when there is a name.
 * @csspart hunk - In a diff, a `@@` line saying where the lines under it are.
 * @csspart label - The block's name: its `label`, or its `language` where it has no label.
 * @csspart mark - The band behind a run of lines `mark-lines`, `added-lines` or `removed-lines` names. The block writes where the run is laid out into `--code-block-mark-start`, `--code-block-mark-size`, and `--code-block-mark-inline-size` on it. Hidden from the accessibility tree.
 * @csspart mark-added - The band behind a run of lines `added-lines` names. Applied with `mark`.
 * @csspart mark-removed - The band behind a run of lines `removed-lines` names. Applied with `mark`.
 * @csspart marker - In a diff, the `+`, `-`, or space that starts a line.
 * @csspart new - In a split diff, the new version's `<pre>`.
 * @csspart number - In a diff, a line number. In a `wrap` block with `line-numbers`, one line's number in the gutter, which the block makes as tall as the line it numbers through `--code-block-line-size`.
 * @csspart old - In a split diff, the old version's `<pre>`.
 * @csspart removed - In a diff, a line only the old version has, a `<del>`.
 * @csspart split - In a split diff, the two versions side by side.
 * @csspart text - In a diff, a line's code.
 * @csspart wrap-toggle - The button in the header that wraps the lines and unwraps them, drawn when `wrappable` is set.
 *
 * @cssproperty --code-block-line-size - Written by the block on each `number` in a `wrap` block with `line-numbers`: how tall the line it numbers is laid out. Do not set it.
 * @cssproperty --code-block-mark-inline-size - Written by the block on each `mark`: how wide the code is, scrolled part included. Do not set it.
 * @cssproperty --code-block-mark-size - Written by the block on each `mark`: how tall its run of lines is. Do not set it.
 * @cssproperty --code-block-mark-start - Written by the block on each `mark`: how far down the code its run of lines starts. Do not set it.
 *
 * @cssstate expanded - The expand button has shown every line of a capped block.
 * @cssstate tabbed - The block is one of several files under another block's tabs, which name it, so it draws no name of its own.
 */
@customElement('helix-headless-code-block')
export class HelixHeadlessCodeBlock extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-code-block': { copyLabel: 'Code kopieren' } })`.
   */
  static words = 'helix-code-block'

  /**
   * The lines to mark as inserted, as numbers and ranges counted from 1, such
   * as `3-4`. Drawn as `mark-lines` is, in the added color. Not for a diff.
   */
  @property({ attribute: 'added-lines' })
  addedLines = ''

  /**
   * The name of a block that scrolls, which is a tab stop while it does.
   *
   * Where the block has a name, the scroller says it too, such as "Code,
   * app.ts", as `code-name-label` puts it.
   */
  @words
  @property({ attribute: 'code-label' })
  codeLabel = 'Code'

  /**
   * The name of a block that scrolls, where the block has a name. `{code}` is
   * `code-label` and `{name}` the block's name.
   */
  @words
  @property({ attribute: 'code-name-label' })
  codeNameLabel = '{code}, {name}'

  /**
   * The expand button's words while the block shows every line.
   */
  @words
  @property({ attribute: 'collapse-label' })
  collapseLabel = 'Show fewer lines'

  /**
   * In a diff, how many unchanged lines to keep beside each change. Each
   * longer run of unchanged lines is folded behind a button that shows it.
   * Unset shows every line the diff holds.
   */
  @property({ attribute: 'context-lines', type: Number })
  contextLines?: number

  /**
   * The copy button's name and tooltip text after a copy.
   */
  @words
  @property({ attribute: 'copied-label' })
  copiedLabel = 'Copied'

  /**
   * The copy button's name and tooltip text before a copy.
   *
   * Where the block has a name, the button says it too, such as "Copy code,
   * app.ts", as `copy-name-label` puts it, so each copy button on a page with
   * several blocks is told apart. In a diff, that is each file's own name.
   */
  @words
  @property({ attribute: 'copy-label' })
  copyLabel = 'Copy code'

  /**
   * The copy button's name and tooltip text before a copy, where the block
   * has a name. `{copy}` is `copy-label` and `{name}` the block's name.
   */
  @words
  @property({ attribute: 'copy-name-label' })
  copyNameLabel = '{copy}, {name}'

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
  @words
  @property({ attribute: 'expand-label' })
  expandLabel = 'Show all lines'

  /**
   * The name of the file shown, where the block holds several Code Blocks:
   * the `label` of one, or its `language` without one.
   *
   * Unset, or a name no file has, shows the first.
   */
  @property()
  file?: string

  /**
   * The name of the file tabs, read by screen readers.
   */
  @words
  @property({ attribute: 'files-label' })
  filesLabel = 'Files'

  /**
   * The words of a button that hides a run of unchanged lines it showed, in a
   * diff with `context-lines`. `{count}` is how many, and each language
   * writes the forms it has.
   */
  @words
  @property({ attribute: 'hide-unchanged-label' })
  hideUnchangedLabel = '{count, plural, one {Hide # unchanged line} other {Hide # unchanged lines}}'

  /**
   * Turns the code into highlighted markup, which the block draws in place of
   * the plain text.
   *
   * Called with the code as written and the block's `language`, and returning
   * HTML, such as the output of Shiki's `codeToHtml` or Prism's `highlight`.
   * One function serves every block on a page, each block saying its own
   * language:
   *
   * ```js
   * for (const block of document.querySelectorAll('helix-code-block')) {
   *   block.highlight = (code, lang) => codeToHtml(code, { lang, theme: 'github-light' })
   * }
   * ```
   *
   * **The markup is drawn as given**, so it has to escape the code it was
   * handed, which those highlighters do. A `<pre>` and `<code>` around the
   * whole of it, which Shiki writes, are taken off, so the lines sit level
   * with the gutter's numbers and the block keeps one tab stop. The code stays
   * in the slot, so the copy button copies it as written and a reader without
   * the script still has it. Not called on a server, which has no code to
   * read, nor for a diff.
   *
   * Absent, the block draws with the highlighter `registerHighlighter` gave
   * every block, where a page registered one, and plain otherwise.
   */
  @property({ attribute: false })
  highlight?: (code: string, language: string) => string

  /**
   * The block's name, usually a file name, drawn in the header.
   *
   * Absent, the block is named by `language` where there is one. In a diff,
   * each file is named from the patch, and this names a patch that carries no
   * name of its own.
   */
  @property()
  label = ''

  /**
   * The language the code is written in, such as `ts` or `css`, handed to
   * `highlight` as its second argument.
   *
   * A block with no `label` is named by it, in the header and on the copy
   * button, as a docs site names a snippet by its language. Absent hands
   * `highlight` an empty string and names nothing.
   */
  @property()
  language = ''

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
   * The lines to mark, as numbers and ranges counted from 1, such as `2, 4-6`.
   * Each run is drawn as a band behind its lines. Not for a diff, which marks
   * its own changes.
   */
  @property({ attribute: 'mark-lines' })
  markLines = ''

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
   * The lines to mark as deleted, as numbers and ranges counted from 1. Drawn
   * as `mark-lines` is, in the removed color. Not for a diff.
   */
  @property({ attribute: 'removed-lines' })
  removedLines = ''

  /**
   * The words of a button that shows a folded run of unchanged lines, in a
   * diff with `context-lines`. `{count}` is how many.
   */
  @words
  @property({ attribute: 'show-unchanged-label' })
  showUnchangedLabel = '{count, plural, one {Show # unchanged line} other {Show # unchanged lines}}'

  /**
   * How a diff's two versions are arranged. It has no effect without `diff`.
   *
   * Absent is unified, each removal above its replacement, which fits any
   * width. `split` sets the old version beside the new one. Optional rather
   * than defaulted, so the host carries no attribute the consumer did not write.
   */
  @property({ reflect: true })
  layout?: 'split'

  /**
   * Whether long lines wrap. Without it they scroll.
   *
   * Off by default, so long lines scroll, because a line break can be
   * significant in code and a wrapped line reads as two. For prose-like code,
   * such as a long command or a log line, a wrap reads better than a scroll.
   * With `line-numbers`, each number stands beside the line it numbers
   * however many rows that line takes. Reflected, because the stylesheet
   * wraps the lines.
   */
  @property({ reflect: true, type: Boolean })
  wrap = false

  /** The wrap button's name, which it keeps whether it is pressed or not. */
  @words
  @property({ attribute: 'wrap-label' })
  wrapLabel = 'Wrap lines'

  /**
   * Whether the header has a button that wraps the lines and unwraps them. The
   * block draws a header for it even with no name.
   */
  @property({ type: Boolean })
  wrappable = false

  /** Asks to wrap or unwrap the lines, and says so once it has. */
  private toggleWrap(): void {
    const next = !this.wrap
    const applied = requestChange({
      apply: (checked) => {
        this.wrap = checked
      },
      event: (checked) => new HelixBeforeCheckEvent({ checked }),
      host: this,
      next,
    })
    if (applied) {
      this.dispatchEvent(new HelixCheckEvent({ checked: next }))
    }
  }

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
      this.unfolded.clear()
    }
    return this.parsed.files
  }

  /** The folds a reader opened, by file, hunk and the line each starts at. */
  private readonly unfolded = new Set<string>()

  /** A hunk's lines in runs, folded where `context-lines` asks. */
  private runsOf(hunk: DiffHunk): DiffRun[] {
    const keep = this.contextLines
    return keep === undefined || keep < 0
      ? [{ folded: false, lines: hunk.lines, start: 0 }]
      : foldContext(hunk.lines, Math.floor(keep))
  }

  /**
   * The button over a folded run, and the run once it is open.
   *
   * A disclosure, so focus stays on the button as the lines appear under it.
   * The new side of a split diff draws the same words hidden from the
   * accessibility tree, there to keep the rows level and to answer a press.
   */
  private renderFold(
    run: DiffRun,
    key: string,
    line: (one: DiffLine) => TemplateResult,
    hidden = false,
  ): TemplateResult {
    const open = this.unfolded.has(key)
    const words = formatWords(this, open ? 'hideUnchangedLabel' : 'showUnchangedLabel', {
      count: run.lines.length,
    })
    const toggle = (): void => {
      if (!this.unfolded.delete(key)) {
        this.unfolded.add(key)
      }
      this.requestUpdate()
    }
    const control = hidden
      ? html`<span part="fold" aria-hidden="true" @click=${toggle}>${words}</span>`
      : html`<button part="fold" type="button" aria-expanded=${open ? 'true' : 'false'} @click=${toggle}>${words}</button>`
    return html`${control}\n${open ? run.lines.map(line) : nothing}`
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

  /** Watches the block's size. */
  private sizes: ResizeObserver | undefined

  /**
   * Reads whether the cap hides lines: the scroller is taller inside than it
   * is drawn. The styled tier caps the `<code>`, and a page may cap the
   * `<pre>`, so both are asked. Left as it was while expanded, which shows
   * everything.
   */
  private readonly measure = (): void => {
    this.markScrollers()
    this.placeLines()
    if (!this.expanded) {
      this.capped =
        this.expandable &&
        !this.diff &&
        [...this.renderRoot.querySelectorAll<HTMLElement>('[part="block"], [part="code"]')].some(
          (box) => box.scrollHeight > box.clientHeight + 1,
        )
    }
  }

  /**
   * Makes each box that scrolls a tab stop and a region named for its block,
   * and takes both away from a box that fits.
   *
   * **A reader on a keyboard scrolls the code from the box itself.** Chromium
   * and Firefox make a scrolling box focusable on their own, and Safari does
   * not, so there the arrow keys could not reach the end of a long line. A
   * box counts while its sheet lets it scroll and its content is wider or
   * taller than it is drawn: an unstyled `<pre>` overflows without scrolling,
   * and a stop on it would scroll nothing.
   */
  private markScrollers(): void {
    for (const box of this.renderRoot.querySelectorAll<HTMLElement>(
      '[part="block"], [part="code"], [part="old"], [part="new"]',
    )) {
      const style = getComputedStyle(box)
      const scrolls = (value: string) => value === 'auto' || value === 'scroll'
      const overflows =
        (scrolls(style.overflowX) && box.scrollWidth > box.clientWidth + 1) ||
        (scrolls(style.overflowY) && box.scrollHeight > box.clientHeight + 1)
      if (overflows) {
        const name = box.closest('[part="file"]')?.querySelector('[part="label"]')?.textContent
        const named = name ?? (this.label || this.language)
        box.tabIndex = 0
        box.setAttribute('role', 'region')
        box.setAttribute(
          'aria-label',
          named
            ? formatWords(this, 'codeNameLabel', { code: this.codeLabel, name: named })
            : this.codeLabel,
        )
      } else {
        box.removeAttribute('tabindex')
        box.removeAttribute('role')
        box.removeAttribute('aria-label')
      }
    }
  }

  /**
   * Where each line of the code is laid out in the `<code>`, from the top of
   * its content, as the browser placed the text: one row, or several where it
   * wraps.
   */
  private lineBoxes(code: HTMLElement): Array<{ bottom: number; top: number }> {
    const slot = code.querySelector('slot')
    const roots: Node[] = slot && !slot.hidden ? slot.assignedNodes({ flatten: true }) : [code]
    const texts: Text[] = []
    for (const root of roots) {
      if (root.nodeType === Node.TEXT_NODE) {
        texts.push(root as Text)
        continue
      }
      const walker = (root.ownerDocument ?? document).createTreeWalker(root, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        texts.push(node as Text)
      }
    }
    const starts: number[] = []
    let total = 0
    for (const text of texts) {
      starts.push(total)
      total += text.data.length
    }
    /* A character offset in the whole code, as a place in one text node. */
    const at = (offset: number): [Text, number] | undefined => {
      for (let index = texts.length - 1; index >= 0; index -= 1) {
        const start = starts[index] ?? 0
        if (offset >= start) {
          const text = texts[index] as Text
          return [text, Math.min(offset - start, text.data.length)]
        }
      }
      return undefined
    }
    const box = code.getBoundingClientRect()
    const origin = box.top + code.clientTop - code.scrollTop
    const row = Number.parseFloat(getComputedStyle(code).lineHeight) || 0
    const boxes: Array<{ bottom: number; top: number }> = []
    for (const [from, to] of lineSpans(texts.map((text) => text.data).join(''))) {
      const start = at(from)
      /* An empty line is measured by the break that ends it. */
      const end = at(to === from ? Math.min(to + 1, total) : to)
      const previous = boxes.at(-1)
      let top = previous ? previous.bottom : 0
      let bottom = top + row
      if (start && end) {
        const range = (code.ownerDocument ?? document).createRange()
        range.setStart(start[0], start[1])
        range.setEnd(end[0], end[1])
        const rects = [...range.getClientRects()].filter((rect) => rect.height > 0)
        if (rects.length > 0) {
          /* A text box is the glyphs' height, and a line is its line box: the
             leading goes half above and half below. */
          const half = Math.max(0, (row - (rects[0]?.height ?? row)) / 2)
          top = Math.min(...rects.map((rect) => rect.top)) - origin - half
          bottom = Math.max(...rects.map((rect) => rect.bottom)) - origin + half
        }
      }
      boxes.push({ bottom, top })
    }
    return boxes
  }

  /**
   * Places each mark behind its run of lines, and makes each number in a
   * wrapping gutter as tall as its line, from where the lines are laid out.
   *
   * **Written onto the elements as custom properties**, which are facts the
   * block computed and CSS cannot, and no render follows from them.
   */
  private placeLines(): void {
    const code = this.renderRoot.querySelector<HTMLElement>('[part="code"]')
    const marks = [...this.renderRoot.querySelectorAll<HTMLElement>('[part~="mark"]')]
    const numbers = [
      ...this.renderRoot.querySelectorAll<HTMLElement>('[part="gutter"] > [part="number"]'),
    ]
    if (!code || (marks.length === 0 && numbers.length === 0)) {
      return
    }
    const boxes = this.lineBoxes(code)
    for (const mark of marks) {
      const [first, last] = (mark.dataset.lines ?? '').split('-').map(Number)
      const top = boxes[(first ?? 0) - 1]
      const bottom = boxes[Math.min(last ?? 0, boxes.length) - 1]
      mark.hidden = !top || !bottom
      if (top && bottom) {
        mark.style.setProperty('--code-block-mark-start', `${top.top}px`)
        mark.style.setProperty('--code-block-mark-size', `${bottom.bottom - top.top}px`)
        mark.style.setProperty('--code-block-mark-inline-size', `${code.scrollWidth}px`)
      }
    }
    numbers.forEach((number, index) => {
      const line = boxes[index]
      if (line) {
        number.style.setProperty('--code-block-line-size', `${line.bottom - line.top}px`)
      }
    })
  }

  /** The Code Blocks this block holds as its code, once its children can be read. */
  private get blocks(): HelixHeadlessCodeBlock[] {
    return this.childrenKnown ? blocksIn(this) : []
  }

  /**
   * Whether the block is one of several files under another block's tabs,
   * which name it. Read from the parent, so a block needs no telling.
   */
  private get tabbed(): boolean {
    const parent = this.childrenKnown ? this.parentElement : null
    return this.slot === '' && isBlock(parent) && blocksIn(parent).length > 1
  }

  /** The file shown among several: the one `file` names, or the first. */
  private shownFile(blocks: HelixHeadlessCodeBlock[]): HelixHeadlessCodeBlock | undefined {
    return blocks.find((block) => nameOf(block) === this.file) ?? blocks[0]
  }

  /** Shows the file a tab names, once nobody refused. */
  private chooseFile(block: HelixHeadlessCodeBlock): void {
    if (block !== this.shownFile(this.blocks)) {
      requestValue(this, nameOf(block), (name) => {
        this.file = name
      })
    }
  }

  /**
   * Arrow keys, `Home` and `End` on the file tabs, which move to a tab and
   * show its file, as a tab list that follows focus does and as Sandbox's file
   * tabs do. Left and Right swap on a right-to-left page.
   */
  private readonly handleFileKey = (event: KeyboardEvent): void => {
    const blocks = this.blocks
    const count = blocks.length
    const at = blocks.indexOf(this.shownFile(blocks) as HelixHeadlessCodeBlock)
    const step = inlineStep(this, event.key)
    const to =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? count - 1
          : step === 0
            ? -1
            : (at + step + count) % count
    const block = blocks[to]
    if (!block) {
      return
    }
    event.preventDefault()
    this.chooseFile(block)
    void this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLElement>('[part="file-tab"][aria-selected="true"]')?.focus()
    })
  }

  /** The blocks this element hid, to show them again. */
  private readonly hid = new Set<Element>()

  /** How many files the block last held, so each is told when that changes. */
  private fileCount = 0

  /**
   * Hides the files not shown, shows any this element hid that is now, and
   * tells each file when how many there are changes, since a file draws its
   * own name only while it is alone.
   */
  private showFile(): void {
    const blocks = this.blocks
    const files = blocks.length > 1 ? blocks : []
    const shown = this.shownFile(files)
    for (const block of files) {
      if (block !== shown && !block.hidden) {
        block.hidden = true
        this.hid.add(block)
      }
    }
    for (const block of this.hid) {
      if (block === shown || !files.includes(block as HelixHeadlessCodeBlock)) {
        ;(block as HTMLElement).hidden = false
        this.hid.delete(block)
      }
    }
    if (blocks.length !== this.fileCount) {
      this.fileCount = blocks.length
      for (const block of blocks) {
        block.requestUpdate?.()
      }
    }
  }

  /**
   * The tabs over several files, and the file shown under them. One file
   * draws no tabs, only itself.
   */
  private renderFiles(blocks: HelixHeadlessCodeBlock[]): TemplateResult {
    const slot = html`<slot @slotchange=${() => this.requestUpdate()}></slot>`
    if (blocks.length < 2) {
      return slot
    }
    const shown = this.shownFile(blocks)
    return html`<div part="files" role="tablist" aria-label=${this.filesLabel} @keydown=${this.handleFileKey}>
        ${blocks.map((block, at) => {
          const selected = block === shown
          return html`<button part="file-tab" id=${`file-${at}`} role="tab" type="button"
            aria-controls="files-panel" aria-selected=${selected ? 'true' : 'false'}
            tabindex=${selected ? '0' : '-1'} @click=${() => this.chooseFile(block)}>${nameOf(block)}</button>`
        })}
      </div>
      <div id="files-panel" role="tabpanel" aria-labelledby=${`file-${blocks.indexOf(shown as HelixHeadlessCodeBlock)}`}>${slot}</div>`
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('tabbed', this.tabbed)
  }

  /* Measured after each render, and again whenever the block changes size,
     which a narrower page or a font arriving does with no render. Every block
     is watched, since any of them may come to scroll. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (typeof ResizeObserver !== 'undefined') {
      this.sizes ??= new ResizeObserver(this.measure)
      this.sizes.observe(this)
    }
    this.measure()
    this.showFile()
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

  /** On the page's list of elements a highlighter registration reaches. */
  protected readonly highlighting = new HighlighterController(this)

  /** The page registered another highlighter: draws again with it. */
  highlighterChanged(): void {
    this.requestUpdate()
  }

  protected override render(): TemplateResult {
    const blocks = this.blocks
    if (blocks.length > 0) {
      return this.renderFiles(blocks)
    }
    const files = this.files
    if (files.length > 0) {
      return this.renderDiff(files)
    }
    const text = this.text
    /* A throw is the page's fault and must not cost the reader the code, so it
       is reported as uncaught and the code is drawn plain, as Sandbox Source
       draws its source. */
    let highlighted: string | undefined
    const highlight = this.highlight ?? registeredHighlighter()
    try {
      const markup = highlight && text !== '' ? highlight(text, this.language) : undefined
      highlighted = markup === undefined ? undefined : highlightedLines(markup)
    } catch (error) {
      globalThis.reportError?.(error)
    }
    /* The slot stays either way, hidden under highlighted markup, so a change
       to the code still reaches `slotchange` and the code stays the page's. */
    /* Bands behind the runs `mark-lines` names, placed once the lines are laid
       out. Not on a server, which lays nothing out. */
    /* Each kind written out whole, so the parts a band carries are in the
       markup to read. */
    const marks = this.childrenKnown
      ? [
          ...lineRuns(this.markLines).map(
            ([first, last]) =>
              html`<span part="mark" aria-hidden="true" data-lines="${first}-${last}"></span>`,
          ),
          ...lineRuns(this.addedLines).map(
            ([first, last]) =>
              html`<span part="mark mark-added" aria-hidden="true" data-lines="${first}-${last}"></span>`,
          ),
          ...lineRuns(this.removedLines).map(
            ([first, last]) =>
              html`<span part="mark mark-removed" aria-hidden="true" data-lines="${first}-${last}"></span>`,
          ),
        ]
      : []
    const code =
      highlighted === undefined
        ? html`<code part="code">${marks}<slot @slotchange=${() => this.requestUpdate()}></slot></code>`
        : html`<code part="code">${marks}${keyedLines(highlighted)}</code><slot
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
    /* One element to a number where lines wrap, so each can be as tall as
       the line it numbers. */
    const numbers =
      lines === 0
        ? nothing
        : this.wrap
          ? Array.from(
              { length: lines },
              (_, index) => html`<span part="number">${index + 1}
</span>`,
            )
          : gutterNumbers(lines)
    const gutter = this.lineNumbers
      ? html`<span part="gutter" aria-hidden="true">${numbers}</span>`
      : nothing
    const name = this.label || this.language
    /* A file under tabs is named by its tab, and its copy button still says
       its name. */
    const drawn = this.tabbed ? '' : name
    return html`${this.renderHeader(name, undefined, drawn, true)}
      <div part="frame">
        <pre id="block" part="block" translate="no">${gutter}${code}</pre>
        ${this.headed(drawn) ? nothing : this.renderCopy()}
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
    /* `aria-controls` names the block it opens, by an id in this shadow root,
       where the button is too, so a reader can go from the button to the
       lines it showed. */
    return html`<button
      aria-controls="block"
      aria-expanded=${this.expanded ? 'true' : 'false'}
      part="expand"
      type="button"
      @click=${() => {
        this.expanded = !this.expanded
        this.toggleState('expanded', this.expanded)
      }}
    >
      ${this.slotted('expand-icon') ? html`<slot name="expand-icon"></slot>` : nothing}${
        this.expanded ? this.collapseLabel : this.expandLabel
      }
    </button>`
  }

  /** Whether the block draws a header: it has a name, a wrap button, or a control in `actions`. */
  private headed(name: string): boolean {
    return (
      name !== '' ||
      (this.wrappable && !this.diff) ||
      this.slotted('actions') ||
      (!this.diff && !this.tabbed && this.slotted('label'))
    )
  }

  /**
   * The name with the copy button beside it, or nothing when there is no name.
   *
   * **The button is in the header wherever there is one**, because beside the
   * code it stands over the block and the block has to make room for it. A
   * diff cannot: its washes run to the edge, so the button stood on the hunk
   * line and the line under it. In the header it is over nothing.
   *
   * **No name draws no header**, unless the page put a control in `actions`
   * or asked for the wrap button. A bar holding the copy button alone turned a
   * `Usage` section of one-line imports into a run of empty strips. The button
   * then stands beside the code, in room the block keeps for it.
   */
  private renderHeader(
    name: string,
    value?: string,
    drawn = name,
    own = false,
  ): TemplateResult | typeof nothing {
    const acting = this.slotted('actions')
    /* The block's own header offers the `label` slot. A diff's file headers
       are named by their files, and a file under tabs by its tab. */
    const label =
      own && !this.tabbed && this.slotted('label')
        ? html`<span part="label"><slot name="label">${drawn}</slot></span>`
        : drawn
          ? html`<span part="label">${drawn}</span>`
          : nothing
    return this.headed(drawn)
      ? html`<div part="header">${label}${
          acting ? html`<span part="actions"><slot name="actions"></slot></span>` : nothing
        }${this.renderWrapToggle()}${this.renderCopy(value, name)}</div>`
      : nothing
  }

  /** The button that wraps the lines and unwraps them, where `wrappable` asks for one. Not for a diff. */
  private renderWrapToggle(): TemplateResult | typeof nothing {
    if (!this.wrappable || this.diff) {
      return nothing
    }
    return html`<button
      part="wrap-toggle"
      type="button"
      aria-pressed=${this.wrap ? 'true' : 'false'}
      @click=${() => this.toggleWrap()}
    >${this.wrapLabel}</button>`
  }

  /**
   * Whether the page slotted something into `name`. Not known on a server or
   * while hydrating what one sent, which render as though nothing were.
   */
  private slotted(name: string): boolean {
    return this.knownChildren.some((child) => child.getAttribute('slot') === name)
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
  protected renderCopyButton(
    value: string = this.text,
    name = this.label || this.language,
  ): TemplateResult {
    return html`<${this.tag('copy-button')}
      part="copy"
      exportparts="button: copy-button, text: copy-text, mark: copy-mark, live: copy-live, spinner: copy-spinner, tooltip-surface: copy-tooltip-surface,
        tooltip-arrow: copy-tooltip-arrow, tooltip-arrow-bottom: copy-tooltip-arrow-bottom,
        tooltip-arrow-left: copy-tooltip-arrow-left, tooltip-arrow-right: copy-tooltip-arrow-right,
        tooltip-arrow-top: copy-tooltip-arrow-top, tooltip-surface-bottom: copy-tooltip-surface-bottom,
        tooltip-surface-left: copy-tooltip-surface-left, tooltip-surface-right: copy-tooltip-surface-right,
        tooltip-surface-top: copy-tooltip-surface-top"
      copied-label=${this.copiedLabel}
      @helix-press=${stopPress}
      label=${name ? formatWords(this, 'copyNameLabel', { copy: this.copyLabel, name }) : this.copyLabel}
      .value=${value}
    >${this.renderCopyIcons()}</${this.tag('copy-button')}>`
  }

  /**
   * The page's own icons for the copy button, passed on through slots of the
   * block's, where the page slotted them. A slot passed on with nothing in it
   * would stand in for the button's own icon and draw nothing, so it is drawn
   * only for an icon the page gave. In a diff, the first file's button takes
   * them, a slotted element going to one slot.
   */
  private renderCopyIcons(): TemplateResult {
    return html`${this.slotted('copy-icon') ? html`<slot name="copy-icon"></slot>` : nothing}${
      this.slotted('copied-icon') ? html`<slot name="copied-icon" slot="copied"></slot>` : nothing
    }`
  }

  /** A number padded to the widest in its file, so the columns line up as text. */
  private renderNumber(value: number | undefined, width: number): TemplateResult {
    return html`<span part="number" aria-hidden="true">${String(value ?? '').padStart(width)} </span>`
  }

  private renderLine(line: DiffLine, width: number, side?: 'new' | 'old'): TemplateResult {
    const numbers = side
      ? this.renderNumber(side === 'old' ? line.old : line.new, width)
      : html`${this.renderNumber(line.old, width)}${this.renderNumber(line.new, width)}`
    /* The words a changed line does not share with its pair, marked for the
       eye alone: the line's own `<ins>` or `<del>` already says what it is. */
    const words = line.pieces
      ? line.pieces.map((piece) =>
          piece.changed ? html`<span part="changed">${piece.text}</span>` : piece.text,
        )
      : line.text
    const text = html`<span part="text">${words}\n</span>`
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
  private renderSplit(file: DiffFile, width: number, at: number): TemplateResult {
    const hunks = file.hunks.map((hunk) => ({ hunk, runs: this.runsOf(hunk) }))
    const filler = html`<span part="filler" aria-hidden="true">\n</span>`
    const side = (old: boolean): TemplateResult[] =>
      hunks.map(
        ({ hunk, runs }, h) =>
          html`${this.renderHunk(hunk, !old)}${runs.map((run) =>
            run.folded
              ? this.renderFold(
                  run,
                  `${at}:${h}:${run.start}`,
                  (line) => this.renderLine(line, width, old ? 'old' : 'new'),
                  !old,
                )
              : pairLines(run.lines).map(({ left, right }) => {
                  const line = old ? left : right
                  return line ? this.renderLine(line, width, old ? 'old' : 'new') : filler
                }),
          )}`,
      )
    return html`<div part="split">
      <pre part="old" translate="no"><code part="code">${side(true)}</code></pre>
      <pre part="new" translate="no"><code part="code">${side(false)}</code></pre>
    </div>`
  }

  /**
   * Each file as a block of its own, the way one block of code is drawn.
   *
   * The slot stays in the tree, hidden, because it is still where the content
   * comes from: a diff edited later arrives by `slotchange` like any other.
   */
  private renderDiff(files: DiffFile[]): TemplateResult {
    return html`${files.map((file, at) => {
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
            this.layout === 'split'
              ? this.renderSplit(file, width, at)
              : html`<pre part="block" translate="no"><code part="code">${file.hunks.map(
                  (hunk, h) =>
                    html`${this.renderHunk(hunk)}${this.runsOf(hunk).map((run) =>
                      run.folded
                        ? this.renderFold(run, `${at}:${h}:${run.start}`, (line) =>
                            this.renderLine(line, width),
                          )
                        : run.lines.map((line) => this.renderLine(line, width)),
                    )}`,
                )}</code></pre>`
          }
          ${this.headed(name) ? nothing : this.renderCopy(now)}
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
