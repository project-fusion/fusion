import {
  AriaForwardController,
  customElement,
  drawIcon,
  formatWords,
  HelixFormElement,
  ListedController,
  MIRROR_RULE,
  MixinControllerValue,
  MixinField,
  numberConverter,
  onApple,
  restoreValue,
  stopPress,
  words,
} from '@fusion.dev/helix-core'
import {
  asterisk,
  caretDown,
  caretRight,
  caretUp,
  info,
  magnifyingGlass,
  textAa,
  textAUnderline,
  warning,
  x,
  xCircleFill,
} from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { live } from 'lit/directives/live.js'
import { html } from 'lit/static-html.js'
import '../../button/index.js'
import '../../icon-button/index.js'
import '../../toolbar/index.js'

/** A problem in the text, from a linter or a language server, by where it is. */
export interface EditorDiagnostic {
  /** Where it starts and ends, as offsets into the value. */
  from: number
  message: string
  to: number
  /** How bad it is. `danger` by default. */
  tone?: 'danger' | 'info' | 'warning'
}

/** What an editor shows, which an engine draws. */
export interface EditorEngineState {
  diagnostics: readonly EditorDiagnostic[]
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
export interface EditorEngineListeners {
  /** The caret or selection moved, as offsets into the value. */
  caret?(from: number, to: number): void
  /** The reader changed the text. Returns whether the change stands, so the engine can refuse one the page refused. */
  change(value: string): boolean
}

/** What the find bar asks an engine to look for. */
export interface EditorFindQuery {
  caseSensitive: boolean
  regex: boolean
  /** What Replace puts in place of a match. */
  replace: string
  search: string
  wholeWord: boolean
}

/** Where a search stands: how many matches, and which is selected, counting from 0, or -1 for none. */
export interface EditorFindResult {
  count: number
  index: number
}

/** An engine drawing one editor, which the editor drives. */
export interface EditorEngineView {
  /** Takes the engine out of the page. */
  destroy(): void
  /**
   * Finds `query` and selects a match: the first from the caret, or the next
   * or previous from the selected one. Marks every match while the find bar
   * is open.
   */
  find?(query: EditorFindQuery, direction: 'first' | 'next' | 'previous'): EditorFindResult
  /** Takes the marks a search drew away, as the find bar closes. */
  findEnd?(): void
  /** Puts the caret in the engine's text area. */
  focus?(): void
  /** Replaces the selected match, or every match, and returns where the search stands after. */
  replace?(query: EditorFindQuery, all: boolean): EditorFindResult
  /** Selects a range, scrolls it into view and puts the caret there. */
  select?(from: number, to: number): void
  /** Shows a new state: a value set from outside, a language, diagnostics. */
  update(state: EditorEngineState): void
}

/**
 * Something that draws a code editor, such as CodeMirror through
 * `@fusion.dev/helix-editor`. The editor hands it an element to draw in.
 */
export interface EditorEngine {
  mount(
    parent: HTMLElement,
    state: EditorEngineState,
    listeners: EditorEngineListeners,
  ): EditorEngineView
}

/** Each diagnostic's line, counted from 1, by its start. */
export const diagnosticLines = (
  value: string,
  diagnostics: readonly EditorDiagnostic[],
): number[] => diagnostics.map((one) => value.slice(0, Math.max(0, one.from)).split('\n').length)

/** The line and column an offset is at, each counted from 1. */
export const positionOf = (value: string, at: number): { column: number; line: number } => {
  const before = value.slice(0, Math.max(0, at))
  return {
    column: before.length - before.lastIndexOf('\n'),
    line: before.split('\n').length,
  }
}

/** The pattern a query reads as, or nothing where its regular expression cannot be read. */
const patternOf = (query: EditorFindQuery): RegExp | undefined => {
  const source = query.regex ? query.search : query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  try {
    return new RegExp(
      query.wholeWord ? `\\b(?:${source})\\b` : source,
      query.caseSensitive ? 'gu' : 'giu',
    )
  } catch {
    return undefined
  }
}

/** Where a query matches in a text, as `[from, to]` offsets, with no empty match. */
export const findRanges = (text: string, query: EditorFindQuery): Array<[number, number]> => {
  const pattern = query.search === '' ? undefined : patternOf(query)
  if (!pattern) {
    return []
  }
  return [...text.matchAll(pattern)]
    .filter((match) => match[0] !== '')
    .map((match) => [match.index, match.index + match[0].length])
}

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
 * face. Connect an engine and it draws the code instead: `connectEditor` from
 * `@fusion.dev/helix-editor` connects CodeMirror, with highlighting in your
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
 * @event {HelixBeforeChangeEvent} helix-before-change - The text is about to change. Cancelable: cancel it to keep the current text.
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
 * @csspart find - The button in the header that opens the find bar.
 * @csspart find-bar - The find bar under the header, while it is open.
 * @csspart find-button - The Find button's inner button.
 * @csspart find-close - The button that closes the find bar.
 * @csspart find-close-button - The close button's inner button.
 * @csspart find-close-live - The close button's live region, which speaks while the button is pending.
 * @csspart find-close-spinner - The ring the close button turns while it is pending.
 * @csspart find-close-text - The box the close button's icon sits in.
 * @csspart find-controls - The find bar's toolbar of options and moves.
 * @csspart find-controls-toolbar - The box inside the find bar's toolbar that lays its buttons out.
 * @csspart find-count - Which match is selected, of how many.
 * @csspart find-field - The field the search is typed in.
 * @csspart find-live - The Find button's live region, which speaks while the button is pending.
 * @csspart find-match-case - The option that finds only the same case. Pressed while it applies.
 * @csspart find-match-case-button - The match case button's inner button.
 * @csspart find-match-case-live - The match case button's live region, which speaks while the button is pending.
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
 * @csspart find-regex-spinner - The ring the regular expression button turns while it is pending.
 * @csspart find-regex-text - The box the regular expression button's icon sits in.
 * @csspart find-replace - The button that shows the replace field under the find field. Expanded while it shows.
 * @csspart find-replace-button - The find and replace button's inner button.
 * @csspart find-replace-live - The find and replace button's live region, which speaks while the button is pending.
 * @csspart find-replace-spinner - The ring the find and replace button turns while it is pending.
 * @csspart find-replace-text - The box the find and replace button's icon sits in.
 * @csspart find-spinner - The ring the Find button turns while it is pending.
 * @csspart find-text - The box the Find button's icon sits in.
 * @csspart find-whole-word - The option that finds only whole words. Pressed while it applies.
 * @csspart find-whole-word-button - The whole word button's inner button.
 * @csspart find-whole-word-live - The whole word button's live region, which speaks while the button is pending.
 * @csspart find-whole-word-spinner - The ring the whole word button turns while it is pending.
 * @csspart find-whole-word-text - The box the whole word button's icon sits in.
 * @csspart header - The strip above the code: the name, the language, and the controls.
 * @csspart hint - Help under the editor, while nothing is wrong.
 * @csspart label - The editor's name in the header.
 * @csspart language - The language's name in the header.
 * @csspart position - The caret's line and column, in the status line.
 * @csspart problem-count - How many problems there are, in the status line.
 * @csspart replace - The button that replaces the selected match.
 * @csspart replace-all - The button that replaces every match.
 * @csspart replace-all-button - The Replace all button's inner button.
 * @csspart replace-all-live - The Replace all button's live region, which speaks while the button is pending.
 * @csspart replace-all-spinner - The ring the Replace all button turns while it is pending.
 * @csspart replace-all-text - The box the Replace all button's words sit in.
 * @csspart replace-button - The Replace button's inner button.
 * @csspart replace-field - The field the replacement is typed in.
 * @csspart replace-live - The Replace button's live region, which speaks while the button is pending.
 * @csspart replace-spinner - The ring the Replace button turns while it is pending.
 * @csspart replace-text - The box the Replace button's words sit in.
 * @csspart status - The strip under the code.
 * @csspart view - Where an engine draws, while one is connected.
 *
 * @cssstate connected - An engine draws the editor.
 * @cssstate find-open - The find bar is open.
 * @cssstate invalid - The editor has an error to show, from `required` or your `feedback`.
 * @cssstate replace-open - The replace field shows under the find field.
 */
@customElement('helix-headless-code-editor')
export class HelixHeadlessCodeEditor extends MixinControllerValue(MixinField(HelixFormElement)) {
  protected static override markRules = [MIRROR_RULE]

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
  diagnostics: readonly EditorDiagnostic[] = []

