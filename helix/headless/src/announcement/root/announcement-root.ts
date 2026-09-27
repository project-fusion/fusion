import {
  ArrivalController,
  customElement,
  HelixElement,
  MixinDismissible,
  markRegion,
  slottedWords,
} from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary A message for the whole page, shown above its header, that can be dismissed.
 *
 * @description
 * An announcement is a banner above the page header with news about the whole
 * site or session, such as a trial ending, a degraded service, or a change of
 * terms. For a passage inside a document, use `Callout`, which stays where it
 * is placed and cannot be dismissed.
 *
 * The announcement is always a polite live region, whatever its `tone`.
 * `role="alert"` is assertive and interrupts a screen reader, so an
 * announcement served with the page would interrupt on every page load.
 *
 * The live region is its own part. When the announcement appears after the page
 * has loaded, the message is written into the region one frame later, so screen
 * readers read it reliably. When the announcement is in the served HTML, the
 * region is filled at once and nothing is read out.
 *
 * The dismiss button fires `helix-dismiss`, and the announcement stays in the
 * document, so remove it in your listener. The event is cancelable, and
 * `dismiss()` returns `false` when a listener calls `preventDefault()`.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Banner, Notification bar, Alert bar
 * @documentation https://fusion.dev/helix/components/announcement
 *
 * @slot - The message.
 * @slot actions - Actions for the message, usually a link or a button.
 * @slot icon - Replaces the icon inside the dismiss button.
 *
 * @event {HelixDismissEvent} helix-dismiss - The dismiss button was pressed. The announcement does not remove itself, so remove it in response. Cancelable.
 *
 * @csspart actions - The region after the message that holds the actions.
 * @csspart content - The region that holds the message.
 * @csspart dismiss - The button that dismisses the announcement.
 * @csspart dismiss-mark - The icon on the dismiss button, shown when the `icon` slot is empty.
 * @csspart live - A copy of the message in a live region, read by screen readers when the announcement appears after the page has loaded. Visually hidden in the styled tier.
 */
@customElement('helix-headless-announcement')
export class HelixHeadlessAnnouncement extends MixinDismissible(HelixElement) {
  /**
   * The band's color.
   *
   * Paint only: unlike `Callout`, no value here draws a mark, changes the label,
   * or moves the live region off polite. `neutral` is the resting value, said
   * out loud so a consumer can put a band back to it from markup.
   *
   * **The set is `Tag`'s and `Badge`'s, and now actually is.** This doc claimed
   * to match `Tag` while differing from it in both directions: it carried
   * `surface`, which `Tag` does not, and lacked `accent`, which `Tag` has. Three
   * components saying what a thing means, in three vocabularies, one of which
   * described itself as a fourth.
   *
   * `accent` is the second emphasis, a rotation off the brand seed rather than a
   * color of its own, so it stays in relation when somebody rethemes. `primary`
   * is the seed itself.
   *
   * **`surface` was never a color and has moved to `separation`**, which is the
   * axis that owns where a box sits relative to the page. It said the band rode
   * the surface step instead of the sunken one, which is an elevation, and a
   * band can be `info` and elevated at once: two values true together are two
   * axes, which is the test the registry answers to.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  /* Filled a frame after the band appears, when it appears after the page has
     loaded; at once, and silently, when it came with the page. */
  protected readonly arrival = new ArrivalController(this, {
    arriving: () => !this.serverRendered && document.readyState === 'complete',
    text: () => slottedWords(this, ['']),
  })

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
    /* `hidden` beside the mirror, because `data-empty` is the hook a sheet
       selects on and this tier ships none: an empty region left in the box tree
       is a gap a consumer cannot close without knowing to look for it. Both
       stay, since `[hidden]` is a UA rule and a sheet setting `display` on this
       part outranks it. */
    markRegion(this.renderRoot, 'actions', ['actions'])
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
    return html`<div part="content"><slot @slotchange=${() => this.arrival.say()}></slot></div>
      <span part="live" role="status">${this.arrival.said}</span>
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
