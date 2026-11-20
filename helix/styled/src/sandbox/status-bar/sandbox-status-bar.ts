import { customElement, formatWords, HelixElement, words } from '@fusion.dev/helix-core'
import { languageName } from '@fusion.dev/helix-core/sandbox'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './sandbox-status-bar.generated.css.js'

/**
 * @summary A bar that shows the cursor position and the language being edited.
 *
 * @description
 * Shows the caret position. The editor dispatches `helix-caret` on every
 * keystroke and arrow press, and the sandbox writes the position to the status
 * bar. The position does not pass through your framework, so React state does
 * not re-render the sandbox on every cursor move.
 *
 * **The status bar is not a live region.** The readout changes on every
 * keystroke, and announcing it would interrupt screen reader users as they
 * type. It is text that screen reader users can navigate to.
 *
 * A readout with no value is not rendered, so the bar has no empty gap.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Status line
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @slot - Items at the start of the bar.
 * @slot end - Items after the readouts, at the end of the bar.
 *
 * @csspart caret - The line and column readout.
 * @csspart language - The language readout.
 *
 * @cssproperty --sandbox-status-bar-color - Color of the bar's text.
 */
@customElement('helix-sandbox-status-bar')
export class HelixSandboxStatusBar extends HelixElement {
  /**
   * The key this part's words are registered under, its tag:
   * `registerWords('de', { 'helix-sandbox-status-bar': { positionLabel: 'Z. {line}, Sp. {column}' } })`.
   */
  static words = 'helix-sandbox-status-bar'

  /**
   * One-based column of the cursor.
   *
   * Absent shows no readout.
   */
  @property({ type: Number })
  column?: number

  /**
   * The language being edited, as a name or one the editor knows.
   */
  @property()
  language?: string

  /**
   * One-based line of the cursor.
   *
   * Absent shows no readout.
   */
  @property({ type: Number })
  line?: number

  /**
   * How the cursor's place reads. `{line}` and `{column}` are the line and
   * the column, written as an editor writes them, without grouping.
   */
  @words
  @property({ attribute: 'position-label' })
  positionLabel = 'Ln {line}, Col {column}'

  /** How the position reads, or nothing when there is no cursor to report. */
  private get position(): string | undefined {
    if (this.line === undefined || this.column === undefined) {
      return undefined
    }
    return formatWords(this, 'positionLabel', {
      column: String(this.column),
      line: String(this.line),
    })
  }

  protected override render(): TemplateResult {
    const language = this.language
    const position = this.position

    return html`<slot></slot>
      ${position === undefined ? nothing : html`<span part="caret">${position}</span>`}
      ${
        language === undefined
          ? nothing
          : html`<span part="language">${languageName(language)}</span>`
      }
      <slot name="end"></slot>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-status-bar': HelixSandboxStatusBar
  }
}
