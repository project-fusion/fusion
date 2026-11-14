import { customElement, LAYERS_RULE, SCROLLER_RULE, SPOKEN_RULE } from '@fusion.dev/helix-core'
import { highlightedLines } from '@fusion.dev/helix-core/code-block'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import {
  type CodeBlockHighlighter,
  HighlighterController,
  registeredHighlighter,
} from '../../code-block/highlighter.js'
import { keyedLines } from '../../code-block/keyed-lines.js'
import { HelixHeadlessTextarea } from '../../textarea/root/textarea-root.js'

/** The text as markup that draws it plain. */
const escapeText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** One step of indentation, which Tab types and Shift+Tab takes away. */
const INDENT = '  '

/** Where the line holding an offset starts. */
const lineStart = (text: string, at: number): number => text.lastIndexOf('\n', at - 1) + 1

/** Where the line holding an offset ends, before its break. */
const lineEnd = (text: string, at: number): number => {
  const end = text.indexOf('\n', at)
  return end === -1 ? text.length : end
}

/**
 * Types text at the selection as the reader would, so the browser's undo
 * takes it back and the field hears its own `input`. Where the browser cannot
 * type for a page, the text is put in and `input` sent by hand.
 */
const typeText = (control: HTMLTextAreaElement, text: string): void => {
  const typed =
    typeof document.execCommand === 'function' && document.execCommand('insertText', false, text)
  if (!typed) {
    control.setRangeText(text, control.selectionStart, control.selectionEnd, 'end')
    control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }
}

/**
 * @summary A field for a short piece of code, highlighted as it is typed.
 *
 * @description
 * A `Textarea` for code: the same field in a form, with the same label, hint,
 * validation, `voice` and selection methods, drawing its text in the
 * highlighter's colors. The reader types in a real `<textarea>`, so the caret,
 * selection, undo, spellcheck being off and autofill being off are the
 * platform's, and the field works before any script loads.
 *
 * - `language` picks the grammar, such as `json`, `css`, `ts`, `html` or `sh`.
 * - The field grows with its text from `rows` lines to `max-rows`, and
 *   scrolls past them.
 * - Lines keep their length and the field scrolls sideways, unless `wrap` is
 *   `soft`.
 *
 * **The colors are the page's choice.** Helix ships no grammar, so a page
 * that wants color registers a highlighter once, the one Code Block uses:
 * `import '@fusion.dev/helix-sandbox/code-block'` registers Helix's own, or
 * `registerHighlighter` takes Shiki or Prism. Without one the code is drawn
 * plain, and `highlight` sets one for a single field.
 *
 * For a whole file, with line numbers, folding, search and problems listed by
 * line, use `Code Editor`. Code Input is for a few dozen lines in a form: a
 * setting in JSON, a style rule, a query, a template.
 *
 * **Keyboard.** Tab indents the line, or every line the selection touches,
 * and Shift+Tab takes the indent away. Enter starts the next line at the same
 * indent. Escape then Tab leaves the field, so it is never a trap for a reader
 * without a pointer.
 *
 * @since 0.216.0
 * @status experimental
 * @category forms
 * @aliases Code field, Code textarea, JSON input, Syntax highlighted input
 * @documentation https://fusion.dev/helix/components/code-input
 *
 * @slot clear-icon - Replaces the cross on the clear button, under `clearable`.
 * @slot end - After the code, for an icon or an action beside it.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the field, for content richer than the `hint` text.
 * @slot label - The label, for content richer than the `label` text.
 * @slot start - Before the code, for an icon.
 *
 * @event {Event} change - Sent from the textarea when the user finishes an edit.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired as the text changes, and cancelable.
 * @event {HelixBeforeListenEvent} helix-before-listen - The dictation button was pressed. Cancelable: cancel it to keep the field from listening.
 * @event {HelixClearEvent} helix-clear - Fired after the clear button has emptied the field, after `input` and `change`.
 * @event {HelixListenEvent} helix-listen - Dictation settled on a phrase and put it in the value, after the field's own `input`.
 * @event {Event} input - Fired after the value changes.
 *
 * @csspart clear - The button that empties the field, under `clearable`.
 * @csspart control - The textarea the reader types in, whose own text is transparent over the highlighted text.
 * @csspart feedback - The message that says what is wrong.
 * @csspart field - The box that holds the code.
 * @csspart highlight - The highlighted text, drawn under the textarea.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart label - The label above the field.
 * @csspart layers - The highlighted text and the textarea, one over the other.
 * @csspart scroller - The box that scrolls past `max-rows`, and sideways past a long line.
 * @csspart voice - The dictation button, under `voice`.
 * @csspart voice-level - The meter that draws the microphone's level in place of its glyph while the field listens, where the tier defines Voice Level.
 * @csspart voice-level-canvas - The canvas the dictation meter draws on.
 * @csspart voice-listening - The dictation button while it listens. Set alongside `voice`.
 * @csspart voice-status - What a screen reader hears as dictation starts and stops, drawn for no one else.
 *
 * @cssstate blank - The field holds no text.
 * @cssstate invalid - The control has an error to show, from the browser's validation, `validate`, or your `feedback`.
 * @cssstate listening - While the field listens for dictation. The element sets `--dictation-level` on itself meanwhile, from 0 to 1, for a meter.
 */