  /** The list of problems' name. */
  @words
  @property({ attribute: 'diagnostics-label' })
  diagnosticsLabel = 'Problems'

  /**
   * What draws the editor, such as `codeMirrorEngine()` from
   * `@fusion.dev/helix-editor`. Absent, the editor is a plain text field.
   */
  @property({ attribute: false })
  engine: EditorEngine | undefined = undefined

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

  /** Whether the find bar is open. */
  @state()
  private findOpen = false

  /** Where the search stands, or nothing before one. */
  @state()
  private found: EditorFindResult | undefined = undefined

  /** Whether the replace field shows under the find field. */
  @state()
  private replaceOpen = false

  @state()
  private query: EditorFindQuery = {
    caseSensitive: false,
    regex: false,
    replace: '',
    search: '',
    wholeWord: false,
  }

  private view: EditorEngineView | undefined

  /** Whether Escape came just before, which lets Tab leave the plain field. */
  private escaped = false

  /** The textarea, which the form's validity is read from either way. */
  private get control(): HTMLTextAreaElement | null {
    return this.partNamed<HTMLTextAreaElement>('control')
  }

  private get engineState(): EditorEngineState {
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

  /** Whether the search can be read, which a regular expression may not be. */
  private get readable(): boolean {
    return this.query.search === '' || patternOf(this.query) !== undefined
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
      this.refreshFeedback()
    }
    this.toggleState('find-open', this.findOpen)
    this.toggleState('replace-open', this.findOpen && this.replaceOpen && !this.readOnly)
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
      this.toggleState('connected', this.view !== undefined)
      return
    }
    this.view?.update(this.engineState)
  }

