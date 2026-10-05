import { customElement, HelixElement, reportRuntime } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { typedMarks } from '../marks.js'

/**
 * @summary A short quotation, set inline with the text around it.
 *
 * @description
 * Renders a real `<q>`, so the browser supplies the quotation marks. It inserts
 * the correct marks for the document's language and nests them correctly when
 * one quotation sits inside another. Do not type quotation marks into the
 * content: one that starts or ends with a typed mark warns once, with the
 * runtime kind `typed-marks`. A quotation in a language other than the page's takes `lang` on the
 * element, and its marks follow it: `lang="de"` sets „…“ and `lang="fr"` «…»
 * inside an English page.
 *
 * For a passage set off from the surrounding text, use a blockquote.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Q, InlineQuote
 * @documentation https://fusion.dev/helix/components/quote
 *
 * @slot - The quoted text.
 *
 * @csspart quote - The quotation.
 */
@customElement('helix-headless-quote')
export class HelixHeadlessQuote extends HelixElement {
  /**
   * URL identifying where the quotation came from.
   */
  @property()
  cite = ''

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
    if (this.warned || !typedMarks(text)) {
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
