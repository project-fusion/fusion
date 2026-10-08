import {
  customElement,
  formatWords,
  HelixBeforeEditEvent,
  HelixCaretEvent,
  HelixEditEvent,
  HelixElement,
  onUnlessFalse,
  restoreValue,
  words,
} from '@fusion.dev/helix-core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { drawnRuns, type SandboxToken, type SandboxTokenizer } from '../tokens.js'
import {
  breakLine,
  type Completions,
  closeBracket,
  deletePair,
  indentLines,
  matchBracket,
  outdentLines,
  type SourceEdit,
  suggest,
  syntaxOf,
  toggleComment,
} from './editing.js'
import { styles } from './sandbox-source.css.js'

/** Keys that only ever modify another, and so are not a press of their own. */
const MODIFIERS = new Set(['Alt', 'AltGraph', 'Control', 'Meta', 'Shift'])

/**
 * Source written inside a page, without the page's indentation: the blank
 * lines around it go, and the indentation every line shares.
 */
const dedent = (text: string): string => {
  const lines = text
    .replace(/^(?:[ \t]*\n)+/, '')
    .trimEnd()
    .split('\n')
  const shared = Math.min(
    ...lines
      .filter((line) => line.trim() !== '')
      .map((line) => /^[ \t]*/.exec(line)?.[0].length ?? 0),
  )
  return Number.isFinite(shared) ? lines.map((line) => line.slice(shared)).join('\n') : ''
}

/**
 * What a run of the drawn copy marks: the bracket beside the caret or its
 * pair, a bracket with no pair, or the point the completions open under.
 */
type Mark = 'anchor' | 'bracket' | 'unmatched'

/** A run of the drawn copy, with what it marks where it marks something. */
interface Piece extends SandboxToken {
  mark?: Mark | undefined
}

/**
 * Runs cut at each marked position: a bracket becomes a run of its own, and
 * the anchor an empty run before the character it marks.
 */
const cut = (runs: readonly SandboxToken[], marks: ReadonlyMap<number, Mark>): Piece[] => {
  if (marks.size === 0) {
    return [...runs]
  }
  const points = [...marks.keys()].sort((a, b) => a - b)
  const pieces: Piece[] = []
  let at = 0
  let next = 0
  for (const { kind, text } of runs) {
    let from = 0
    for (
      let point = points[next];
      point !== undefined && point < at + text.length;
      point = points[++next]
    ) {
      const mark = marks.get(point)
      const index = point - at
      if (index > from) {
        pieces.push({ kind, text: text.slice(from, index) })
      }
      from = mark === 'anchor' ? index : index + 1
      pieces.push({ kind, mark, text: text.slice(index, from) })
    }
    if (from < text.length) {
      pieces.push({ kind, text: text.slice(from) })
    }
    at += text.length
  }
  for (const point of points.slice(next)) {
    pieces.push({ mark: marks.get(point), text: '' })
  }
  return pieces
}

/** Runs of text cut at each line break, a line to an array. */
const linesOf = (runs: readonly Piece[]): Piece[][] => {
  const lines: Piece[][] = [[]]
  for (const { kind, mark, text } of runs) {
    text.split('\n').forEach((piece, at) => {
      if (at > 0) {
        lines.push([])
      }
      if (piece !== '' || mark === 'anchor') {
        lines.at(-1)?.push({ kind, mark, text: piece })
      }
    })
  }
  return lines
}

/**
 * Which positions of the source are inside a string or a comment, as the
 * highlighter said, so a bracket there is not matched.
 */
const quietOf = (runs: readonly SandboxToken[], length: number): Uint8Array => {
  const quiet = new Uint8Array(length)
  let at = 0
  for (const { kind, text } of runs) {
    if (kind === 'string' || kind === 'comment') {
      quiet.fill(1, at, at + text.length)
    }
    at += text.length
  }
  return quiet
}