  /** An edit in the engine: through `requestValue`, and announced where it stands. */
  private engineChanged(next: string): boolean {
    if (!this.requestValue(next)) {
      return false
    }
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    return true
  }

  /** Opens the find bar, with the selection as the search where one is selected, and puts focus in its field. */
  private async openFind(): Promise<void> {
    const control = this.control
    if (!this.view && control && control.selectionEnd > control.selectionStart) {
      const selected = control.value.slice(control.selectionStart, control.selectionEnd)
      if (!selected.includes('\n')) {
        this.query = { ...this.query, search: selected }
      }
    }
    this.findOpen = true
    await this.updateComplete
    const field = this.partNamed<HTMLInputElement>('find-field')
    field?.focus()
    field?.select()
    if (this.query.search !== '') {
      this.search('first')
    }
  }

  /** Closes the find bar, takes the marks away, and puts focus back in the code. */
  private closeFind(): void {
    this.findOpen = false
    this.found = undefined
    this.view?.findEnd?.()
    this.focus()
  }

  /** Finds the search and selects a match, in the engine or the plain field. */
  private search(direction: 'first' | 'next' | 'previous'): void {
    if (this.query.search === '' || !this.readable) {
      this.found = undefined
      this.view?.findEnd?.()
      return
    }
    if (this.view?.find) {
      this.found = this.view.find(this.query, direction)
      return
    }
    const control = this.control
    const ranges = findRanges(this.value, this.query)
    if (!control || ranges.length === 0) {
      this.found = { count: ranges.length, index: -1 }
      return
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
    this.found = { count: ranges.length, index }
  }

  /** Replaces the selected match, or every match, through `requestValue`. */
  private replace(all: boolean): void {
    if (this.readOnly || this.query.search === '' || !this.readable) {
      return
    }
    if (this.view?.replace) {
      this.found = this.view.replace(this.query, all)
      return
    }
    const control = this.control
    const pattern = patternOf(this.query)
    if (!control || !pattern) {
      return
    }
    if (all) {
      this.requestValue(this.value.replace(pattern, this.query.replace))
    } else {
      const selected = findRanges(this.value, this.query).find(
        ([from, to]) => from === control.selectionStart && to === control.selectionEnd,
      )
      if (!selected) {
        this.search('next')
        return
      }
      const [from, to] = selected
      const one = new RegExp(pattern.source, pattern.flags.replace('g', ''))
      const replaced = this.value.slice(from, to).replace(one, this.query.replace)
      this.requestValue(this.value.slice(0, from) + replaced + this.value.slice(to))
      restoreValue(control, this.value)
      control.setSelectionRange(from + replaced.length, from + replaced.length)
    }
    restoreValue(control, this.value)
    this.search('next')
  }

  /** Turns one of the find bar's options on or off, and searches again with it. */
  private toggleOption(option: 'caseSensitive' | 'regex' | 'wholeWord'): void {
    this.query = { ...this.query, [option]: !this.query[option] }
    this.search('first')
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

  private readonly handleFindInput = (event: Event): void => {
    this.query = { ...this.query, search: (event.target as HTMLInputElement).value }
    this.search('first')
  }

  private readonly handleReplaceInput = (event: Event): void => {
    this.query = { ...this.query, replace: (event.target as HTMLInputElement).value }
  }

  private readonly handleFindKeys = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      this.closeFind()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if ((event.target as HTMLElement).getAttribute('part') === 'replace-field') {
        this.replace(event.metaKey || event.ctrlKey)
      } else {
        this.search(event.shiftKey ? 'previous' : 'next')
      }
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
      const control = event.target as HTMLTextAreaElement
      control.setRangeText('  ', control.selectionStart, control.selectionEnd, 'end')
      control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    }
    this.escaped = false
  }

