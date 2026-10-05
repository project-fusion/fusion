import {
  customElement,
  drawDismiss,
  drawDismissGlyph,
  HelixElement,
  hostAria,
  MixinDismissible,
  TONE_MARKS,
  toneMark,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * The mark for a `neutral` callout, which reports no status: the information
 * mark, named for what the passage is.
 */
const NOTE = { icon: TONE_MARKS.info.icon, label: 'Note' }

/**
 * @summary A passage set apart as a note, information, a warning, or an error.
 *
 * @description
 * `tone` is on the headless tier because it carries meaning. It picks the icon
 * and the icon region's accessible name, so a screen reader announces "Error"
 * for an error callout whether or not the color is seen. Set `tone-label` to
 * say the name in another language.
 *
 * The icon is the fallback content of a slot. Slot your own icon to replace it,
 * and the default disappears with no extra check. The tone's name stays on the
 * region around it.
 *
 * Set `dismissible` for a note a reader may put away, as Shoelace's `closable`
 * alert does. The button fires `helix-dismiss` and the callout stays until a
 * listener removes it, so the page decides whether it comes back.
 *
 * A callout sets a passage apart inside a document and is read where it sits.
 * For page-level chrome above the masthead that is a live region and can be
 * dismissed, use `Announcement`.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Admonition, Notice, Note, Alert
 * @documentation https://fusion.dev/helix/components/callout
 *
 * @slot - The callout's content.
 * @slot dismiss-icon - Replaces the cross inside the dismiss button.
 * @slot heading - A heading above the content.
 * @slot icon - Replaces the icon chosen by `tone`.
 *
 * @event {HelixDismissEvent} helix-dismiss - The dismiss button was pressed. The callout does not remove itself, so remove it in response. Cancelable.
 *
 * @csspart content - The content region.
 * @csspart dismiss - The button that dismisses the callout, shown when `dismissible` is set.
 * @csspart dismiss-mark - The cross on the dismiss button, shown when the `dismiss-icon` slot is empty.
 * @csspart icon - The icon region, an image named for the tone.
 * @csspart icon-mark - The icon for the tone, shown when no icon is slotted.
 */
@customElement('helix-headless-callout')
export class HelixHeadlessCallout extends MixinDismissible(HelixElement) {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the box.
    hostAria(this.internals, { role: 'note' })
  }

  /**
   * What kind of attention the passage needs.
   *
   * `tone` is the axis for what a thing means, and this is a subset of it: a
   * callout reports a status, or `neutral` for an aside that reports none, and
   * never a brand role, so it takes five of the seven values. One word per axis
   * is the whole of the registry, which is why there is no `severity` beside it.
   */
  @property({ reflect: true })
  tone?: 'danger' | 'info' | 'neutral' | 'success' | 'warning'

  /**
   * What a screen reader is told the tone is, such as "Fehler".
   *
   * Absent is the English for the tone: "Error", "Information", "Note",
   * "Success" or "Warning".
   */
  @property({ attribute: 'tone-label' })
  toneLabel = ''

  /**
   * The mark for the callout's tone, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   *
   * The mark and its label are passed in rather than looked up again, since
   * `render` has already resolved the tone and a second lookup is a second
   * place for the fallback to disagree with the tone around it.
   */
  protected renderIcon(icon: { content: string; viewBox: string }, _label: string): TemplateResult {
    return html`<slot name="icon">
      <svg part="icon-mark" fill="currentColor" viewBox=${icon.viewBox} aria-hidden="true">
        ${unsafeSVG(icon.content)}
      </svg>
    </slot>`
  }

  /**
   * The cross inside the dismiss button, behind a seam, for the reason
   * `renderIcon` gives: the slot answers the page and the method the tier
   * above.
   */
  protected renderDismissIcon(): TemplateResult {
    return html`<slot name="dismiss-icon">
      ${drawDismissGlyph()}
    </slot>`
  }

  protected override render(): TemplateResult {
    /* Falls back to `info`, because a callout exists to set a passage apart and
       is therefore always *about* something. `Toast.Item` takes the same lookup
       and draws nothing instead, since a message is just the next thing that
       happened. Same vocabulary, two honest answers to an absent tone. */
    const { icon, label } =
      this.tone === 'neutral' ? NOTE : (toneMark(this.tone) ?? TONE_MARKS.info)

    /* **The name is on the region, so it survives a slotted icon.** It was on
       the fallback glyph, and a consumer's own icon replaced the glyph and the
       tone's name with it, which left the color as the only thing saying
       "Error". */
    const named = this.toneLabel || label
    return html`<span part="icon" role="img" aria-label=${named}>${this.renderIcon(icon, named)}</span>
      <div part="content">
        <slot name="heading"></slot>
        <slot></slot>
      </div>${
        /* A plain `<button>`, as `Announcement` draws its own, so the styled
           tier reaches the control itself through `[part="dismiss"]`. */
        this.dismissible
          ? drawDismiss({
              label: this.dismissLabel,
              mark: this.renderDismissIcon(),
              onDismiss: () => this.dismiss(),
            })
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-callout': HelixHeadlessCallout
  }
}
