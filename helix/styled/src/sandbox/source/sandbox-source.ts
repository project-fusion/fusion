import {
  customElement,
  HelixBeforeEditEvent,
  HelixCaretEvent,
  HelixEditEvent,
  HelixElement,
  onUnlessFalse,
  restoreValue,
} from '@fusion.dev/helix-core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { drawnRuns, type SandboxToken, type SandboxTokenizer } from '../tokens.js'
import { styles } from './sandbox-source.css.js'

/** Keys that only ever modify another, and so are not a press of their own. */
const MODIFIERS = new Set(['Alt', 'AltGraph', 'Control', 'Meta', 'Shift'])

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
 * @since 0.1.0
 * @status stable
 * @aliases Editor, Code pane
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @event {HelixBeforeEditEvent} helix-before-edit - Fired before the source is edited. Cancelable: cancel it to keep the source unchanged.
 * @event {HelixCaretEvent} helix-caret - Fired when the cursor moves.
 * @event {HelixEditEvent} helix-edit - Fired after the source was edited, with the new source.
 *
 * @csspart field - The box that scrolls the field and its colors together, under `tokenize`.
 * @csspart highlight - The colored copy of the source drawn under the field, under `tokenize`.
 * @csspart source - The editable region.
 * @csspart token - One run of the source that has a kind, under `tokenize`.
 *
 * @cssproperty --sandbox-source-background-color - Fill behind the source.
 * @cssproperty --sandbox-source-callable-color - Color of a `callable` run, under `tokenize`. Defaults to `--helix-color-syntax-callable`.
 * @cssproperty --sandbox-source-comment-color - Color of a `comment` run, under `tokenize`. Defaults to `--helix-color-syntax-comment`.
 * @cssproperty --sandbox-source-constant-color - Color of a `constant` run, under `tokenize`. Defaults to `--helix-color-syntax-constant`.
 * @cssproperty --sandbox-source-invalid-color - Color of an `invalid` run, under `tokenize`. Defaults to `--helix-color-syntax-invalid`.
 * @cssproperty --sandbox-source-keyword-color - Color of a `keyword` run, under `tokenize`. Defaults to `--helix-color-syntax-keyword`.
 * @cssproperty --sandbox-source-min-block-size - Minimum height of the pane.
 * @cssproperty --sandbox-source-name-color - Color of a `name` run, under `tokenize`. Defaults to `--helix-color-syntax-name`.
 * @cssproperty --sandbox-source-string-color - Color of a `string` run, under `tokenize`. Defaults to `--helix-color-syntax-string`.
 * @cssproperty --sandbox-source-tag-color - Color of a `tag` run, under `tokenize`. Defaults to `--helix-color-syntax-tag`.
 */
@customElement('helix-sandbox-source')
export class HelixSandboxSource extends HelixElement {
  /**
   * The editable region's name, read by screen readers.
   */
  @property({ attribute: 'field-label' })
  fieldLabel = 'Example source'

  /**
   * The field's description, read by screen readers while Tab indents.
   */
  @property({ attribute: 'keys-description' })
  keysDescription =
    'Tab inserts two spaces. To leave, press Escape and then Tab, or press Shift+Tab to go back.'

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
  }

  /**
   * The one place an edit is taken, so a refusal cannot be forgotten at one of
   * them. Two paths reach it, a keystroke and the tab that indents.
   */
  private edit(field: HTMLTextAreaElement, next: string): void {
    const request = new HelixBeforeEditEvent({ value: next })
    const accepted = this.dispatchEvent(request)
    if (accepted) {
      this.value = next
    }
    restoreValue(field, this.value)
    if (accepted) {
      this.dispatchEvent(new HelixEditEvent({ value: next }))
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.escaped = true
      return
    }
    /* A modifier on its own is the first half of a chord, and pressing Shift
       to go back after Escape must not undo the Escape. */
    if (MODIFIERS.has(event.key)) {
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
    const field = event.target as HTMLTextAreaElement
    const { selectionEnd, selectionStart, value } = field
    field.value = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`
    field.selectionStart = selectionStart + 2
    field.selectionEnd = field.selectionStart
    this.edit(field, field.value)
  }

  protected override render(): TemplateResult {
    const field = this.renderField()
    if (!this.tokenize) {
      return field
    }
    /* A throw is the page's fault and must not cost the reader the field, so
       it is reported as uncaught and the source is drawn plain, as runs that
       do not add up are. */
    let given: readonly SandboxToken[] = []
    try {
      given = this.tokenize(this.value, this.name)
    } catch (error) {
      globalThis.reportError?.(error)
    }
    /* The trailing newline gives a last empty line its height, as the field
       gives it one. */
    const runs = drawnRuns(this.value, given)
    return html`<div part="field">
      <pre part="highlight" aria-hidden="true">${runs.map(({ kind, text }) =>
        kind ? html`<span part="token" data-kind=${kind}>${text}</span>` : text,
      )}${'\n'}</pre>
      ${field}
    </div>`
  }

  /** The field itself and its description, which is the whole pane without `tokenize`. */
  private renderField(): TemplateResult {
    return html`<textarea
      part="source"
      aria-label=${this.fieldLabel}
      aria-describedby=${this.tabIndents ? 'keys' : nothing}
      spellcheck="false"
      .value=${this.value}
      @focus=${this.reportCaret}
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
