import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { css as cssLanguage } from '@codemirror/lang-css'
import { html as htmlLanguage } from '@codemirror/lang-html'
import { javascript as javascriptLanguage } from '@codemirror/lang-javascript'
import { indentUnit, syntaxHighlighting } from '@codemirror/language'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import {
  type CaretDetail,
  customElement,
  HelixCaretEvent,
  HelixChangeEvent,
  HelixElement,
} from '@helix-io/core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './editor-root.css.js'
import { highlightStyle } from './highlight.js'

/** Languages the editor knows, keyed by the name a file carries. */
const LANGUAGES = {
  css: cssLanguage,
  html: htmlLanguage,
  javascript: javascriptLanguage,
  tsx: () => javascriptLanguage({ jsx: true, typescript: true }),
} as const

export type EditorLanguage = keyof typeof LANGUAGES

/**
 * @summary An editable pane of source, with highlighting and line numbers.
 *
 * @description
 * CodeMirror, not a `<textarea>`. The textarea it replaces was the right call
 * while a sandbox only had to hold text: undo, selection, spellcheck
 * suppression, mobile keyboards, and screen-reader support all came from the
 * platform. What it could not do is highlight what it holds, number its lines,
 * or say where the cursor is, and a status bar reading line and column has to
 * ask something.
 *
 * **On its own path.** This is `@helix-io/sandbox/editor` rather than part of
 * the barrel, because CodeMirror is around 110 KB over the wire where the rest
 * of this package is a few. A sandbox with no editable pane should not pay for
 * one, and neither should a site that registers its elements once.
 *
 * The view is built once and reconfigured, not rebuilt. Replacing it on every
 * change would throw away the undo history, the scroll position, and the
 * selection, which is most of what an editor is.
 *
 * @since 0.1.0
 * @status experimental
 * @category tooling
 * @aliases Code editor, Source pane
 * @documentation https://helix.fusion.dev/sandbox/editor
 *
 * @event {HelixChangeEvent} helix-change - Fired when the source is edited.
 * @event {HelixCaretEvent} helix-caret - Fired when the cursor moves, with its line and column.
 *
 * @csspart editor - The element CodeMirror is mounted into.
 */
@customElement('helix-sandbox-editor')
export class HelixSandboxEditor extends HelixElement {
  /** The source being edited. */
  @property()
  value = ''

  /** Which source this pane holds, echoed in every change. */
  @property()
  name = 'html'

  /** How to highlight it. */
  @property()
  language: EditorLanguage = 'html'

  /** Accessible name for the editable region. */
  @property({ attribute: 'field-label' })
  fieldLabel = 'Example source'

  /**
   * Whether the text can be changed.
   *
   * `EditorState.readOnly` rather than removing the editor's focus or its
   * keymap: a reader still needs to select the text, scroll it, and put a
   * cursor in it to read a long line. What it stops is the typing.
   */
  @property({ attribute: 'read-only', reflect: true, type: Boolean })
  readOnly = false

  private readonly readOnly$ = new Compartment()

  private view: EditorView | undefined
  private readonly language$ = new Compartment()

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
          syntaxHighlighting(highlightStyle, { fallback: true }),
          this.language$.of(LANGUAGES[this.language]()),
          this.readOnly$.of(EditorState.readOnly.of(this.readOnly)),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.value = update.state.doc.toString()
              this.dispatchEvent(new HelixChangeEvent({ name: this.name, value: this.value }))
            }
            if (update.selectionSet || update.docChanged || update.focusChanged) {
              this.dispatchEvent(new HelixCaretEvent(this.caret))
            }
          }),
          EditorView.contentAttributes.of({ 'aria-label': this.fieldLabel }),
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

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.create()
    const view = this.view
    if (!view) {
      return
    }

    if (changed.has('language')) {
      view.dispatch({ effects: this.language$.reconfigure(LANGUAGES[this.language]()) })
    }

    if (changed.has('readOnly')) {
      view.dispatch({
        effects: this.readOnly$.reconfigure(EditorState.readOnly.of(this.readOnly)),
      })
    }

    // Only when it differs, or an edit would be dispatched back into the
    // document that produced it and the cursor would jump to the end.
    /* A value set from outside replaces the document, and the caret stays where
       it was rather than going to the top. A replacement carries no selection
       of its own, so CodeMirror falls back to the start: every such write moved
       the cursor to character zero, which is unusable if anything is echoing
       what was typed back into the element. Clamped, because the new text can
       be shorter than the old position. */
    if (changed.has('value') && this.value !== view.state.doc.toString()) {
      const head = view.state.selection.main.head
      view.dispatch({
        changes: { from: 0, insert: this.value, to: view.state.doc.length },
        selection: { anchor: Math.min(head, this.value.length) },
      })
    }
  }

  protected override render(): TemplateResult {
    return html`<div part="editor"></div>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-editor': HelixSandboxEditor
  }
}
