import { customElement, HelixElement, reportRuntime } from '@fusion.dev/helix-core'
import {
  type CSSResultGroup,
  css,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from 'lit'
import { property } from 'lit/decorators.js'
import { typedMarks } from '../marks.js'

/**
 * @summary A short quotation, set inline with the text around it.
 *
 * @description
 * Renders a real `<q>`, so the browser supplies the quotation marks. It inserts
 * the correct marks for the document's language and nests them correctly when
 * one quotation sits inside another. A quotation that starts or ends with a
 * typed mark warns once, with the runtime kind `typed-marks`.
 *
 * **`no-marks` leaves the marks off**, for a quotation whose marks the page
 * draws itself, such as marks set in an accent color. The quotation still counts toward nesting, so a quote
 * inside it takes the inner marks it would have had. Text with marks typed
 * into it raises no warning under `no-marks`.
 *
 * For a passage set off from the surrounding text, including a pull quote, use
 * a blockquote.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Q, InlineQuote
 * @use A quotation inside a sentence.
 * @instead blockquote - A passage set apart, including a pull quote.
 * @anatomy quote
 * @practice Leave quotation marks out of the text. - The browser draws the marks for the language, so a typed one shows twice.
 * @practice {languages} Write the language on a quotation in another language, such as `lang="fr"`. - Its marks follow it, so `lang="fr"` sets «…» inside an English page.
 * @documentation https://fusion.dev/design/components/quote
 *
 * @slot - The quoted text.
 *
 * @csspart quote - The quotation.
 */
@customElement('helix-headless-quote')
export class HelixHeadlessQuote extends HelixElement {
  /* `no-open-quote` draws nothing and still counts the level, so a quote
     nested inside one without marks takes the inner marks. */
  static override styles: CSSResultGroup = css`
    :host([no-marks]) [part='quote']::before {
      content: no-open-quote;
    }

    :host([no-marks]) [part='quote']::after {
      content: no-close-quote;
    }
  `

  /**
   * URL identifying where the quotation came from.
   */
  @property()
  cite = ''

  /**
   * Whether to leave the quotation marks off, for a quotation set where the
   * page draws its own.
   *
   * Negative, because the marks are on by default and a boolean attribute is
   * true whenever it is present. Reflected, because a stylesheet takes the
   * marks off on it.
   */
  @property({ attribute: 'no-marks', reflect: true, type: Boolean })
  noMarks = false

  /** Whether this quote has said its text carries typed marks, so it says so once. */
  private warned = false

  /**
   * Reads the quoted text as it first renders and as it changes, for marks the
   * `<q>` would double. On the shadow root rather than in the template, so the
   * served markup is the `<q>` and its slot and nothing else.
   */
  private readonly readText = (): void => {
    const text = [...this.childNodes]
      .filter((node) => !(node instanceof Element) || !node.slot)
      .map((node) => node.textContent ?? '')
      .join('')
    if (this.warned || this.noMarks || !typedMarks(text)) {
      return
    }
    this.warned = true
    reportRuntime({
      kind: 'typed-marks',
      message: `<${this.localName}> starts or ends with a typed quotation mark, and the browser sets its own, so the marks show twice. Take the typed marks out.`,
      tag: this.localName,
    })
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.readText()
    this.renderRoot.addEventListener('slotchange', this.readText)
  }

  protected override render(): TemplateResult {
    return html`<q part="quote" cite=${this.cite || nothing}><slot></slot></q>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-quote': HelixHeadlessQuote
  }
}