/**
 * @summary An editable source pane for a sandbox preview.
 *
 * @description
 * A real `<textarea>`, so undo, selection, spellcheck suppression, mobile
 * keyboards, and screen reader support come from the platform.
 *
 * Tab inserts two spaces, so you can indent code. To move focus out of the
 * field, press Escape and then Tab. Shift+Tab moves focus back as it does
 * anywhere else. The field's description says so to a screen reader.
 *
 * **`tokenize` colors the source** with a highlighter you bring, such as one
 * built on Lezer, Prism or Shiki. It is a function from the source to runs of
 * text, each with an optional kind, and the pane draws the runs under a
 * transparent field, so typing, selection and undo stay the textarea's. The
 * kinds are `callable`, `comment`, `constant`, `invalid`, `keyword`, `name`,
 * `string` and `tag`, each colored by the `--helix-color-syntax-*` token of
 * its name and a hook of its own, such as `--sandbox-source-keyword-color`.
 * A run of any other kind is drawn in the field's own color. Every run with a
 * kind is a `token` part, and carries its kind as `data-kind`. A `tokenize`
 * that throws leaves the source drawn plain and the field editable, and the
 * error is reported to the page as an uncaught one.
 *
 * **`line-numbers` numbers each line** in a gutter beside the source. A line
 * that wraps keeps one number. The numbers are drawn, and hidden from screen
 * readers, which read the field.
 *
 * Enter keeps the indentation of the line it breaks, one level deeper after
 * an opening bracket, and puts the closing bracket of an empty pair on a line
 * of its own. The new line is undone with the next undo as typing is.
 *
 * **The editing keys are CodeMirror's.** Tab with text selected indents every
 * line the selection touches. `Mod+]` indents the lines and `Mod+[` outdents
 * them, and `Mod+/` comments them out or back in: `//` in a `js` pane, and one
 * block comment in an `html` or `css` pane. `Mod` is Command on a Mac and
 * Control elsewhere. Each is one step of undo.
 *
 * **`close-brackets` closes brackets and quotes** as you type them: `(`, `[`,
 * `{` and the three quotes. A closing character typed before the same one
 * steps over it, Backspace between an empty pair deletes both, and a bracket
 * typed with text selected goes around the text. **`match-brackets` marks
 * the bracket beside the caret and its pair** while the field has focus, each
 * a `bracket` part, and a bracket with no pair is also `bracket-unmatched`.
 * A bracket in a string or a comment is not matched, where `tokenize` says
 * which runs those are.
 *
 * **`complete` offers completions as you type**: the words of the source and
 * of `completions` that start with the word before the caret. They open in a
 * list under the word. The arrow keys move through it, Enter or Tab takes the
 * word, and Escape closes it. `Ctrl+Space` opens it where it is closed. The
 * field is `aria-autocomplete="list"` and points at the word chosen with
 * `aria-activedescendant`, so a screen reader reads each one. Give
 * `completions` the names a page uses, such as the tag and attribute names of
 * a custom elements manifest through `manifestWords`.
 *
 * **The pane is `:state(modified)` while its source differs from the source it
 * was given**, the first `value` or the last one set from outside. `reset()`
 * puts that source back, as an edit the sandbox passes on to its preview.
 *
 * **The source can be written inside the pane** where `value` is not set: its
 * text, or the markup of a `<template>` it holds, without the indentation the
 * page gave it. Markup goes in a template so the page does not render it or
 * run its scripts. Text inside the pane is read once, when it connects.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Editor, Code pane
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @event {HelixBeforeEditEvent} helix-before-edit - Fired before the source is edited. Cancelable: cancel it to keep the source unchanged.
 * @event {HelixCaretEvent} helix-caret - Fired when the cursor moves.
 * @event {HelixEditEvent} helix-edit - Fired after the source was edited, with the new source.
 *
 * @csspart bracket - The bracket beside the caret and its pair, under `match-brackets`.
 * @csspart bracket-unmatched - A bracket beside the caret with no pair, under `match-brackets`.
 * @csspart completion - One word in the list of completions, under `complete`.
 * @csspart completion-active - The word chosen in that list, which Enter or Tab takes.
 * @csspart completions - The list of completions under the word being typed, under `complete`.
 * @csspart field - The box that scrolls the field and its colors together, under `tokenize`, `line-numbers`, `match-brackets` or `complete`.
 * @csspart highlight - The colored copy of the source drawn under the field, under `tokenize`, `line-numbers`, `match-brackets` or `complete`.
 * @csspart line - One line of that copy, under `line-numbers`, numbered in the gutter by its `::before`.
 * @csspart source - The editable region.
 * @csspart token - One run of the source that has a kind, under `tokenize`.
 *
 * @cssproperty --sandbox-source-background-color - Fill behind the source.
 * @cssproperty --sandbox-source-bracket-color - Fill behind a matched bracket, under `match-brackets`. Defaults to `--helix-color-accent-subtle`.
 * @cssproperty --sandbox-source-callable-color - Color of a `callable` run, under `tokenize`. Defaults to `--helix-color-syntax-callable`.
 * @cssproperty --sandbox-source-comment-color - Color of a `comment` run, under `tokenize`. Defaults to `--helix-color-syntax-comment`.
 * @cssproperty --sandbox-source-completions-border-width - Width of the edge of the list of completions, under `complete`. Defaults to `--helix-border-floating`.
 * @cssproperty --sandbox-source-completions-shadow - Shadow under the list of completions, under `complete`. Defaults to `--helix-shadow-floating`.
 * @cssproperty --sandbox-source-constant-color - Color of a `constant` run, under `tokenize`. Defaults to `--helix-color-syntax-constant`.
 * @cssproperty --sandbox-source-invalid-color - Color of an `invalid` run, under `tokenize`. Defaults to `--helix-color-syntax-invalid`.
 * @cssproperty --sandbox-source-keyword-color - Color of a `keyword` run, under `tokenize`. Defaults to `--helix-color-syntax-keyword`.
 * @cssproperty --sandbox-source-line-number-color - Color of the line numbers, under `line-numbers`. Defaults to `--helix-color-foreground-subtle`.
 * @cssproperty --sandbox-source-min-block-size - Minimum height of the pane.
 * @cssproperty --sandbox-source-name-color - Color of a `name` run, under `tokenize`. Defaults to `--helix-color-syntax-name`.
 * @cssproperty --sandbox-source-string-color - Color of a `string` run, under `tokenize`. Defaults to `--helix-color-syntax-string`.
 * @cssproperty --sandbox-source-tag-color - Color of a `tag` run, under `tokenize`. Defaults to `--helix-color-syntax-tag`.
 *
 * @cssstate modified - While the source differs from the source the pane was given, until `reset()` or a new `value`.
 */
