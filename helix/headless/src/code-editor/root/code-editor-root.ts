import {
  AriaForwardController,
  customElement,
  drawIcon,
  findPattern,
  findRanges,
  formatWords,
  HelixFormElement,
  ListedController,
  MixinControllerValue,
  MixinField,
  numberConverter,
  onApple,
  restoreValue,
  stopPress,
  words,
} from '@fusion.dev/helix-core'
import { info, magnifyingGlass, warning, xCircleFill } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import '../../button/index.js'
import '../../find/index.js'
import type {
  FindDirection,
  Finder,
  FindQuery,
  FindResult,
  FindSink,
  HelixHeadlessFind,
} from '../../find/index.js'
import '../../icon-button/index.js'
import '../../toolbar/index.js'

/** A problem in the text, from a linter or a language server, by where it is. */
export interface CodeEditorDiagnostic {
  /** Where it starts and ends, as offsets into the value. */
  from: number
  message: string
  to: number
  /** How bad it is. `danger` by default. */
  tone?: 'danger' | 'info' | 'warning'
}

/** What an editor shows, which an engine draws. */
export interface CodeEditorEngineState {
  diagnostics: readonly CodeEditorDiagnostic[]
  /** The editor's name, for the engine's text area. */
  label: string
  /** The language to highlight, such as `ts`, `css`, `md` or `rust`. Empty is plain text. */
  language: string
  lineNumbers: boolean
  placeholder: string
  readOnly: boolean
  value: string
  wrap: boolean
}

/** What the editor tells the engine, which the engine calls as the reader works. */
export interface CodeEditorEngineListeners {
  /** The caret or selection moved, as offsets into the value. */
  caret?(from: number, to: number): void
  /** The reader changed the text. Returns whether the change stands, so the engine can refuse one the page refused. */
  change(value: string): boolean
}

/** What the find bar asks an engine to look for. */
export interface CodeEditorFindQuery {
  caseSensitive: boolean
  regex: boolean
  /** What Replace puts in place of a match. */
  replace: string
  search: string
  wholeWord: boolean
}

/** Where a search stands: how many matches, and which is selected, counting from 0, or -1 for none. */
export interface CodeEditorFindResult {
  count: number
  index: number
}

/** An engine drawing one editor, which the editor drives. */
export interface CodeEditorEngineView {
  /** Takes the engine out of the page. */
  destroy(): void
  /**
   * Finds `query` and selects a match: the first from the caret, or the next
   * or previous from the selected one. Marks every match while the find bar
   * is open.
   */
  find?(query: CodeEditorFindQuery, direction: 'first' | 'next' | 'previous'): CodeEditorFindResult
  /** Takes the marks a search drew away, as the find bar closes. */
  findEnd?(): void
  /** Puts the caret in the engine's text area. */
  focus?(): void
  /** Replaces the selected match, or every match, and returns where the search stands after. */
  replace?(query: CodeEditorFindQuery, all: boolean): CodeEditorFindResult
  /** Selects a range, scrolls it into view and puts the caret there. */
  select?(from: number, to: number): void
  /** Shows a new state: a value set from outside, a language, diagnostics. */
  update(state: CodeEditorEngineState): void
}

/**
 * Something that draws a code editor, such as CodeMirror through
 * `@fusion.dev/helix-code-editor`. The editor hands it an element to draw in.
 */
export interface CodeEditorEngine {
  mount(
    parent: HTMLElement,
    state: CodeEditorEngineState,
    listeners: CodeEditorEngineListeners,
  ): CodeEditorEngineView
}

/** Each diagnostic's line, counted from 1, by its start, from one pass over the value. */
export const diagnosticLines = (
  value: string,
  diagnostics: readonly CodeEditorDiagnostic[],
): number[] => {
  const starts = [0]
  for (let at = value.indexOf('\n'); at !== -1; at = value.indexOf('\n', at + 1)) {
    starts.push(at + 1)
  }
  return diagnostics.map((one) => {
    const from = Math.max(0, one.from)
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if ((starts[middle] ?? 0) <= from) {
        low = middle
      } else {
        high = middle - 1
      }
    }
    return low + 1
  })
}

/** The editor's properties an engine draws, which are what `update` is handed. */
const ENGINE_KEYS = [
  'diagnostics',
  'label',
  'language',
  'lineNumbers',
  'placeholder',
  'readOnly',
  'value',
  'wrap',
] as const

