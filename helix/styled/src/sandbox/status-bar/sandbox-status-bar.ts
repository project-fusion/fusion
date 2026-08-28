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
 * @summary Reports where the cursor is and what is being edited.
 *
 * @description
 * Slotted into a sandbox, which feeds it: the editor dispatches `helix-caret`
 * on every keystroke and every arrow press, the sandbox hears it and writes the
 * position here. Nothing about that reaches the consumer's framework, which is
 * the point. A caret position routed through React state would re-render the
 * workbench on every cursor move, to update two numbers.
 *
 * **Not a live region.** The readout changes on every keystroke, so announcing
 * it would talk over the reader continuously while they type. It is text they
 * can navigate to, which is what a status bar is in every editor that has one.
 *
 * A readout with nothing to say is not rendered at all rather than rendered
 * empty, or the bar keeps a gap where a value is not.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Status line
 * @documentation https://helix.fusion.dev/sandbox/status-bar
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
          : html`<span part="language">${LABELS[language] ?? language}</span>`
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
