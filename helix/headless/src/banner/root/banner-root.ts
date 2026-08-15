import { customElement, HelixDismissEvent, HelixElement, hostAria } from '@helix-io/core'
import { x } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary A page-level message above the masthead, which can be dismissed.
 *
 * @description
 * Chrome rather than content. A banner sits above the header and speaks for the
 * whole page: a trial ending, a service degraded, a change of terms. A passage
 * that interrupts a document to set itself apart is a `Callout`, which is read
 * where it sits and cannot be dismissed. Neither is a variant of the other.
 *
 * **Always a polite live region.** `role="alert"` is assertive and interrupts
 * whatever is being read, which is right for something that appears mid-session
 * and wrong for something that was in the served HTML: an assertive banner
 * would cut across a screen-reader user on every page load, before they had
 * read anything. Politeness costs a moment and is never wrong; the severity
 * does not change that, because an error that was always there is still not an
 * interruption.
 *
 * Dismissing is a request. The banner does not remove itself, because the
 * consumer owns the markup and taking the node out from under them would put
 * their state and the document out of step. `preventDefault()` on the
 * `helix-dismiss` is a refusal.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Announcement, Notification bar, Alert bar
 * @documentation https://helix.fusion.dev/components/banner
 *
 * @slot - The message.
 * @slot actions - What to do about it, usually a link or a button.
 * @slot icon - Replaces the glyph inside the dismiss control.
 *
 * @csspart content - The message region.
 * @csspart actions - The trailing action region.
 * @csspart dismiss - The control that asks to close.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the reader asks to close it.
 */
@customElement('helix-base-banner')
export class HelixBaseBanner extends HelixElement {
  /** What kind of attention the message needs. */
  @property({ reflect: true })
  severity?: 'info' | 'success' | 'warning' | 'danger'

  /** Whether the reader can close it. */
  @property({ reflect: true, type: Boolean })
  dismissible = false

  /** Accessible name for the dismiss control. */
  @property({ attribute: 'dismiss-label' })
  dismissLabel = 'Dismiss'

  private readonly handleDismiss = (): void => {
    this.dispatchEvent(new HelixDismissEvent({ label: this.textContent?.trim() ?? '' }))
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, and always polite. See the note above on `role="alert"`.
    hostAria(this.internals, { role: 'status' })
    this.internals.ariaLive = 'polite'
  }

  protected override render(): TemplateResult {
    return html`<div part="content"><slot></slot></div>
      <div part="actions"><slot name="actions"></slot></div>
      ${
        this.dismissible
          ? html`<button
              part="dismiss"
              type="button"
              aria-label=${this.dismissLabel}
              @click=${this.handleDismiss}
            >
              <slot name="icon">
                <svg viewBox=${x.viewBox} fill="currentColor" aria-hidden="true">
                  ${unsafeSVG(x.content)}
                </svg>
              </slot>
            </button>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-banner': HelixBaseBanner
  }
}
