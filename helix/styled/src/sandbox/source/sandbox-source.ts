import {
  customElement,
  HelixBeforeEditEvent,
  HelixCaretEvent,
  HelixElement,
  onUnlessFalse,
  restoreValue,
} from '@fusion.dev/helix-core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './sandbox-source.css.js'

/**
 * @summary Editable source for a sandbox preview.
 *
 * @description
 * A real `<textarea>`, not a contenteditable div with a syntax highlighter over
 * it. Undo, selection, spellcheck suppression, mobile keyboards, and screen
 * reader support all come from the platform, and every one of them is
 * expensive to rebuild and easy to get subtly wrong.
 *
 * Tab inserts two spaces rather than leaving the field, because a code pane
 * that cannot indent is not one. Escape then Tab still moves focus out, which
 * is the documented escape hatch for exactly this trade.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Editor, Code pane
 * @documentation https://helix.fusion.dev/sandbox/source
 *
 * @event {HelixBeforeEditEvent} helix-before-edit - Fired before the source is edited. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixCaretEvent} helix-caret - Fired when the cursor moves.
 *
 * @csspart source - The editable region.
 *
 * @cssproperty --sandbox-source-background-color - Fill behind the source.
 * @cssproperty --sandbox-source-min-block-size - Minimum height of the pane.
 */
@customElement('helix-sandbox-source')
export class HelixSandboxSource extends HelixElement {
  /**
   * The source being edited.
   */
  @property()
  value = ''

  /**
   * Which source this pane holds, echoed in every `helix-before-edit`.
   *
   * `html` and `css` are what the sandbox root routes on; any other name is
   * passed through untouched for a consumer wiring their own panes.
   *
   * Not reflected: nothing selects on it, so it keeps a real default instead.
   */
  @property()
  name = 'html'

  /**
   * Accessible name for the editable region.
   */
  @property({ attribute: 'field-label' })
  fieldLabel = 'Example source'

  /**
   * Whether Tab indents rather than moving focus.
   */
  @property({ attribute: 'tab-indents', converter: onUnlessFalse })
  tabIndents = true

  /** Set by Escape, so the next Tab leaves the field. */
  private escaped = false

  /**
   * Reports where the cursor is, for a status bar to read.
   *
   * **The shipped shell could not fill its own readout before this.**
   * `SandboxRoot` binds a `helix-caret` listener and writes `line` and `column`
   * onto every slotted status bar, and `SandboxStatusBar` renders a `caret` part
   * as soon as it has both, and both of those ship from `@fusion.dev/helix`. The one
   * pane that reported a position was `SandboxEditor`, which is in
   * `@fusion.dev/helix-sandbox` and is `private` while Helix is pre-release. So a
   * consumer taking the published shell and this pane got a status bar that
   * could never show a position, and the only fix available to them was a
   * package they cannot install.
   *
   * That is the gap rather than a dead event: the editor has dispatched this
   * since it was written, and `check:events` has always seen it. What was
   * missing was the half of the pair that ships.
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
   * **This was the other way round, so `helix-before-edit` was a `before` event
   * that had already happened.** The value was assigned and the request
   * dispatched after it, which means `preventDefault()` was accepted and
   * ignored: a consumer refusing an edit kept the old value in their handler and
   * the pane held the new one. Every other `before` event in this library is
   * announced first and applied only if the request stands, and this is that.
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
   * The one place an edit is taken, so a refusal cannot be forgotten at one of them.
   *
   * Two paths reach it, a keystroke and the tab that indents, and the second had
   * the same fault as the first with its own copy of the code.
   */
  private edit(field: HTMLTextAreaElement, next: string): void {
    const request = new HelixBeforeEditEvent({ value: next })
    if (this.dispatchEvent(request)) {
      this.value = next
    }
    restoreValue(field, this.value)
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.escaped = true
      return
    }

    if (event.key !== 'Tab' || !this.tabIndents || this.escaped) {
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
    return html`<textarea
      part="source"
      aria-label=${this.fieldLabel}
      spellcheck="false"
      .value=${this.value}
      @focus=${this.reportCaret}
      @input=${this.handleInput}
      @keydown=${this.handleKeydown}
      @keyup=${this.reportCaret}
      @pointerup=${this.reportCaret}
    ></textarea>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-source': HelixSandboxSource
  }
}
