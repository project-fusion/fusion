import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { html as htmlLanguage } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { indentUnit, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import { Annotation, Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import {
  type CaretDetail,
  customElement,
  HelixBeforeEditEvent,
  HelixCaretEvent,
  HelixEditEvent,
  HelixElement,
  reportRuntime,
  words,
} from '@fusion.dev/helix-core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html, unsafeCSS } from 'lit'
import { property } from 'lit/decorators.js'
import { type HighlightLanguage, languageOf } from '../../highlight/language.js'
import { shellMode, shellTokens } from '../../highlight/shell.js'
import { syntaxHighlighter, syntaxRules } from '../../highlight/syntax.js'
import { styles } from './sandbox-editor.css.js'

/**
 * A language the editor knows, by the name a file or a sandbox pane carries.
 *
 * **Written out, where `keyof typeof` would hide the values.** The manifest
 * records a property's type as the text somebody wrote, so a type derived from
 * a record's keys reached it as a name with nothing in it and the reference
 * page listed no values. A union on one line resolves for every reader of these
 * sources without a type system, the `axes` rule included.
 *
 * The names are the panes': `js`, `jsx`, `mjs`, `ts` and `tsx` beside `css`,
 * `html` and `sh`, and `javascript`. The editor reads every name `languageOf`
 * from `@fusion.dev/helix-sandbox/highlight` reads, such as `TypeScript` or
 * `bash`, and `jsx` as `tsx`.
 */
export type EditorLanguage =
  | 'css'
  | 'html'
  | 'javascript'
  | 'js'
  | 'jsx'
  | 'mjs'
  | 'sh'
  | 'ts'
  | 'tsx'

/** sh, through the same mode the highlighter runs, so a pane and a block agree. */
const shellLanguage = StreamLanguage.define({ ...shellMode, tokenTable: shellTokens })

/**
 * What each language turns on, keyed by the grammar `languageOf` names.
 *
 * `satisfies Record<HighlightLanguage, () => Extension>`, so a grammar the
 * highlighter gains fails here until the editor can read it too.
 */
const LANGUAGES = {
  css: () => css(),
  html: () => htmlLanguage(),
  js: () => javascript(),
  sh: () => shellLanguage,
  ts: () => javascript({ typescript: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
} as const satisfies Record<HighlightLanguage, () => Extension>

/**
 * Marks a change the editor makes for a `value` set from outside, which is the
 * source the editor is given and is no edit.
 */
const given = Annotation.define<boolean>()

/**
 * @summary An editable pane of source, with highlighting and line numbers.
 *
 * @description
 * CodeMirror, not a `<textarea>`. A textarea cannot highlight what it holds,
 * number its lines, or say where the cursor is, and a status bar reading line
 * and column has to ask something.
 *
 * **On its own path.** This is `@fusion.dev/helix-sandbox/editor`, and the
 * package's root exports its class as a type only, because CodeMirror is most
 * of what the package weighs over the wire. A sandbox with no editable pane
 * pays for none, and neither does a site that registers its elements once.
 *
 * `language` names the grammar by the name a file or a sandbox pane carries:
 * `css`, `html`, `js`, `jsx`, `mjs`, `sh`, `ts` or `tsx`. A name the editor
 * does not read draws the source plain, and the console says so once.
 *
 * Each edit a reader makes is `helix-before-edit` first, which you can cancel
 * to refuse the edit, and `helix-edit` once the source holds it, as
 * `helix-sandbox-source` sends them. A `value` set from outside is the source the editor is given, and
 * sends neither. **The editor is `:state(modified)` while its source differs
 * from the source it was given**, the first `value` or the last one set from
 * outside, and `reset()` puts that source back as an edit.
 *
 * The view is built once and reconfigured, not rebuilt. Replacing it on every
 * change would throw away the undo history, the scroll position, and the
 * selection, which is most of what an editor is.
 *
 * @since 0.1.0
 * @status experimental
 * @category tooling
 * @family sandbox
 * @aliases Code editor, Source pane
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @event {HelixBeforeEditEvent} helix-before-edit - Fired before the source is edited. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixCaretEvent} helix-caret - Fired when the cursor moves, with its line and column.
 * @event {HelixEditEvent} helix-edit - Fired after the source was edited, with the new source.
 *
 * @csspart editor - The element CodeMirror is mounted into.
 *
 * @cssstate modified - While the source differs from the source the editor was given, until `reset()` or a new `value`.
 */
@customElement('helix-sandbox-editor')
export class HelixSandboxEditor extends HelixElement {
  /**
   * The key the editor's words are registered under, its tag:
   * `registerWords('de', { 'helix-sandbox-editor': { fieldLabel: 'Quelltext' } })`.
   */
  static words = 'helix-sandbox-editor'

  /**
   * Accessible name for the editable region.
   */
  @words
  @property({ attribute: 'field-label' })
  fieldLabel = 'Example source'

  /**
   * The language of the source, which decides how it is highlighted. A name
   * the editor does not read draws the source plain.
   */
  @property()
  language: EditorLanguage = 'html'

  /**
   * Which source this pane holds, echoed in every change.
   */
  @property()
  name = 'html'

  /**
   * Whether the text can be changed.
   *
   * `EditorState.readOnly` rather than removing the editor's focus or its
   * keymap: a reader still needs to select the text, scroll it, and put a
   * cursor in it to read a long line. What it stops is the typing.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * The source being edited.
   */
  @property()
  value = ''

  private readonly readOnly$ = new Compartment()

  private view: EditorView | undefined
  private readonly language$ = new Compartment()

  /** The editable region's name, which follows `field-label` and the words registered for it. */
  private readonly name$ = new Compartment()

  /** The source the editor was given: its first `value`, or the last one set from outside. */
  private baseline = ''

  /** The source the last edit left, while `value` still holds it. */
  private edited: string | undefined

  /** The `language` last reported as one the editor does not read. */
  private unread: string | undefined

  /**
   * Whether the source differs from the source the editor was given: its
   * first `value`, or the last one set from outside.
   */
  get modified(): boolean {
    return this.value === this.edited && this.value !== this.baseline
  }

  /**
   * Puts back the source the editor was given, as an edit: `helix-before-edit`
   * is sent first and can refuse it, and a sandbox passes it to its preview.
   */
  reset(): void {
    const view = this.view
    if (view && this.modified) {
      view.dispatch({ changes: { from: 0, insert: this.baseline, to: view.state.doc.length } })
    }
  }

  /**
   * What `language` turns on: its grammar, or nothing for a name the editor
   * does not read, which it reports once for each name.
   */
  private grammar(): Extension {
    const read = languageOf(typeof this.language === 'string' ? this.language : '')
    if (read !== undefined) {
      return LANGUAGES[read]()
    }
    if (this.unread !== this.language) {
      this.unread = this.language
      reportRuntime({
        kind: 'unknown-language',
        message:
          `<${this.localName} language="${this.language}"> names no language the editor reads, ` +
          'so its source is drawn plain. Use css, html, js, jsx, mjs, sh, ts or tsx.',
        tag: this.localName,
      })
    }
    return []
  }

  /** Where the cursor is, counted from one, as an editor reports it. */
  get caret(): CaretDetail {
    const state = this.view?.state
    if (!state) {
      return { column: 1, line: 1 }
    }
    const head = state.selection.main.head
    const line = state.doc.lineAt(head)
    return { column: head - line.from + 1, line: line.number }
  }

  private get mount(): HTMLElement | null {
    return this.renderRoot.querySelector('[part="editor"]')
  }

  /**
   * Builds the view once the mount exists.
   *
   * `root` is the shadow root rather than the document, or CodeMirror puts its
   * stylesheet where this element cannot see it and the editor renders unstyled.
   */
  private create(): void {
    const parent = this.mount
    if (!parent || this.view) {
      return
    }
    this.view = new EditorView({
      parent,
      root: this.shadowRoot ?? document,
      state: EditorState.create({
        doc: this.value,
        extensions: [
          lineNumbers(),
          history(),
          /* Two spaces, and Tab types them.
           *
           * Without `indentWithTab` the key does what it does everywhere else on
           * a page and moves focus, which in a code editor is the one place it
           * is not what anyone means. `indentUnit` is what the indent commands
           * insert and `tabSize` is how wide an existing tab character draws, so
           * both are set: a file that already contains tabs should line up with
           * one that does not.
           *
           * It does trap the key, which is why it is last in the keymap and why
           * `defaultKeymap` comes first: Escape then Tab still leaves the
           * editor, which is the way out for anyone working without a pointer.
           */
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          syntaxHighlighting(syntaxHighlighter, { fallback: true }),
          this.language$.of(this.grammar()),
          this.readOnly$.of(EditorState.readOnly.of(this.readOnly)),
          EditorView.lineWrapping,
          /**
           * The edit, announced before it lands, which is what `before` means.
           *
           * **A `transactionFilter` and not the update listener below**, and the
           * difference is the whole of whether the event is refusable. An
           * update listener runs after the transaction has been applied, so a
           * `preventDefault()` there was accepted and ignored: the document
           * already held the character and a consumer refusing an edit watched
           * it stay. A filter runs before, and returning `[]` rejects the
           * transaction outright, which is CodeMirror's own mechanism for this
           * rather than an inverse transaction undoing what just happened.
           *
           * Only document changes are filtered. A selection move or a focus
           * change is not an edit and passing them through the same gate would
           * let a consumer refusing one keystroke also freeze the caret.
           */
          EditorState.transactionFilter.of((transaction) => {
            if (!transaction.docChanged || transaction.annotation(given)) {
              return transaction
            }
            const next = transaction.newDoc.toString()
            const request = new HelixBeforeEditEvent({ value: next })
            return this.dispatchEvent(request) ? transaction : []
          }),
          EditorView.updateListener.of((update) => {
            const edit =
              update.docChanged &&
              !update.transactions.some((transaction) => transaction.annotation(given))
            if (edit) {
              const next = update.state.doc.toString()
              this.edited = next
              this.value = next
              this.dispatchEvent(new HelixEditEvent({ value: next }))
            }
            if (update.selectionSet || update.docChanged || update.focusChanged) {
              this.dispatchEvent(new HelixCaretEvent(this.caret))
            }
          }),
          this.name$.of(EditorView.contentAttributes.of({ 'aria-label': this.fieldLabel })),
        ],
      }),
    })
    // Once, now. The update listener only runs on a transaction, so without
    // this a freshly built editor reports nothing until it is touched, and the
    // bar beside it reads blank on a page that just loaded.
    this.dispatchEvent(new HelixCaretEvent(this.caret))
  }

  /**
   * Moves focus into the text, not onto the host.
   *
   * The host is not focusable: what a reader types into is CodeMirror's
   * contenteditable, several nodes down inside this shadow root. Without this,
   * `editor.focus()` from outside silently does nothing.
   */
  override focus(): void {
    this.view?.focus()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.view?.destroy()
    this.view = undefined
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A `value` set from outside is the new source given, and an edit is not. */
    if (this.value !== this.edited) {
      this.baseline = this.value
      this.edited = undefined
    }
    this.toggleState('modified', this.modified)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.create()
    const view = this.view
    if (!view) {
      return
    }

    if (changed.has('language')) {
      view.dispatch({ effects: this.language$.reconfigure(this.grammar()) })
    }

    if (changed.has('fieldLabel')) {
      view.dispatch({
        effects: this.name$.reconfigure(
          EditorView.contentAttributes.of({ 'aria-label': this.fieldLabel }),
        ),
      })
    }

    if (changed.has('readOnly')) {
      view.dispatch({
        effects: this.readOnly$.reconfigure(EditorState.readOnly.of(this.readOnly)),
      })
    }

    // Only when it differs, or an edit would be dispatched back into the
    // document that produced it and the cursor would jump to the end.
    /* A replacement carries no selection of its own, so CodeMirror falls back
       to the start and the caret lands on character zero, which is unusable if
       anything is echoing what was typed back into the element. Clamped,
       because the new text can be shorter than the old position. */
    if (changed.has('value') && this.value !== view.state.doc.toString()) {
      const head = view.state.selection.main.head
      view.dispatch({
        annotations: given.of(true),
        changes: { from: 0, insert: this.value, to: view.state.doc.length },
        selection: { anchor: Math.min(head, this.value.length) },
      })
    }
  }

  protected override render(): TemplateResult {
    return html`<div part="editor"></div>`
  }

  static override styles: CSSResultGroup = [styles, unsafeCSS(syntaxRules)]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-editor': HelixSandboxEditor
  }
}
