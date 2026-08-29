import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import '../../copy-button/index.js'

/**
 * @summary A block of code, with somewhere to put its name and a way to take it.
 *
 * @description
 * **`<pre><code>` and nothing cleverer.** The pair is what the platform means
 * by a block of code: `pre` keeps the whitespace, `code` says what the
 * whitespace is for, and losing either one loses something no styling puts
 * back. Indentation in a `div` is a paragraph with odd spacing.
 *
 * **It scrolls rather than wraps.** A wrapped line of code is a lie about where
 * the line ends, and in a language where a line break can be significant it is
 * a lie that costs someone an afternoon. The box takes its own scrollbar.
 *
 * **The copy button is here because the alternative is selecting it by hand.**
 * Every consumer would otherwise put one there, slightly differently, and the
 * one that forgot would be the one with the longest snippet. It is on unless
 * `no-copy` says otherwise, and takes its text from the slot rather than from a
 * property, so there is no second copy of the code to keep in step.
 *
 * A `Code` for a fragment inside a sentence. Separate families, because one
 * flows with prose and the other is a figure.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Code block, Snippet, Pre
 * @documentation https://helix.fusion.dev/components/code-block
 *
 * @slot - The code.
 *
 * @csspart block - The scrolling `<pre>`.
 * @csspart code - The `<code>` inside it.
 * @csspart copy - The copy button.
 * @csspart copy-button - The inner button.
 * @csspart copy-mark - The clipboard glyph, and the confirmation that replaces it.
 * @csspart copy-tooltip - The bubble, forwarded from the tooltip inside.
 * @csspart copy-tooltip-arrow - The point, resting against the trigger.
 * @csspart frame - The code and the copy button beside it.
 * @csspart header - The bar carrying the name, where there is one.
 * @csspart label - The file name or language, where one is given.
 */
@customElement('helix-headless-code-block')
export class HelixHeadlessCodeBlock extends HelixElement {
  /**
   * What to call this block, usually a file name or a language.
   */
  @property()
  label = ''

  /**
   * Whether to leave the copy button off.
   *
   * Negative, which is not a style choice. A boolean attribute is true whenever
   * it is *present*, so a `copyable` defaulting to true could never be turned
   * off from markup: `copyable="false"` is the string "false", which is
   * present, which is true. Measured, and it is why this is named the other way
   * round. The platform already writes booleans like this for the same reason,
   * `novalidate` and `nomodule` and `noreferrer` among them.
   *
   * **Reflected, because the gutter is a stylesheet rule.** `code-block.css`
   * reserves the copy button's width with `:host(:not([no-copy]))`, so the
   * attribute is what decides whether the block pays for a control. Unreflected,
   * setting it from script takes the button away (`render` reads the property)
   * and leaves the 40px it stood in reserved.
   *
   * A false boolean reflects as the attribute's absence, so this costs no
   * `no-copy=""` on hosts that never asked for one, and the rule about a
   * reflected property taking no default is satisfied by the default being
   * `false`.
   */
  @property({ attribute: 'no-copy', reflect: true, type: Boolean })
  noCopy = false

  /**
   * The code as text, read from the slot rather than stored.
   *
   * Client only, and it has to be: the server has no children to read. The
   * copy button is a client-side affordance anyway, so nothing is lost, and
   * taking the text from a property instead would be a second copy of the code
   * that goes stale the moment the slot changes.
   */
  private get text(): string {
    const slot = this.renderRoot?.querySelector('slot')
    return (slot?.assignedNodes() ?? []).map((node) => node.textContent ?? '').join('')
  }

  /**
   * One more render, once there is a slot to read.
   *
   * The first render has no shadow children yet, so `text` is empty and the
   * copy button is bound to nothing. `slotchange` normally schedules the render
   * that fixes it, and leaning on that alone was measured to leave the button
   * empty through four update cycles: the event is not guaranteed to have
   * arrived, and in one environment never arrives at all. A component should not
   * need an event to show its own content, so it asks for the second render
   * itself and `slotchange` is left to handle the case it is actually for, which
   * is content changing later.
   */
  protected override firstUpdated(): void {
    this.requestUpdate()
  }

  protected override render(): TemplateResult {
    /* The copy button sits beside the code, not in a bar above it. In the
       header, a block with nothing to call itself still draws a full-width bar
       to hold one button, so a `Usage` section of one-line imports is a run of
       empty strips. Beside the code, the header exists only when there is a
       name to put in it. */
    return html`${
      this.label ? html`<div part="header"><span part="label">${this.label}</span></div>` : nothing
    }
      <div part="frame">
        <pre part="block"><code part="code"><slot @slotchange=${() =>
          this.requestUpdate()}></slot></code></pre>
        ${this.noCopy ? nothing : this.renderCopyButton()}
      </div>`
  }

  /**
   * The button that takes the code, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own
   * copy control, wrap this one, or pass it something the base does not know
   * about, without reimplementing the whole template to do it. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * base button, and a styled subclass that sets `tier` renders the styled one
   * from the same template.
   */
  protected renderCopyButton(): TemplateResult {
    return html`<${this.tag('copy-button')}
      part="copy"
      exportparts="button: copy-button, mark: copy-mark, tooltip: copy-tooltip,
        tooltip-arrow: copy-tooltip-arrow"
      label="Copy code"
      .value=${this.text}
    ></${this.tag('copy-button')}>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-code-block': HelixHeadlessCodeBlock
  }
}