  /** The words the find bar's count says, or its regular expression's fault. */
  private get countText(): string {
    if (!this.readable) {
      return this.findInvalidLabel
    }
    return this.found === undefined
      ? ''
      : formatWords(this, 'matchesLabel', {
          count: this.found.count,
          index: Math.max(this.found.index, 0) + 1,
        })
  }

  /** The header: the name, the language, and the toolbar of the page's actions and Find. */
  protected renderHeader(): TemplateResult {
    const toolbar = this.tag('toolbar')
    const button = this.tag('icon-button')
    const language = LANGUAGE_NAMES[this.language.trim().toLowerCase()] ?? this.language
    return html`<div part="header">
      ${this.renderLabel()}
      ${language ? html`<span part="language">${language}</span>` : nothing}
      <${toolbar} part="controls" exportparts="toolbar: controls-toolbar" exportparts="toolbar: controls-toolbar" label=${this.controlsLabel}>
        <slot name="actions"></slot>
        <${button}
          part="find"
          exportparts="button: find-button, live: find-live, spinner: find-spinner, text: find-text"
          .expanded=${this.findOpen}
          label=${this.findLabel}
          @click=${() => (this.findOpen ? this.closeFind() : void this.openFind())}
          @helix-press=${stopPress}
        >
          ${drawIcon(magnifyingGlass)}
        </${button}>
      </${toolbar}>
    </div>`
  }

