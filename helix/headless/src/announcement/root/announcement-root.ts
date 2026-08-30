import {
  customElement,
  HelixElement,
  hostAria,
  MixinDismissible,
  slotFilled,
} from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary A page-level message above the masthead, which can be dismissed.
 *
 * @description
 * Chrome rather than content. An announcement sits above the header and speaks
 * for the whole page: a trial ending, a service degraded, a change of terms. A
 * passage that interrupts a document to set itself apart is a `Callout`, which
 * is read where it sits and cannot be dismissed. Neither is a variant of the
 * other.
 *
 * **Always a polite live region.** `role="alert"` is assertive and interrupts
 * whatever is being read, which is right for something that appears mid-session
 * and wrong for something that was in the served HTML: an assertive
 * announcement would cut across a screen-reader user on every page load, before
 * they had read anything. Politeness costs a moment and is never wrong; the tone
 * does not change that, because an error that was always there is still not an
 * interruption.
 *
 * Dismissing is a request. The announcement does not remove itself, because the
 * consumer owns the markup and taking the node out from under them would put
 * their state and the document out of step. `preventDefault()` on the
 * `helix-dismiss` is a refusal.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Banner, Notification bar, Alert bar
 * @documentation https://helix.fusion.dev/components/announcement
 *
 * @slot - The message.
 * @slot actions - What to do about it, usually a link or a button.
 * @slot icon - Replaces the glyph inside the dismiss control.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the reader asks to close it. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart actions - The trailing action region.
 * @csspart content - The message region.
 * @csspart dismiss - The control that asks to close.
 * @csspart dismiss-mark - The glyph on the dismiss control, where none is slotted.
 */
@customElement('helix-headless-announcement')
export class HelixHeadlessAnnouncement extends MixinDismissible(HelixElement) {
  /**
   * Which color the band wears.
   *
   * Paint only: unlike `Callout`, no value here draws a mark, changes the label,
   * or moves the live region off polite. The set matches `Tag`'s. `neutral` is
   * the resting value, said out loud so a consumer can put a band back to it
   * from markup, and `surface` is the one value that is not a color: it lifts
   * the band onto the surface step instead of the sunken one.
   */
  @property({ reflect: true })
  tone?: 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'surface' | 'warning'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, and always polite. See the note above on `role="alert"`.
    hostAria(this.internals, { role: 'status' })
    this.internals.ariaLive = 'polite'
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
  }

  /**
   * Says on the `actions` region whether anything is in it.
   *
   * An empty region is not free: it is still a flex item, so it still takes the
   * container's gap. There is no selector that can ask, `slot:empty` being
   * about a slot's fallback rather than its assigned nodes, so the component
   * asks and says so, on the region inside this shadow root rather than on the
   * host: an attribute written onto the host is a change to markup the consumer
   * rendered, which React reports on hydration and does not patch up.
   */
  private markEmpty(): void {
    const region = this.renderRoot?.querySelector<HTMLElement>('[part="actions"]')
    const empty = !slotFilled(
      this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="actions"]'),
    )
    region?.toggleAttribute('data-empty', empty)
    /* `hidden` beside the mirror, because `data-empty` is a hook the styled
       sheet reads and this tier has no sheet: an empty region left in the box
       tree is a gap a consumer cannot close without knowing to look for it. The
       styled rule stays, because that sheet sets `display` on this part and
       therefore outranks the UA one. */
    region?.toggleAttribute('hidden', empty)
  }

  /**
   * The cross inside the dismiss button, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   *
   * Not `renderIcon`, which is what `Toast` and `Callout` call the method that
   * draws a tone mark. An announcement has no tone mark at all.
   */
  protected renderDismissIcon(): TemplateResult {
    return html`<slot name="icon">
      <svg part="dismiss-mark" viewBox=${x.viewBox} fill="currentColor" aria-hidden="true">
        ${unsafeSVG(x.content)}
      </svg>
    </slot>`
  }

  protected override render(): TemplateResult {
    return html`<div part="content"><slot></slot></div>
      <div part="actions"><slot name="actions"></slot></div>
      ${
        /* A plain `<button>`, the way `Menu` renders its way back and every
           other in-shadow control in the library. Never a nested component
           here: `[part="dismiss"]` would select the host and stop at its shadow
           boundary, so the styled tier could not reach the inner control at
           all, and the parent would depend invisibly on the child being
           registered. */
        this.dismissible
          ? html`<button
              part="dismiss"
              type="button"
              aria-label=${this.dismissLabel}
              @click=${() => this.dismiss()}
            >
              ${this.renderDismissIcon()}
            </button>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-announcement': HelixHeadlessAnnouncement
  }
}
