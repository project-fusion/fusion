import {
  AriaForwardController,
  customElement,
  formatWords,
  HelixFormElement,
  ListedController,
  MixinControllerValue,
  MixinField,
  numberConverter,
  restoreValue,
  words,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

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

/** An engine drawing one editor, which the editor drives. */
export interface EditorEngineView {
  /** Takes the engine out of the page. */
  destroy(): void
  /** Puts the caret in the engine's text area. */
  focus?(): void
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

/**
 * @summary A field for code or plain text, drawn by a code editor you connect.
 *
 * @description
 * On its own the editor is a text field in the code face: a `<textarea>` with
 * spellcheck off, in a form under `name`, as `Textarea` is. Connect an engine
 * and it draws the editor instead: `connectEditor` from
 * `@fusion.dev/helix-editor` connects CodeMirror, with highlighting in your
 * theme's syntax colors, line numbers, folding, bracket matching, search and
 * history. The value, the form, validation and the events stay the editor's,
 * so a page reads and writes it the same either way.
 *
 * - `language` picks the highlighting, such as `ts`, `css`, `html`, `md`,
 *   `json`, `python`, `rust` or `sh`.
 * - `diagnostics` marks problems, from a linter or a language server, each
 *   underlined in the text and listed under the editor, where a screen reader
 *   can reach them.
 * - Every change goes through `requestValue`, so a listener refusing
 *   `helix-before-change` refuses the keystroke, in the engine too.
 *
 * **Keyboard.** In an engine, Tab indents and Escape then Tab leaves the
 * editor, so the editor is never a trap for a reader without a pointer.
 *
 * @since 0.215.0
 * @status experimental
 * @category inputs
 * @aliases Code editor, Code input, CodeMirror, Monaco
 * @documentation https://fusion.dev/helix/components/editor
 *
 * @slot hint - Help under the editor, in place of `hint`.
 * @slot label - The label, in place of `label`.
 *
 * @event {HelixBeforeChangeEvent} helix-before-change - The text is about to change. Cancelable: cancel it to keep the current text.
 * @event {Event} input - Fired after the text changes.
 *
 * @csspart control - The `<textarea>` the editor is without an engine, and that keeps its validity with one.
 * @csspart diagnostic - One problem in the list.
 * @csspart diagnostic-danger - A problem whose tone is `danger`, beside `diagnostic`.
 * @csspart diagnostic-info - A problem whose tone is `info`, beside `diagnostic`.
 * @csspart diagnostic-warning - A problem whose tone is `warning`, beside `diagnostic`.
 * @csspart diagnostics - The list of problems under the editor, while there are any.
 * @csspart feedback - The message that says what is wrong.
 * @csspart field - The box that holds the editor.
 * @csspart hint - Help under the editor, while nothing is wrong.
 * @csspart label - The label above the editor.
 * @csspart view - Where an engine draws, while one is connected.
 *
 * @cssstate connected - An engine draws the editor.
 * @cssstate invalid - The editor has an error to show, from `required` or your `feedback`.
 */
@customElement('helix-headless-editor')
export class HelixHeadlessEditor extends MixinControllerValue(MixinField(HelixFormElement)) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-editor': { diagnosticLabel: 'Zeile {line}: {message}' } })`.
   */
  static words = 'helix-editor'

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

  /** The language to highlight, such as `ts`, `css`, `md` or `rust`. Empty is plain text. */
  @property()
  language = ''

  /** Draws each line's number beside it, in an engine. */
  @property({ attribute: 'line-numbers', type: Boolean })
  lineNumbers = false

  /** Shown while the editor is empty. */
  @property()
  placeholder = ''

  /** Lets the reader select and copy, and not change, the text. */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /** How many lines tall the editor is before it scrolls. */
  @property({ converter: numberConverter('rows', 8) })
  rows = 8

  /** Wraps long lines to the editor's width, in place of scrolling sideways. */
  @property({ type: Boolean })
  wrap = false

  /** Whether an engine draws the editor, which `:state(connected)` says. */
  private connected = false

  private view: EditorEngineView | undefined

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

  /** Puts the caret in the editor, as a label pointing at it would. */
  override focus(options?: FocusOptions): void {
    if (this.view?.focus) {
      this.view.focus()
      return
    }
    this.control?.focus(options)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.view?.destroy()
    this.view = undefined
    this.connected = false
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
    const mount = this.partNamed('view')
    if (changed.has('engine') || (this.engine && !this.view && mount)) {
      this.view?.destroy()
      this.view = undefined
      if (this.engine && mount && this.isConnected) {
        this.view = this.engine.mount(mount, this.engineState, {
          change: (next) => this.engineChanged(next),
        })
      }
      this.connected = this.view !== undefined
      this.toggleState('connected', this.connected)
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

  /** An edit in the textarea, which has taken the character already: put back where it is refused. */
  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    const control = event.target as HTMLTextAreaElement
    this.requestValue(control.value)
    restoreValue(control, this.value)
  }

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.announceChange()
  }

  /**
   * Tab in the textarea types two spaces, as it does in an engine, unless
   * Escape came just before it, which lets the reader leave.
   */
  private escaped = false

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
        /* Each tone written out whole, so the parts a problem carries are in
           the markup to read. */
        if (one.tone === 'warning') {
          return html`<li part="diagnostic diagnostic-warning">${words}</li>`
        }
        if (one.tone === 'info') {
          return html`<li part="diagnostic diagnostic-info">${words}</li>`
        }
        return html`<li part="diagnostic diagnostic-danger">${words}</li>`
      })}
    </ul>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field">
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
        ></textarea>
        <div part="view" ?hidden=${!this.engine}></div>
      </div>
      ${this.renderDiagnostics()}${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-editor': HelixHeadlessEditor
  }
}