@customElement('helix-sandbox-source')
export class HelixSandboxSource extends HelixElement {
  /**
   * The key this part's words are registered under, its tag:
   * `registerWords('de', { 'helix-sandbox-source': { fieldLabel: 'Quelltext' } })`.
   */
  static words = 'helix-sandbox-source'

  /**
   * Whether typing an opening bracket or quote types its closing one too, and
   * a bracket typed with text selected goes around it.
   */
  @property({ attribute: 'close-brackets', type: Boolean })
  closeBrackets = false

  /**
   * Whether the pane offers completions for the word before the caret, from
   * the words of the source and of `completions`.
   */
  @property({ type: Boolean })
  complete = false

  /**
   * Words the pane offers under `complete` beside the words of the source,
   * such as tag and attribute names. `manifestWords` reads them from a custom
   * elements manifest. Set it as JSON in the attribute or as an array.
   */
  @property({ type: Array })
  completions: readonly string[] = []

  /**
   * The name of the list of completions, read by screen readers.
   */
  @words
  @property({ attribute: 'completions-label' })
  completionsLabel = 'Completions'

  /**
   * The editable region's name, read by screen readers.
   */
  @words
  @property({ attribute: 'field-label' })
  fieldLabel = 'Example source'

  /**
   * The editable region's name where the pane has a `label`, so each file's
   * field says which file it holds. `{field}` is `field-label` and `{name}`
   * the pane's `label`.
   */
  @words
  @property({ attribute: 'field-name-label' })
  fieldNameLabel = '{field}, {name}'

