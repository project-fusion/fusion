import {
  customElement,
  HelixBeforeEditEvent,
  HelixCaretEvent,
  HelixElement,
  onUnlessFalse,
} from '@helix-io/core'
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
 * @csspart source - The editable region.
 *
 * @event {HelixCaretEvent} helix-caret - Fired when the cursor moves.
 * @event {HelixBeforeEditEvent} helix-before-edit - Fired when the source is edited.
 *
 * @cssproperty --sandbox-source-background - Fill behind the source.
 * @cssproperty --sandbox-source-min-block-size - Minimum height of the pane.
 */
@customElement('helix-sandbox-source')
export class HelixSandboxSource extends HelixElement {
  /** The source being edited. */
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

  /** Accessible name for the editable region. */
  @property({ attribute: 'field-label' })
  fieldLabel = 'Example source'

  /** Whether Tab indents rather than moving focus. */
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
   * as soon as it has both, and both of those ship from `@helix-io/styled`. The one
   * pane that reported a position was `SandboxEditor`, which is in
   * `@helix-io/sandbox` and is `private` while Helix is pre-release. So a
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

  private readonly handleInput = (event: Event): void => {
    this.value = (event.target as HTMLTextAreaElement).value
    this.dispatchEvent(new HelixBeforeEditEvent({ property: 'value', value: this.value }))
    this.reportCaret(event)
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
    this.value = field.value
    this.dispatchEvent(new HelixBeforeEditEvent({ property: 'value', value: this.value }))
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
