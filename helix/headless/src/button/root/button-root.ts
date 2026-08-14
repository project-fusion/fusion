import { customElement, HelixFormElement } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Triggers an action, submits a form, or navigates.
 *
 * @description
 * Renders a real `<button>`, so activation, focus, and the browser's own
 * affordances come from the platform rather than from key handlers.
 *
 * **It never renders an anchor.** A router has to render its own `<a>` to
 * intercept a click and cannot render one inside this shadow root, so a button
 * that could also be a link forced every such navigation to be a full page
 * load. A link that looks like a button is styling rather than behavior, so it
 * is a recipe in the base layer: `<Link data-button="primary">` is the same
 * control, and the consumer keeps their anchor.
 *
 * `delegatesFocus` puts focus on the inner control, and it serializes into the
 * server's markup, so the button is keyboard reachable before any JavaScript
 * loads.
 *
 * Form submission is explicit. A `<button type="submit">` inside a shadow root
 * submits nothing, because the form is on the other side of the boundary, so
 * the inner control is always `type="button"` and this element calls
 * `requestSubmit()` on its form instead. That routes through validation, unlike
 * `submit()`.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/button
 *
 * @slot - The button's label.
 * @slot start - Content before the label, usually an icon.
 * @slot end - Content after the label.
 *
 * @csspart button - The inner control.
 */
@customElement('helix-base-button')
export class HelixBaseButton extends HelixFormElement {
  /** What activating the button does to its form. */
  @property()
  type: 'button' | 'submit' | 'reset' = 'button'

  /**
   * Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   */
  @property()
  label = ''

  /** Moves focus to the inner control, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private readonly handleClick = (): void => {
    if (this.type === 'button') {
      return
    }

    const { form } = this
    if (!form) {
      return
    }

    if (this.type === 'submit') {
      form.requestSubmit()
    } else {
      form.reset()
    }
  }

  /**
   * Whether the button holds its group's tab stop.
   *
   * A toolbar keeps one tab stop across its children, and the obvious way to do
   * that is to write `tabindex` onto each of them. That is a change to markup
   * the consumer rendered, so a React consumer's hydration reports it and does
   * not patch it up. A parent sets this property instead, which writes nothing,
   * and the stop lands on the inner control inside the shadow root.
   *
   * No attribute, because it is coordination between elements rather than
   * anything a consumer sets.
   */
  @property({ attribute: false })
  focusable = true

  protected override render(): TemplateResult {
    const label = html`<slot name="start"></slot><slot></slot><slot name="end"></slot>`
    const stop = this.focusable ? nothing : '-1'

    return html`<button
      part="button"
      type="button"
      aria-label=${this.label || nothing}
      tabindex=${stop}
      ?disabled=${this.disabled}
      @click=${this.handleClick}
    >
      ${label}
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-button': HelixBaseButton
  }
}