  /**
   * The field's description, read by screen readers while Tab indents.
   */
  @words
  @property({ attribute: 'keys-description' })
  keysDescription =
    'Tab inserts two spaces. To leave, press Escape and then Tab, or press Shift+Tab to go back.'

  /**
   * The pane's file name, such as `index.html`, on its tab where a sandbox
   * holds several panes. Empty puts the pane's `name` on the tab.
   */
  @property()
  label = ''

  /**
   * Whether each line of the source is numbered, in a gutter beside it.
   */
  @property({ attribute: 'line-numbers', reflect: true, type: Boolean })
  lineNumbers = false

  /**
   * Whether the bracket beside the caret and its pair are marked while the
   * field has focus.
   */
  @property({ attribute: 'match-brackets', type: Boolean })
  matchBrackets = false

  /**
   * Which source this pane holds. Every `helix-before-edit` event includes it.
   *
   * `html` and `css` are what the sandbox root routes on; any other name is
   * passed through untouched for a consumer wiring their own panes.
   *
   * Not reflected: nothing selects on it, so it keeps a real default instead.
   */
  @property()
  name = 'html'

  /**
   * Whether the source is read only: it can be selected and copied, and not
   * edited, as Sandpack's `readOnly` file is. Tab moves focus out of a field
   * that is read only.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * Whether Tab indents the source. When it is off, Tab moves focus.
   */
  @property({ attribute: 'tab-indents', converter: onUnlessFalse })
  tabIndents = true

  /**
   * Colors the source: a function from the source and the pane's `name` to
   * runs of text, each with an optional kind, such as
   * `[{ text: '<' }, { kind: 'tag', text: 'p' }, { text: '>' }]`.
   *
   * Absent, the pane is a plain field. Runs whose text does not add up to the
   * source are drawn as the source, uncolored, so the colors never drift from
   * the caret, and so is the source when the function throws. Set it as a
   * property.
   *
   * Named for what it returns, runs of text, where Code Block's `highlight`
   * returns markup.
   */
  @property({ attribute: false })
  tokenize?: SandboxTokenizer

  /**
   * The source being edited.
   */
  @property()
  value = ''

  /** Set by Escape, so the next Tab leaves the field. */
  private escaped = false

  /** The source the pane was given, which `reset()` puts back. */
  private baseline = ''

  /** The source the last edit left, to tell an edit from a `value` set from outside. */
  private edited: string | undefined

  /** Where the caret is, while nothing is selected, for `match-brackets`. */
  @state()
  private caret = -1

  /** The completions open under the word being typed, under `complete`. */
  @state()
  private offered: Completions | undefined

  /** Which of the completions Enter or Tab takes. */
  @state()
  private chosen = 0

  /** Set while a completion is written, so writing it does not offer more. */
  private accepting = false

  /**
   * Whether the source differs from the source the pane was given: its first
   * `value`, or the last one set from outside.
   */
  get modified(): boolean {
    return this.value === this.edited && this.value !== this.baseline
  }

  /**
   * Puts back the source the pane was given, as an edit: `helix-before-edit`
   * is sent first and can refuse it, and the sandbox passes it to its preview.
   */
  reset(): void {
    const field = this.field
    if (field && this.modified) {
      this.edit(field, this.baseline)
    }
  }