/** Text typed by the Tab key, through the browser's own editing so its undo keeps it. */
const typeText = (control: HTMLTextAreaElement, text: string): void => {
  const typed =
    typeof document.execCommand === 'function' && document.execCommand('insertText', false, text)
  if (!typed) {
    control.setRangeText(text, control.selectionStart, control.selectionEnd, 'end')
    control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }
}

/** The line and column an offset is at, each counted from 1. */
export const positionOf = (value: string, at: number): { column: number; line: number } => {
  const before = value.slice(0, Math.max(0, at))
  return {
    column: before.length - before.lastIndexOf('\n'),
    line: before.split('\n').length,
  }
}

/** Where a query matches in a text, as `[from, to]` offsets, with no empty match. Find's own, from core. */
export { findRanges }

/** Each language's name as a reader knows it, by the names `language` takes. */
const LANGUAGE_NAMES: Record<string, string> = {
  bash: 'Shell',
  css: 'CSS',
  htm: 'HTML',
  html: 'HTML',
  javascript: 'JavaScript',
  js: 'JavaScript',
  json: 'JSON',
  jsx: 'JSX',
  markdown: 'Markdown',
  md: 'Markdown',
  py: 'Python',
  python: 'Python',
  rs: 'Rust',
  rust: 'Rust',
  sh: 'Shell',
  shell: 'Shell',
  ts: 'TypeScript',
  tsx: 'TSX',
  typescript: 'TypeScript',
}