  /**
   * The find bar, kept in the tree while closed so its fields keep what was
   * typed. The fields stand outside the toolbar, which leaves the arrows to a
   * text field.
   */
  protected renderFind(): TemplateResult {
    const toolbar = this.tag('toolbar')
    const button = this.tag('icon-button')
    const textButton = this.tag('button')
    const searchable = this.readable && (this.found?.count ?? 0) > 0
    const replacing = this.replaceOpen && !this.readOnly
    return html`<div part="find-bar" role="search" aria-label=${this.findLabel} ?hidden=${!this.findOpen}>
      ${
        this.readOnly
          ? nothing
          : html`<${button}
              part="find-replace"
              exportparts="button: find-replace-button, live: find-replace-live, spinner: find-replace-spinner, text: find-replace-text"
              .expanded=${replacing}
              label=${this.findReplaceLabel}
              @click=${() => {
                this.replaceOpen = !this.replaceOpen
              }}
              @helix-press=${stopPress}
            >
              ${replacing ? drawIcon(caretDown) : html`<span data-mirror>${drawIcon(caretRight)}</span>`}
            </${button}>`
      }
      <input
        part="find-field"
        aria-label=${this.findLabel}
        aria-invalid=${this.readable ? nothing : 'true'}
        autocomplete="off"
        placeholder=${this.findLabel}
        spellcheck="false"
        type="search"
        .value=${live(this.query.search)}
        @input=${this.handleFindInput}
        @keydown=${this.handleFindKeys}
      />
      <span part="find-count" role="status">${this.countText}</span>
      <${toolbar} part="find-controls" exportparts="toolbar: find-controls-toolbar" exportparts="toolbar: find-controls-toolbar" label=${this.findControlsLabel}>
        <${button}
          part="find-match-case"
          exportparts="button: find-match-case-button, live: find-match-case-live, spinner: find-match-case-spinner, text: find-match-case-text"
          aria-pressed=${this.query.caseSensitive ? 'true' : 'false'}
          label=${this.findMatchCaseLabel}
          @click=${() => this.toggleOption('caseSensitive')}
          @helix-press=${stopPress}
        >
          ${drawIcon(textAa)}
        </${button}>
        <${button}
          part="find-whole-word"
          exportparts="button: find-whole-word-button, live: find-whole-word-live, spinner: find-whole-word-spinner, text: find-whole-word-text"
          aria-pressed=${this.query.wholeWord ? 'true' : 'false'}
          label=${this.findWholeWordLabel}
          @click=${() => this.toggleOption('wholeWord')}
          @helix-press=${stopPress}
        >
          ${drawIcon(textAUnderline)}
        </${button}>
        <${button}
          part="find-regex"
          exportparts="button: find-regex-button, live: find-regex-live, spinner: find-regex-spinner, text: find-regex-text"
          aria-pressed=${this.query.regex ? 'true' : 'false'}
          label=${this.findRegexLabel}
          @click=${() => this.toggleOption('regex')}
          @helix-press=${stopPress}
        >
          ${drawIcon(asterisk)}
        </${button}>
        <${button}
          part="find-previous"
          exportparts="button: find-previous-button, live: find-previous-live, spinner: find-previous-spinner, text: find-previous-text"
          ?disabled=${!searchable}
          label=${this.findPreviousLabel}
          @click=${() => this.search('previous')}
          @helix-press=${stopPress}
        >
          ${drawIcon(caretUp)}
        </${button}>
        <${button}
          part="find-next"
          exportparts="button: find-next-button, live: find-next-live, spinner: find-next-spinner, text: find-next-text"
          ?disabled=${!searchable}
          label=${this.findNextLabel}
          @click=${() => this.search('next')}
          @helix-press=${stopPress}
        >
          ${drawIcon(caretDown)}
        </${button}>
        <${button}
          part="find-close"
          exportparts="button: find-close-button, live: find-close-live, spinner: find-close-spinner, text: find-close-text"
          label=${this.findCloseLabel}
          @click=${() => this.closeFind()}
          @helix-press=${stopPress}
        >
          ${drawIcon(x)}
        </${button}>
      </${toolbar}>
      ${
        !replacing
          ? nothing
          : html`<input
              part="replace-field"
              aria-label=${this.replaceWithLabel}
              autocomplete="off"
              placeholder=${this.replaceWithLabel}
              spellcheck="false"
              type="text"
              .value=${live(this.query.replace)}
              @input=${this.handleReplaceInput}
              @keydown=${this.handleFindKeys}
            />
            <${textButton}
              part="replace"
              exportparts="button: replace-button, live: replace-live, spinner: replace-spinner, text: replace-text"
              ?disabled=${!searchable}
              @click=${() => this.replace(false)}
              @helix-press=${stopPress}
            >
              ${this.replaceLabel}
            </${textButton}>
            <${textButton}
              part="replace-all"
              exportparts="button: replace-all-button, live: replace-all-live, spinner: replace-all-spinner, text: replace-all-text"
              ?disabled=${!searchable}
              @click=${() => this.replace(true)}
              @helix-press=${stopPress}
            >
              ${this.replaceAllLabel}
            </${textButton}>`
      }
    </div>`
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
          <div part="view" ?hidden=${!this.engine}></div>
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
