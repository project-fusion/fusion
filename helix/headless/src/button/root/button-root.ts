import { customElement, HelixFormElement } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Triggers an action, submits a form, or navigates.
 *
 * @description
 * Renders a real `<button>`, or an `<a>` when `href` is set, so activation,
 * focus, and the browser's own affordances come from the platform rather than
 * from key handlers. `delegatesFocus` puts focus on that inner control, and it
 * serializes into the server's markup, so the button is keyboard reachable
 * before any JavaScript loads.
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
 * @csspart button - The inner button or anchor.
 */
@customElement('helix-base-button')
export class HelixBaseButton extends HelixFormElement {
  // None of these reflect. Reflection exists so CSS can select on a value, and
  // no rule selects on any of them; reflecting instead writes the destination
  // onto a host that is not a link, and puts empty `target` and `rel`
  // attributes into every button's markup.

  /** What activating the button does to its form. */
  @property()
  type: 'button' | 'submit' | 'reset' = 'button'

  /** Navigates to this URL instead of acting on a form. */
  @property()
  href = ''

  /** Browsing context for `href`, such as `_blank`. */
  @property()
  target = ''

  /** Relationship of the linked URL, defaulted when `target` opens a new tab. */
  @property()
  rel = ''

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

  /**
   * `rel` as sent, including the safety default.
   *
   * A new browsing context gets `noreferrer noopener` unless the consumer said
   * otherwise, because without it the opened page can reach back through
   * `window.opener`.
   */
  private get resolvedRel(): string {
    if (this.rel) {
      return this.rel
    }
    return this.target === '_blank' ? 'noreferrer noopener' : ''
  }

  private readonly handleClick = (event: MouseEvent): void => {
    if (this.disabled) {
      // A disabled anchor still dispatches clicks, so the guard is what makes
      // the link inert rather than merely dimmed.
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }

    if (this.href || this.type === 'button') {
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

  protected override render(): TemplateResult {
    const label = html`<slot name="start"></slot><slot></slot><slot name="end"></slot>`

    if (this.href) {
      return html`<a
        part="button"
        aria-label=${this.label || nothing}
        href=${this.disabled ? nothing : this.href}
        target=${this.target || nothing}
        rel=${this.resolvedRel || nothing}
        role=${this.disabled ? 'link' : nothing}
        aria-disabled=${this.disabled ? 'true' : nothing}
        tabindex=${this.disabled ? '-1' : nothing}
        @click=${this.handleClick}
        >${label}</a
      >`
    }

    return html`<button
      part="button"
      type="button"
      aria-label=${this.label || nothing}
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
