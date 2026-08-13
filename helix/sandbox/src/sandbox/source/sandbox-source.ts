import { customElement, HelixElement, HelixSourceChangeEvent } from '@helix-io/core'
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
 * @event {HelixSourceChangeEvent} SourceChange - Fired when the source is edited.
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
   * Which source this pane holds, echoed in every `SourceChange`.
   *
   * `html` and `css` are what the sandbox root routes on; any other name is
   * passed through untouched for a consumer wiring their own panes.
   */
  @property({ reflect: true })
  name = 'html'

  /** Accessible name for the editable region. */
  @property({ attribute: 'field-label' })
  fieldLabel = 'Example source'

  /** Whether Tab indents rather than moving focus. */
  @property({ attribute: 'tab-indents', reflect: true, type: Boolean })
  tabIndents = true

  /** Set by Escape, so the next Tab leaves the field. */
  private escaped = false

  private readonly handleInput = (event: Event): void => {
    this.value = (event.target as HTMLTextAreaElement).value
    this.dispatchEvent(new HelixSourceChangeEvent({ name: this.name, value: this.value }))
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
    this.dispatchEvent(new HelixSourceChangeEvent({ name: this.name, value: this.value }))
  }

  protected override render(): TemplateResult {
    return html`<textarea
      part="source"
      aria-label=${this.fieldLabel}
      spellcheck="false"
      .value=${this.value}
      @input=${this.handleInput}
      @keydown=${this.handleKeydown}
    ></textarea>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-source': HelixSandboxSource
  }
}