  private get field(): HTMLTextAreaElement | null {
    return this.renderRoot.querySelector('textarea')
  }

  /** Whether the source written inside the pane has been read. */
  private read = false

  /**
   * Takes the source written inside the pane where `value` is not set: a
   * template's markup, or else the text. Client only, like every read of the
   * light DOM, and once there is something to read.
   *
   * **As it connects, and again before its first render.** A pane that
   * upgrades after the parser is done holds its text as it connects, which is
   * before a sandbox around it reads `value` to seed its preview. A parser that
   * connects the pane before its children, as one with the element already
   * defined does, leaves the text for the render.
   */
  private readWritten(): void {
    /* A server's element shim has attributes and no tree. */
    if (
      this.read ||
      this.children === undefined ||
      this.hasAttribute('value') ||
      this.value !== ''
    ) {
      return
    }
    const template = this.querySelector(':scope > template')
    const written = dedent(template ? template.innerHTML : (this.textContent ?? ''))
    if (written !== '') {
      this.read = true
      this.value = written
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.readWritten()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (!this.hasUpdated) {
      this.readWritten()
    }
    /* A `value` set from outside is the new source given, and an edit is not. */
    if (this.value !== this.edited) {
      this.baseline = this.value
      this.edited = undefined
    }
    this.toggleState('modified', this.modified)
  }

  /** Places the completions under the word they complete, and keeps the chosen one in view. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const list = this.renderRoot.querySelector<HTMLElement>('[part="completions"]')
    const anchor = this.renderRoot.querySelector('#anchor')
    const box = this.renderRoot.querySelector<HTMLElement>('[part="field"]')
    if (!list || !anchor || !box) {
      return
    }
    const at = anchor.getBoundingClientRect()
    const frame = box.getBoundingClientRect()
    list.style.top = `${at.bottom - frame.top + box.scrollTop}px`
    list.style.left = `${at.left - frame.left + box.scrollLeft}px`
    list.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }

  /**
   * Reports where the cursor is, for a status bar to read.
   *
   * **This pane has to send it, not only `SandboxEditor`.** `SandboxRoot` binds
   * a `helix-caret` listener and writes `line` and `column` onto every slotted
   * status bar, and `SandboxStatusBar` renders a `caret` part as soon as it has
   * both; all of that ships from `@fusion.dev/helix`, while the editor is in
   * `@fusion.dev/helix-sandbox` and is `private` while Helix is pre-release. A
   * consumer taking the published shell and this pane would otherwise get a
   * status bar that can never show a position, fixable only with a package they
   * cannot install.
   *
   * The textarea is the only thing that knows, so this is where it belongs.
   * One-based on both axes, which is what an editor shows and what the detail's
   * own documentation says.
   */
  private readonly reportCaret = (event: Event): void => {
    const field = event.target as HTMLTextAreaElement
    const at = field.selectionStart ?? 0
    const before = field.value.slice(0, at)
    if (this.matchBrackets) {
      this.caret = at === field.selectionEnd ? at : -1
    }
    this.dispatchEvent(
      new HelixCaretEvent({
        column: at - (before.lastIndexOf('\n') + 1) + 1,
        line: before.split('\n').length,
      }),
    )
  }

  /**
   * Announces the edit, then applies it if nobody refused.
   *
   * **Never the other way round.** Assigning the value and dispatching the
   * request after it accepts `preventDefault()` and ignores it: a consumer
   * refusing an edit keeps the old value in their handler while the pane holds
   * the new one, and `helix-before-edit` becomes a `before` event that has
   * already happened.
   *
   * `restoreValue` because the textarea has already taken the character
   * whichever way it goes, so a refusal has to put the text back, and it does so
   * without sending the caret to the end. Exactly what `Input` does with the
   * same helper for the same reason. */
  private readonly handleInput = (event: Event): void => {
    const field = event.target as HTMLTextAreaElement
    this.edit(field, field.value)
    this.reportCaret(event)
    /* Typing a word offers its completions, and anything else typed closes
       them, unless they are open and the word is still being typed. */
    const typed = (event as InputEvent).inputType ?? ''
    if (
      this.complete &&
      !this.accepting &&
      (this.offered || /^insert(?:Text|Replacement)/.test(typed))
    ) {
      this.offer(field)
    } else {
      this.offered = undefined
    }
  }

  /** Opens the completions for the word before the caret, or closes them where there are none. */
  private offer(field: HTMLTextAreaElement): void {
    const at = field.selectionStart
    this.offered =
      at === field.selectionEnd ? suggest(field.value, at, this.completions) : undefined
    this.chosen = 0
  }

  /** Writes the chosen completion over the word it completes. */
  private accept(field: HTMLTextAreaElement, index: number): void {
    const offered = this.offered
    const word = offered?.words[index]
    this.offered = undefined
    if (!offered || word === undefined) {
      return
    }
    this.accepting = true
    this.apply(field, {
      from: offered.from,
      selection: [offered.from + word.length, offered.from + word.length],
      text: word,
      to: field.selectionEnd,
    })
    this.accepting = false
  }

  /**
   * The keys of the open completions. Returns whether the key was theirs.
   */
  private completionKey(event: KeyboardEvent, field: HTMLTextAreaElement): boolean {
    const offered = this.offered
    if (!offered) {
      return false
    }
    const count = offered.words.length
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      this.chosen = (this.chosen + (event.key === 'ArrowDown' ? 1 : count - 1)) % count
    } else if (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)) {
      this.accept(field, this.chosen)
    } else if (event.key === 'Escape') {
      this.offered = undefined
    } else {
      if (/^(?:Arrow|Home|End|Page)/.test(event.key)) {
        this.offered = undefined
      }
      return false
    }
    event.preventDefault()
    return true
  }

  /**
   * The one place an edit is taken, so a refusal cannot be forgotten at one of
   * them. Two paths reach it, a keystroke and the tab that indents.
   */
  private edit(field: HTMLTextAreaElement, next: string): void {
    const request = new HelixBeforeEditEvent({ value: next })
    const accepted = this.dispatchEvent(request)
    if (accepted) {
      this.edited = next
      this.value = next
    }
    restoreValue(field, this.value)
    if (accepted) {
      this.dispatchEvent(new HelixEditEvent({ value: next }))
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const field = event.target as HTMLTextAreaElement
    /* A field nobody can edit takes no key of its own, so Tab moves focus. */
    if (this.readOnly) {
      return
    }
    if (this.completionKey(event, field)) {
      return
    }
    if (event.key === 'Escape') {
      this.escaped = true
      return
    }
    /* A modifier on its own is the first half of a chord, and pressing Shift
       to go back after Escape must not undo the Escape. */
    if (MODIFIERS.has(event.key)) {
      return
    }
    if (this.command(event, field)) {
      this.escaped = false
      event.preventDefault()
      return
    }
    if (
      event.key === 'Enter' &&
      !event.isComposing &&
      !(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
    ) {
      this.escaped = false
      this.breakLine(event)
      return
    }
    /* **Shift+Tab always leaves.** It indented too, so a reader moving
       backward into the field had no way back out but Escape, which nothing
       told them. */
    if (event.key !== 'Tab' || event.shiftKey || !this.tabIndents || this.escaped) {
      this.escaped = false
      return
    }

    event.preventDefault()
    if (field.selectionStart === field.selectionEnd) {
      this.insert(field, '  ')
    } else {
      this.apply(field, indentLines(field.value, field.selectionStart, field.selectionEnd))
    }
  }

  /**
   * The editing commands: the `Mod` keys for indenting and comments, and, where
   * they are on, closing brackets and opening completions. Returns whether the
   * key was one, so it does nothing else.
   */
  private command(event: KeyboardEvent, field: HTMLTextAreaElement): boolean {
    const { selectionEnd: to, selectionStart: from, value } = field
    const mod = (event.ctrlKey || event.metaKey) && !event.altKey
    if (event.isComposing) {
      return false
    }
    if (mod && (event.key === ']' || event.key === '[')) {
      this.apply(field, (event.key === ']' ? indentLines : outdentLines)(value, from, to))
      return true
    }
    const syntax = syntaxOf(this.name)
    if (mod && event.key === '/' && syntax) {
      this.apply(field, toggleComment(value, from, to, syntax))
      return true
    }
    if (this.complete && event.ctrlKey && event.key === ' ') {
      this.offer(field)
      return true
    }
    if (!this.closeBrackets || mod || event.altKey) {
      return false
    }
    const change =
      event.key === 'Backspace'
        ? deletePair(value, from, to)
        : event.key.length === 1
          ? closeBracket(value, from, to, event.key)
          : undefined
    this.apply(field, change)
    return change !== undefined
  }

  /**
   * Makes a change as typing would, through `insert`, and puts the selection
   * where the change says. A change that refuses nothing and replaces nothing
   * only moves the caret.
   */
  private apply(field: HTMLTextAreaElement, change: SourceEdit | undefined): void {
    if (!change) {
      return
    }
    const { from, selection, text, to } = change
    const next = `${field.value.slice(0, from)}${text}${field.value.slice(to)}`
    if (text !== '' || from !== to) {
      field.setSelectionRange(from, to)
      this.insert(field, text)
    }
    /* Only where the edit was taken: a refused one left the source, and the
       selection with it. */
    if (field.value === next) {
      field.setSelectionRange(...selection)
    }
  }

  /**
   * Breaks the line with the indentation it has, one level deeper after an
   * opening bracket. A line at the margin with no bracket is left to the
   * platform's own Enter.
   */
  private breakLine(event: KeyboardEvent): void {
    const field = event.target as HTMLTextAreaElement
    const change = breakLine(field.value, field.selectionStart, field.selectionEnd)
    if (change) {
      event.preventDefault()
      this.apply(field, change)
    }
  }

  /**
   * Writes text at the caret, as typing would: the two spaces Tab inserts,
   * and the indentation Enter keeps.
   *
   * **Through `insertText`, so undo takes the indent back.** Assigning
   * `field.value` empties the textarea's undo history: a reader who typed,
   * pressed Tab and then Cmd+Z or Ctrl+Z lost the indent and everything typed
   * before it. `insertText` is the edit a keystroke makes, so it joins the
   * history and sends the `input` event that `handleInput` takes. It writes
   * into whatever has focus, so it is used only while the field has it. Where it
   * is not supported, the field is written directly.
   */
  private insert(field: HTMLTextAreaElement, text: string): void {
    const { ownerDocument } = field
    const focused = (field.getRootNode() as Document | ShadowRoot).activeElement === field
    if (
      focused &&
      typeof ownerDocument.execCommand === 'function' &&
      (text === ''
        ? ownerDocument.execCommand('delete')
        : ownerDocument.execCommand('insertText', false, text))
    ) {
      return
    }
    field.setRangeText(text, field.selectionStart, field.selectionEnd, 'end')
    this.edit(field, field.value)
  }

  protected override render(): TemplateResult {
    const field = this.renderField()
    if (!this.tokenize && !this.lineNumbers && !this.matchBrackets && !this.complete) {
      return field
    }
    /* A throw is the page's fault and must not cost the reader the field, so
       it is reported as uncaught and the source is drawn plain, as runs that
       do not add up are. */
    let given: readonly SandboxToken[] = []
    try {
      given = this.tokenize?.(this.value, this.name) ?? []
    } catch (error) {
      globalThis.reportError?.(error)
    }
    const runs = this.mark(drawnRuns(this.value, given))
    const draw = (some: readonly Piece[]) =>
      some.map(({ kind, mark, text }) => {
        const lone = mark === 'unmatched'
        const shown =
          mark === 'anchor'
            ? html`<span id="anchor"></span>`
            : mark
              ? html`<span part="bracket${lone ? ' bracket-unmatched' : ''}">${text}</span>`
              : text
        return kind ? html`<span part="token" data-kind=${kind}>${shown}</span>` : shown
      })
    if (this.lineNumbers) {
      /* A line to a block, so a line that wraps is one block and its number
         stands beside its first row. The gutter is as wide as the last
         number. */
      const lines = linesOf(runs)
      return html`<div part="field" style="--_sandbox-source-gutter: ${String(lines.length).length}ch">
        <pre part="highlight" aria-hidden="true">${lines.map(
          (line) => html`<span part="line">${draw(line)}</span>`,
        )}</pre>
        ${field}${this.renderCompletions()}
      </div>`
    }
    /* The trailing newline gives a last empty line its height, as the field
       gives it one. */
    return html`<div part="field">
      <pre part="highlight" aria-hidden="true">${draw(runs)}${'\n'}</pre>
      ${field}${this.renderCompletions()}
    </div>`
  }

  /**
   * The runs with the brackets beside the caret and the completions' anchor
   * marked, where either is on.
   */
  private mark(runs: readonly SandboxToken[]): Piece[] {
    const marks = new Map<number, Mark>()
    if (this.matchBrackets && this.caret >= 0) {
      const quiet = quietOf(runs, this.value.length)
      const found = matchBracket(this.value, this.caret, (index) => quiet[index] === 1)
      if (found) {
        marks.set(found.at, found.match === undefined ? 'unmatched' : 'bracket')
        if (found.match !== undefined) {
          marks.set(found.match, 'bracket')
        }
      }
    }
    if (this.offered) {
      marks.set(this.offered.from, 'anchor')
    }
    return cut(runs, marks)
  }

  /** The list of completions, while it is open. */
  private renderCompletions(): TemplateResult | typeof nothing {
    const offered = this.offered
    if (!offered) {
      return nothing
    }
    return html`<div part="completions" id="completions" role="listbox" aria-label=${this.completionsLabel}>
      ${offered.words.map((word, at) => {
        const chosen = at === this.chosen
        return html`<div part="completion${chosen ? ' completion-active' : ''}" id=${`completion-${at}`}
          role="option" aria-selected=${chosen ? 'true' : 'false'}
          @pointerdown=${(event: PointerEvent) => {
            event.preventDefault()
            const field = this.field
            if (field) {
              this.accept(field, at)
            }
          }}>${word}</div>`
      })}
    </div>`
  }

  /** Closes the completions, as the field loses focus. */
  private readonly close = (): void => {
    this.offered = undefined
  }

  /** The field itself and its description, which is the whole pane without `tokenize`. */
  private renderField(): TemplateResult {
    return html`<textarea
      part="source"
      aria-label=${
        this.label
          ? formatWords(this, 'fieldNameLabel', { field: this.fieldLabel, name: this.label })
          : this.fieldLabel
      }
      aria-describedby=${this.tabIndents && !this.readOnly ? 'keys' : nothing}
      aria-autocomplete=${this.complete ? 'list' : nothing}
      aria-controls=${this.offered ? 'completions' : nothing}
      aria-activedescendant=${this.offered ? `completion-${this.chosen}` : nothing}
      spellcheck="false"
      ?readonly=${this.readOnly}
      .value=${this.value}
      @blur=${this.close}
      @focus=${this.reportCaret}
      @pointerdown=${this.close}
      @input=${this.handleInput}
      @keydown=${this.handleKeydown}
      @keyup=${this.reportCaret}
      @pointerup=${this.reportCaret}
    ></textarea>
      <span id="keys" hidden>${this.keysDescription}</span>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-source': HelixSandboxSource
  }
}