/**
 * @summary An editor for a file of code, drawn by a code editor you connect.
 *
 * @description
 * A pane for working on a file: a header with its name, its language and the
 * page's own actions, the code, the problems in it, and a status line that
 * says where the caret is. On its own the code is a `<textarea>` in the code
 * face. Connect an engine and it draws the code instead: `connectCodeEditor` from
 * `@fusion.dev/helix-code-editor` connects CodeMirror, with highlighting in your
 * theme's syntax colors, line numbers, folding, bracket matching and history.
 * The value, the form, validation and the events stay the editor's, so a page
 * reads and writes it the same either way.
 *
 * For a few lines in a form, such as a setting in JSON, use `Code Input`,
 * which needs no engine.
 *
 * - `language` picks the highlighting, such as `ts`, `css`, `html`, `md`,
 *   `json`, `python`, `rust` or `sh`, and the header names it.
 * - `diagnostics` marks problems, from a linter or a language server: each is
 *   underlined in the text, its line number is drawn in its tone, and it is
 *   listed under the code, where pressing it moves the caret to it.
 * - The find bar finds, with the case, whole words or a regular expression,
 *   and replaces once its first button shows the replace field, in the
 *   engine or in the plain field alike.
 * - Every change goes through `requestValue`, so a listener refusing
 *   `helix-before-change` refuses the keystroke, in the engine too.
 *
 * **Keyboard.** Command+F, or Control+F elsewhere, opens the find bar, Enter
 * and Shift+Enter move between matches, and Escape closes it. In an engine,
 * Tab indents and Escape then Tab leaves the editor, so the editor is never a
 * trap for a reader without a pointer.
 *
 * @since 0.216.0
 * @status experimental
 * @category inputs
 * @aliases Code editor, CodeMirror, File editor, IDE, Monaco
 * @documentation https://fusion.dev/helix/components/code-editor
 *
 * @slot actions - The page's own controls in the header, such as Run or Format, before the built-in ones.
 * @slot hint - Help under the editor, in place of `hint`.
 * @slot label - The editor's name in the header, such as a file name, in place of `label`.
 *
 * @event {Event} change - The reader finished an edit and focus left the code, in the engine or the plain field.
 * @event {HelixBeforeChangeEvent} helix-before-change - The text is about to change. Cancelable: cancel it to keep the current text.
 * @event {HelixFoundEvent} helix-found - The find bar searched or moved among the matches, with `count` and the selected match's `index`, counting from 0, or -1 for none.
 * @event {Event} input - Fired after the text changes.
 *
 * @csspart body - The box the code is drawn in, between the header and the problems.
 * @csspart control - The `<textarea>` the editor is without an engine, and that keeps its validity with one.
 * @csspart controls - The toolbar in the header: the page's actions, then Find.
 * @csspart controls-toolbar - The box inside the header's toolbar that lays its buttons out.
 * @csspart diagnostic - One problem in the list, a button that moves the caret to it.
 * @csspart diagnostic-danger - A problem whose tone is `danger`, beside `diagnostic`.
 * @csspart diagnostic-icon - The mark of a problem's tone, before its words.
 * @csspart diagnostic-info - A problem whose tone is `info`, beside `diagnostic`.
 * @csspart diagnostic-warning - A problem whose tone is `warning`, beside `diagnostic`.
 * @csspart diagnostics - The list of problems under the code, while there are any.
 * @csspart feedback - The message that says what is wrong.
 * @csspart field - The frame around the header, the code, the problems and the status line.
 * @csspart find - The find bar under the header, where the reader searches the code: a Find of its own.
 * @csspart find-actions - The find bar's `actions` slot, which the editor fills with nothing.
 * @csspart find-bar - The find bar's strip: the replace toggle, the field, the count, the toolbar, and the replace row while it shows.
 * @csspart find-close - The button that closes the find bar.
 * @csspart find-close-button - The close button's inner button.
 * @csspart find-close-live - The close button's live region, which speaks while the button is pending.
 * @csspart find-close-spinner - The ring the close button turns while it is pending.
 * @csspart find-close-text - The box the close button's icon sits in.
 * @csspart find-controls - The find bar's toolbar of options and moves.
 * @csspart find-controls-toolbar - The box inside the find bar's toolbar that lays its buttons out.
 * @csspart find-count - Which match is selected, of how many.
 * @csspart find-field - The field the search is typed in.
 * @csspart find-live - The find bar's live region, which says the count as it changes.
 * @csspart find-match-case - The option that finds only the same case. Pressed while it applies.
 * @csspart find-match-case-button - The match case button's inner button.
 * @csspart find-match-case-live - The match case button's live region, which speaks while the button is pending.
 * @csspart find-match-case-pressed - The match case option while it applies, beside `find-match-case`.
 * @csspart find-match-case-spinner - The ring the match case button turns while it is pending.
 * @csspart find-match-case-text - The box the match case button's icon sits in.
 * @csspart find-next - The button that selects the next match.
 * @csspart find-next-button - The next match button's inner button.
 * @csspart find-next-live - The next match button's live region, which speaks while the button is pending.
 * @csspart find-next-spinner - The ring the next match button turns while it is pending.
 * @csspart find-next-text - The box the next match button's icon sits in.
 * @csspart find-previous - The button that selects the previous match.
 * @csspart find-previous-button - The previous match button's inner button.
 * @csspart find-previous-live - The previous match button's live region, which speaks while the button is pending.
 * @csspart find-previous-spinner - The ring the previous match button turns while it is pending.
 * @csspart find-previous-text - The box the previous match button's icon sits in.
 * @csspart find-regex - The option that reads the search as a regular expression. Pressed while it applies.
 * @csspart find-regex-button - The regular expression button's inner button.
 * @csspart find-regex-live - The regular expression button's live region, which speaks while the button is pending.
 * @csspart find-regex-pressed - The regular expression option while it applies, beside `find-regex`.
 * @csspart find-regex-spinner - The ring the regular expression button turns while it is pending.
 * @csspart find-regex-text - The box the regular expression button's icon sits in.
 * @csspart find-replace - The button that replaces the selected match.
 * @csspart find-replace-all - The button that replaces every match.
 * @csspart find-replace-all-button - The Replace all button's inner button.
 * @csspart find-replace-all-live - The Replace all button's live region, which speaks while the button is pending.
 * @csspart find-replace-all-spinner - The ring the Replace all button turns while it is pending.
 * @csspart find-replace-all-text - The box the Replace all button's words sits in.
 * @csspart find-replace-button - The Replace button's inner button.
 * @csspart find-replace-field - The field the replacement is typed in.
 * @csspart find-replace-live - The Replace button's live region, which speaks while the button is pending.
 * @csspart find-replace-spinner - The ring the Replace button turns while it is pending.
 * @csspart find-replace-text - The box the Replace button's words sits in.
 * @csspart find-replace-toggle - The button that shows the replace field under the find field. Expanded while it shows. Not drawn while `readonly`.
 * @csspart find-replace-toggle-button - The find and replace button's inner button.
 * @csspart find-replace-toggle-live - The find and replace button's live region, which speaks while the button is pending.
 * @csspart find-replace-toggle-spinner - The ring the find and replace button turns while it is pending.
 * @csspart find-replace-toggle-text - The box the find and replace button's icon sits in.
 * @csspart find-toggle - The button in the header that opens and closes the find bar. Expanded while it is open.
 * @csspart find-toggle-button - The Find button's inner button.
 * @csspart find-toggle-live - The Find button's live region, which speaks while the button is pending.
 * @csspart find-toggle-spinner - The ring the Find button turns while it is pending.
 * @csspart find-toggle-text - The box the Find button's icon sits in.
 * @csspart find-whole-word - The option that finds only whole words. Pressed while it applies.
 * @csspart find-whole-word-button - The whole word button's inner button.
 * @csspart find-whole-word-live - The whole word button's live region, which speaks while the button is pending.
 * @csspart find-whole-word-pressed - The whole word option while it applies, beside `find-whole-word`.
 * @csspart find-whole-word-spinner - The ring the whole word button turns while it is pending.
 * @csspart find-whole-word-text - The box the whole word button's icon sits in.
 * @csspart header - The strip above the code: the name, the language, and the controls.
 * @csspart hint - Help under the editor, while nothing is wrong.
 * @csspart label - The editor's name in the header.
 * @csspart language - The language's name in the header.
 * @csspart position - The caret's line and column, in the status line.
 * @csspart problem-count - How many problems there are, in the status line.
 * @csspart status - The strip under the code.
 * @csspart view - Where an engine draws, while one is connected.
 *
 * @cssstate connected - An engine draws the editor.
 * @cssstate find-open - The find bar is open.
 * @cssstate invalid - The editor has an error to show, from `required` or your `feedback`.
 */
