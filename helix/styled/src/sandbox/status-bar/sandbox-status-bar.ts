import { customElement, HelixElement } from '@fusion.dev/helix-core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './sandbox-status-bar.css.js'

/**
 * How a language is written out, for the ones an editor knows.
 *
 * A map rather than the raw value, because `html` in a status bar reads as a
 * variable name where `HTML` reads as a language. Anything unlisted shows as
 * given, so a consumer naming their own language is not silently blanked.
 */
const LABELS: Record<string, string> = {
  css: 'CSS',
  html: 'HTML',
  javascript: 'JavaScript',
  tsx: 'TSX',
}

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

  /** How the position reads, or nothing when there is no cursor to report. */
  private get position(): string | undefined {
    if (this.line === undefined || this.column === undefined) {
      return undefined
    }
    return `Ln ${this.line}, Col ${this.column}`
  }

  protected override render(): TemplateResult {
    const language = this.language
    const position = this.position

    return html`<slot></slot>
      ${position === undefined ? nothing : html`<span part="caret">${position}</span>`}
      ${
        language === undefined
          ? nothing
          : html`<span part="language">${
              /* `Object.hasOwn`, not a truthy index. `LABELS[language]` reaches
                 `Object.prototype`, and every inherited key comes back truthy,
                 so `language="constructor"` painted the whole source of
                 `Object` into the bar where the fallback should have put the
                 word back unchanged. This is any string a consumer writes, not
                 a union, which is what makes the reach ordinary rather than
                 contrived. `Text` records the same trap over its tag map. */
              Object.hasOwn(LABELS, language) ? LABELS[language] : language
            }</span>`
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