@customElement('helix-headless-code-input')
export class HelixHeadlessCodeInput extends HelixHeadlessTextarea {
  protected static override markRules = [SCROLLER_RULE, LAYERS_RULE, SPOKEN_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-code-input': { clearLabel: 'Leeren' } })`.
   */
  static override words = 'helix-code-input'

  /**
   * Turns the code into highlighted markup for its `language`, for this field
   * alone. Absent, the field draws with the highlighter `registerHighlighter`
   * gave the page, and plain where there is none. The markup is drawn as
   * given, so it escapes the code, as every highlighter does.
   */
  @property({ attribute: false })
  highlight?: CodeBlockHighlighter | undefined

  /** The grammar to highlight, such as `json`, `css`, `ts`, `html` or `sh`. Empty is plain text. */
  @property()
  language = ''

  /**
   * How long lines are drawn: `off` keeps each line its length and scrolls
   * sideways, as code reads, and `soft` wraps at the field's edge.
   */
  @property()
  override wrap: 'hard' | 'off' | 'soft' = 'off'

  /** Whether Escape came just before, which lets Tab leave the field. */
  private escaped = false

  /** On the page's list of elements a highlighter registration reaches. */
  protected readonly highlighting = new HighlighterController(this)

  /** The page registered another highlighter: draws again with it. */
  highlighterChanged(): void {
    this.requestUpdate()
  }

  /** The layers grow with the highlighted text, so the textarea never measures itself. */
  protected override grow(): void {}

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* Read from the field itself and not from an ancestor, so set on it. */
    const control = this.control
    control?.setAttribute('autocapitalize', 'off')
    control?.setAttribute('autocorrect', 'off')
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Held to `max-rows` in the field's own lines, through the object model,
       so a page's sheet still outranks it. */
    const scroller = this.partNamed('scroller')
    if (scroller && changed.has('maxRows')) {
      scroller.style.maxBlockSize = this.maxRows ? `${this.maxRows}lh` : ''
    }
  }

  /** The code as markup: highlighted where a highlighter reads its language, plain otherwise. */
  private markup(): string {
    const highlight = this.highlight ?? registeredHighlighter()
    /* A throw is the page's fault and must not cost the reader the code, so it
       is reported as uncaught and the code is drawn plain, as Code Block does. */
    try {
      const markup =
        highlight && this.value !== '' ? highlight(this.value, this.language) : undefined
      if (markup !== undefined) {
        return highlightedLines(markup)
      }
    } catch (error) {
      globalThis.reportError?.(error)
    }
    return escapeText(this.value)
  }

  /** Indents or outdents every line the selection touches, and keeps them selected. */
  private shift(control: HTMLTextAreaElement, outdent: boolean): void {
    const text = control.value
    const start = lineStart(text, control.selectionStart)
    const end = lineEnd(text, Math.max(control.selectionStart, control.selectionEnd - 1))
    const lines = text.slice(start, end).split('\n')
    const next = lines.map((line) =>
      outdent ? line.replace(/^(?: {1,2}|\t)/, '') : `${INDENT}${line}`,
    )
    const block = next.join('\n')
    if (block === text.slice(start, end)) {
      return
    }
    control.setSelectionRange(start, end)
    typeText(control, block)
    control.setSelectionRange(start, start + block.length)
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const control = event.target as HTMLTextAreaElement
    if (event.key === 'Escape') {
      this.escaped = true
      return
    }
    const escaped = this.escaped
    this.escaped = false
    if (
      this.readOnly ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !(control instanceof HTMLTextAreaElement)
    ) {
      return
    }
    if (event.key === 'Tab' && !escaped) {
      event.preventDefault()
      const { selectionEnd, selectionStart, value } = control
      if (event.shiftKey || value.slice(selectionStart, selectionEnd).includes('\n')) {
        this.shift(control, event.shiftKey)
      } else {
        typeText(control, INDENT)
      }
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      const { selectionStart, value } = control
      const indent = /^[ \t]*/.exec(value.slice(lineStart(value, selectionStart), selectionStart))
      if (indent?.[0]) {
        event.preventDefault()
        typeText(control, `\n${indent[0]}`)
      }
    }
  }

  /**
   * The textarea over its highlighted text. The text ends in a space where
   * the code ends in a line break, or the highlight would be a line shorter
   * than the textarea and the caret on the last line would sit below it.
   */
  protected override renderControl(): TemplateResult {
    const tail = this.value === '' || this.value.endsWith('\n') ? ' ' : ''
    return html`<div part="scroller" data-scroller>
      <div
        part="layers"
        data-layers
        ?data-wrap=${this.wrap !== 'off'}
        spellcheck="false"
        translate="no"
        @keydown=${this.handleKeydown}
      >
        <pre part="highlight" aria-hidden="true">${keyedLines(this.markup())}${tail}</pre>
        ${super.renderControl()}
      </div>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-code-input': HelixHeadlessCodeInput
  }
}