@customElement('helix-headless-code-editor')
export class HelixHeadlessCodeEditor extends MixinControllerValue(MixinField(HelixFormElement)) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-code-editor': { findLabel: 'Suchen' } })`.
   */
  static words = 'helix-code-editor'

  /** On the page's list of controls, where a command palette and a shortcut overlay find it. */
  protected readonly listed = new ListedController(
    this,
    'focus',
    () => this.internals?.ariaKeyShortcuts,
  )

  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control'),
  })

  /** Typed, so every edit is announced. */
  protected override readonly announcesInput = true

  /** The name of the header's toolbar, read by screen readers. */
  @words
  @property({ attribute: 'controls-label' })
  controlsLabel = 'Editor controls'

  /** How one problem in the list reads. `{line}` is its line and `{message}` what it says. */
  @words
  @property({ attribute: 'diagnostic-label' })
  diagnosticLabel = 'Line {line}: {message}'

  /** The problems in the text, each underlined and listed under the editor. */
  @property({ attribute: false })
  diagnostics: readonly CodeEditorDiagnostic[] = []

  /** The list of problems' name. */
  @words
  @property({ attribute: 'diagnostics-label' })
  diagnosticsLabel = 'Problems'

  /**
   * What draws the editor, such as `codeMirrorEngine()` from
   * `@fusion.dev/helix-code-editor`. Absent, the editor is a plain text field.
   */
  @property({ attribute: false })
  engine: CodeEditorEngine | undefined = undefined

  /** The name of the find bar's Close button. */
  @words
  @property({ attribute: 'find-close-label' })
  findCloseLabel = 'Close find'

  /** The name of the find bar's toolbar, read by screen readers. */
  @words
  @property({ attribute: 'find-controls-label' })
  findControlsLabel = 'Find controls'

  /** What the find bar says when its regular expression cannot be read. */
  @words
  @property({ attribute: 'find-invalid-label' })
  findInvalidLabel = 'Not a valid regular expression'

  /** The name of the Find button and the find bar's field. */
  @words
  @property({ attribute: 'find-label' })
  findLabel = 'Find'

  /** The name of the option that finds only the same case. */
  @words
  @property({ attribute: 'find-match-case-label' })
  findMatchCaseLabel = 'Match case'

  /** The name of the button that selects the next match. */
  @words
  @property({ attribute: 'find-next-label' })
  findNextLabel = 'Next match'

  /** The name of the button that selects the previous match. */
  @words
  @property({ attribute: 'find-previous-label' })
  findPreviousLabel = 'Previous match'

  /** The name of the option that reads the search as a regular expression. */
  @words
  @property({ attribute: 'find-regex-label' })
  findRegexLabel = 'Use regular expression'

  /** The name of the button that shows the replace field under the find field. */
  @words
  @property({ attribute: 'find-replace-label' })
  findReplaceLabel = 'Find and replace'

  /** The name of the option that finds only whole words. */
  @words
  @property({ attribute: 'find-whole-word-label' })
  findWholeWordLabel = 'Match whole word'

  /** The language to highlight, such as `ts`, `css`, `md` or `rust`. Empty is plain text. */
  @property()
  language = ''

  /** Draws each line's number beside it, in an engine. */
  @property({ attribute: 'line-numbers', type: Boolean })
  lineNumbers = false

  /**
   * What the find bar says of its matches. `{index}` is the selected match,
   * counting from 1, and `{count}` how many there are.
   */
  @words
  @property({ attribute: 'matches-label' })
  matchesLabel =
    '{count, plural, =0 {No matches} one {{index} of # match} other {{index} of # matches}}'

  /** Shown while the editor is empty. */
  @property()
  placeholder = ''

  /** Where the caret is, in the status line. `{line}` and `{column}` count from 1. */
  @words
  @property({ attribute: 'position-label' })
  positionLabel = 'Line {line}, column {column}'

  /** How many problems there are, in the status line. `{count}` is the number. */
  @words
  @property({ attribute: 'problems-label' })
  problemsLabel = '{count, plural, =0 {No problems} one {# problem} other {# problems}}'

  /** Lets the reader select and copy, and not change, the text. */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /** The name of the button that replaces every match. */
  @words
  @property({ attribute: 'replace-all-label' })
  replaceAllLabel = 'Replace all'

  /** The name of the button that replaces the selected match. */
  @words
  @property({ attribute: 'replace-label' })
  replaceLabel = 'Replace'

  /** The name of the field the replacement is typed in. */
  @words
  @property({ attribute: 'replace-with-label' })
  replaceWithLabel = 'Replace with'

  /** How many lines tall the plain field is before it scrolls, without an engine. */
  @property({ converter: numberConverter('rows', 8) })
  rows = 8

  /** Wraps long lines to the editor's width, in place of scrolling sideways. */
  @property({ reflect: true, type: Boolean })
  wrap = false

  /** Where the caret is, as an offset into the value. */
  @state()
  private caret = 0

  /** Whether the find bar is open, as it last said. */
  @state()
  private findOpen = false

  /** The find bar drawn now, and how a search is reported to it. */
  private find: { element: HelixHeadlessFind; sink: FindSink } | undefined

  private view: CodeEditorEngineView | undefined

  /** Whether Escape came just before, which lets Tab leave the plain field. */
  private escaped = false

  /** The value the engine last reported, which it need not be handed back. */
  private engineValue: string | undefined

  /** Whether the engine took an edit since focus last left it, which `change` reports. */
  private engineEdited = false

  /** The textarea, which the form's validity is read from either way. */
  private get control(): HTMLTextAreaElement | null {
    return this.partNamed<HTMLTextAreaElement>('control')
  }

  private get engineState(): CodeEditorEngineState {
    return {
      diagnostics: this.diagnostics,
      label: this.label,
      language: this.language,
      lineNumbers: this.lineNumbers,
      placeholder: this.placeholder,
      readOnly: this.readOnly,
      value: this.value,
      wrap: this.wrap,
    }
  }

  /** Puts the caret in the editor, as a label pointing at it would. */
  override focus(options?: FocusOptions): void {
    if (this.view?.focus) {
      this.view.focus()
      return
    }
    this.control?.focus(options)
  }

  /** Selects a range of the code and puts the caret there, in the engine or the plain field. */
  select(from: number, to = from): void {
    if (this.view?.select) {
      this.view.select(from, to)
    } else {
      const control = this.control
      control?.focus()
      control?.setSelectionRange(from, to)
    }
    this.caret = from
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('keydown', this.handleKeys)
    /* Leaving the page took the engine's view away, so one moved in the page
       mounts it again. */
    if (this.hasUpdated && this.engine && !this.view) {
      this.requestUpdate()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeys)
    this.view?.destroy()
    this.view = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.setFormValue(this.value)
    const control = this.control
    if (control) {
      this.copyValidity(control)
      /* The textarea is hidden under an engine, so a report points at the
         engine's own editable text. */
      const anchor = this.view
        ? this.partNamed('view')?.querySelector<HTMLElement>('[contenteditable]')
        : undefined
      if (anchor && !control.validity.valid) {
        this.internals.setValidity(control.validity, this.internals.validationMessage, anchor)
      }
      this.refreshFeedback()
    }
    this.toggleState('find-open', this.findOpen)
    this.attachFind()
    const mount = this.partNamed('view')
    if (changed.has('engine') || (this.engine && !this.view && mount)) {
      this.view?.destroy()
      this.view = undefined
      if (this.engine && mount && this.isConnected) {
        this.view = this.engine.mount(mount, this.engineState, {
          caret: (from) => {
            this.caret = from
          },
          change: (next) => this.engineChanged(next),
        })
      }
      this.engineValue = this.view ? this.value : undefined
      this.toggleState('connected', this.view !== undefined)
      return
    }
    /* The caret and the find bar redraw the editor and change nothing the
       engine draws, and a value the engine reported is one it already holds. */
    const drawn = ENGINE_KEYS.filter((key) => changed.has(key))
    if (
      this.view &&
      drawn.length > 0 &&
      !(drawn.length === 1 && drawn[0] === 'value' && this.value === this.engineValue)
    ) {
      this.engineValue = this.value
      this.view.update(this.engineState)
    }
  }

  /** An edit in the engine: through `requestValue`, and announced where it stands. */
  private engineChanged(next: string): boolean {
    if (!this.requestValue(next)) {
      return false
    }
    this.engineValue = next
    this.engineEdited = true
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    return true
  }

  /** Focus left the engine after an edit, which is when a field says `change`. */
  private readonly handleViewFocusOut = (event: FocusEvent): void => {
    const view = event.currentTarget as HTMLElement
    if (this.engineEdited && !view.contains(event.relatedTarget as Node | null)) {
      this.engineEdited = false
      this.announceChange()
    }
  }

  /** Opens the find bar, with the selection as the search where one is selected, and puts focus in its field. */
  private async openFind(): Promise<void> {
    const find = this.find?.element
    if (!find) {
      return
    }
    const control = this.control
    if (!this.view && control && control.selectionEnd > control.selectionStart) {
      const selected = control.value.slice(control.selectionStart, control.selectionEnd)
      if (!selected.includes('\n')) {
        find.query = selected
      }
    }
    await find.show()
  }

  /** Hands the find bar drawn now the editor to search through, once per bar. */
  private attachFind(): void {
    const element = this.partNamed<HelixHeadlessFind>('find') ?? undefined
    if (element === this.find?.element) {
      return
    }
    this.find?.sink.detach()
    this.find = element ? { element, sink: element.attach(this.finder) } : undefined
  }

  /** The editor, as the find bar searches through it: the engine, or the plain field. */
  private readonly finder: Finder = {
    end: () => this.view?.findEnd?.(),
    find: (query, direction) => this.findIn(query, direction),
    replace: (query, all) => this.replaceIn(query, all),
  }

  /** Finds the search and selects a match, in the engine or the plain field. */
  private findIn(query: FindQuery, direction: FindDirection): FindResult {
    if (this.view?.find) {
      return this.view.find(query, direction)
    }
    const control = this.control
    const ranges = findRanges(this.value, query)
    if (!control || ranges.length === 0) {
      return { count: ranges.length, index: -1 }
    }
    const at = direction === 'first' ? control.selectionStart : control.selectionEnd
    let index =
      direction === 'previous'
        ? ranges.findLastIndex(([from]) => from < control.selectionStart)
        : ranges.findIndex(([from]) => from >= at)
    if (index === -1) {
      index = direction === 'previous' ? ranges.length - 1 : 0
    }
    const [from, to] = ranges[index] ?? [0, 0]
    control.setSelectionRange(from, to)
    this.caret = from
    return { count: ranges.length, index }
  }

  /** Replaces the selected match, or every match, through `requestValue`, and finds the next. */
  private replaceIn(query: FindQuery, all: boolean): FindResult | undefined {
    if (this.readOnly) {
      return undefined
    }
    if (this.view?.replace) {
      return this.view.replace(query, all)
    }
    const control = this.control
    const pattern = findPattern(query)
    if (!control || !pattern) {
      return undefined
    }
    if (all) {
      this.requestValue(this.value.replace(pattern, query.replace))
    } else {
      const selected = findRanges(this.value, query).find(
        ([from, to]) => from === control.selectionStart && to === control.selectionEnd,
      )
      if (!selected) {
        return this.findIn(query, 'next')
      }
      const [from, to] = selected
      const one = new RegExp(pattern.source, pattern.flags.replace('g', ''))
      const replaced = this.value.slice(from, to).replace(one, query.replace)
      this.requestValue(this.value.slice(0, from) + replaced + this.value.slice(to))
      restoreValue(control, this.value)
      control.setSelectionRange(from + replaced.length, from + replaced.length)
    }
    restoreValue(control, this.value)
    return this.findIn(query, 'next')
  }

  /** The find bar opened or closed, which the Find button shows. */
  private readonly handleFindToggle = (event: Event): void => {
    this.findOpen = (event as ToggleEvent).newState === 'open'
  }

  /** The find key opens the find bar from anywhere in the editor, ahead of the browser's own. */
  private readonly handleKeys = (event: KeyboardEvent): void => {
    const mod = onApple() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
    if (mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault()
      event.stopPropagation()
      void this.openFind()
    }
  }

  /** An edit in the textarea, which has taken the character already: put back where it is refused. */
  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    const control = event.target as HTMLTextAreaElement
    this.requestValue(control.value)
    restoreValue(control, this.value)
    this.caret = control.selectionStart
  }

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.announceChange()
  }

  /** The caret in the plain field moved, by a key or a press. */
  private readonly handleCaret = (event: Event): void => {
    this.caret = (event.target as HTMLTextAreaElement).selectionStart
  }

  /**
   * Tab in the textarea types two spaces, as it does in an engine, unless
   * Escape came just before it, which lets the reader leave.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.escaped = true
      return
    }
    if (event.key === 'Tab' && !event.shiftKey && !this.escaped && !this.readOnly) {
      event.preventDefault()
      typeText(event.target as HTMLTextAreaElement, '  ')
    }
    this.escaped = false
  }

  /** The header: the name, the language, and the toolbar of the page's actions and Find. */
  protected renderHeader(): TemplateResult {
    const toolbar = this.tag('toolbar')
    const button = this.tag('icon-button')
    const language = LANGUAGE_NAMES[this.language.trim().toLowerCase()] ?? this.language
    return html`<div part="header">
      ${this.renderLabel()}
      ${language ? html`<span part="language">${language}</span>` : nothing}
      <${toolbar} part="controls" exportparts="toolbar: controls-toolbar" label=${this.controlsLabel}>
        <slot name="actions"></slot>
        <${button}
          part="find-toggle"
          exportparts="button: find-toggle-button, live: find-toggle-live, spinner: find-toggle-spinner, text: find-toggle-text"
          .expanded=${this.findOpen}
          label=${this.findLabel}
          @click=${() => (this.findOpen ? this.find?.element.hide() : void this.openFind())}
          @helix-press=${stopPress}
        >
          ${drawIcon(magnifyingGlass)}
        </${button}>
      </${toolbar}>
    </div>`
  }

  /**
   * The find bar, a Find of the editor's own that searches the engine or the
   * plain field, kept in the tree while closed so its fields keep what was
   * typed. The editor takes the find key itself, so the bar takes none.
   */
  protected renderFind(): TemplateResult {
    const find = this.tag('find')
    return html`<${find}
      part="find"
      exportparts="actions: find-actions, bar: find-bar, close: find-close, close-button: find-close-button, close-live: find-close-live, close-spinner: find-close-spinner, close-text: find-close-text, controls: find-controls, controls-toolbar: find-controls-toolbar, count: find-count, field: find-field, live: find-live, match-case: find-match-case, match-case-button: find-match-case-button, match-case-live: find-match-case-live, match-case-pressed: find-match-case-pressed, match-case-spinner: find-match-case-spinner, match-case-text: find-match-case-text, next: find-next, next-button: find-next-button, next-live: find-next-live, next-spinner: find-next-spinner, next-text: find-next-text, previous: find-previous, previous-button: find-previous-button, previous-live: find-previous-live, previous-spinner: find-previous-spinner, previous-text: find-previous-text, regex: find-regex, regex-button: find-regex-button, regex-live: find-regex-live, regex-pressed: find-regex-pressed, regex-spinner: find-regex-spinner, regex-text: find-regex-text, replace: find-replace, replace-all: find-replace-all, replace-all-button: find-replace-all-button, replace-all-live: find-replace-all-live, replace-all-spinner: find-replace-all-spinner, replace-all-text: find-replace-all-text, replace-button: find-replace-button, replace-field: find-replace-field, replace-live: find-replace-live, replace-spinner: find-replace-spinner, replace-text: find-replace-text, replace-toggle: find-replace-toggle, replace-toggle-button: find-replace-toggle-button, replace-toggle-live: find-replace-toggle-live, replace-toggle-spinner: find-replace-toggle-spinner, replace-toggle-text: find-replace-toggle-text, whole-word: find-whole-word, whole-word-button: find-whole-word-button, whole-word-live: find-whole-word-live, whole-word-pressed: find-whole-word-pressed, whole-word-spinner: find-whole-word-spinner, whole-word-text: find-whole-word-text"
      close-label=${this.findCloseLabel}
      controls-label=${this.findControlsLabel}
      invalid-label=${this.findInvalidLabel}
      label=${this.findLabel}
      match-case-label=${this.findMatchCaseLabel}
      matches-label=${this.matchesLabel}
      next-label=${this.findNextLabel}
      previous-label=${this.findPreviousLabel}
      ?readonly=${this.readOnly}
      regex-label=${this.findRegexLabel}
      replace-all-label=${this.replaceAllLabel}
      replace-field-label=${this.replaceWithLabel}
      replace-label=${this.replaceLabel}
      replace-toggle-label=${this.findReplaceLabel}
      shortcut=""
      whole-word-label=${this.findWholeWordLabel}
      @toggle=${this.handleFindToggle}
    ></${find}>`
  }

  /** The problems, each a button that moves the caret to it, in its tone. */
  protected renderDiagnostics(): TemplateResult | typeof nothing {
    if (this.diagnostics.length === 0) {
      return nothing
    }
    const lines = diagnosticLines(this.value, this.diagnostics)
    return html`<ul part="diagnostics" aria-label=${this.diagnosticsLabel}>
      ${this.diagnostics.map((one, index) => {
        const words = formatWords(this, 'diagnosticLabel', {
          line: lines[index] ?? 1,
          message: one.message,
        })
        const go = (): void => this.select(one.from, one.to)
        /* Each tone written out whole, so the parts a problem carries are in
           the markup to read. */
        if (one.tone === 'warning') {
          return html`<li><button part="diagnostic diagnostic-warning" type="button" @click=${go}>
            <span part="diagnostic-icon" aria-hidden="true">${drawIcon(warning)}</span>${words}
          </button></li>`
        }
        if (one.tone === 'info') {
          return html`<li><button part="diagnostic diagnostic-info" type="button" @click=${go}>
            <span part="diagnostic-icon" aria-hidden="true">${drawIcon(info)}</span>${words}
          </button></li>`
        }
        return html`<li><button part="diagnostic diagnostic-danger" type="button" @click=${go}>
          <span part="diagnostic-icon" aria-hidden="true">${drawIcon(xCircleFill)}</span>${words}
        </button></li>`
      })}
    </ul>`
  }

  /** The status line: where the caret is, and how many problems there are. */
  protected renderStatus(): TemplateResult {
    const { column, line } = positionOf(this.value, this.caret)
    return html`<div part="status">
      <span part="position">${formatWords(this, 'positionLabel', { column, line })}</span>
      <span part="problem-count">${formatWords(this, 'problemsLabel', { count: this.diagnostics.length })}</span>
    </div>`
  }

  protected override render(): TemplateResult {
    return html`<div part="field">
        ${this.renderHeader()}${this.renderFind()}
        <div part="body">
          <textarea
            part="control"
            id=${this.controlId}
            .value=${this.value}
            name=${this.name || nothing}
            placeholder=${this.placeholder || nothing}
            rows=${this.rows}
            spellcheck="false"
            autocapitalize="off"
            translate="no"
            wrap=${this.wrap ? 'soft' : 'off'}
            aria-describedby=${this.describedBy ?? nothing}
            aria-invalid=${this.invalidity ?? nothing}
            ?disabled=${this.isDisabled}
            ?hidden=${this.engine !== undefined}
            ?readonly=${this.readOnly}
            ?required=${this.required}
            @input=${this.handleInput}
            @change=${this.handleChange}
            @keydown=${this.handleKeydown}
            @keyup=${this.handleCaret}
            @pointerup=${this.handleCaret}
            @select=${this.handleCaret}
          ></textarea>
          <div part="view" ?hidden=${!this.engine} @focusout=${this.handleViewFocusOut}></div>
        </div>
        ${this.renderDiagnostics()}${this.renderStatus()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-code-editor': HelixHeadlessCodeEditor
  }
}
