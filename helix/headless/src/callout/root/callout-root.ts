import { customElement, HelixElement, hostAria, TONE_MARKS, toneMark } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
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
 * and the icon's accessible name, so a screen reader announces "Error" for an
 * error callout whether or not the color is seen.
 *
 * The icon is the fallback content of a slot. Slot your own icon to replace it,
 * and the default disappears with no extra check.
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
 * @slot heading - A heading above the content.
 * @slot icon - Replaces the icon chosen by `tone`.
 *
 * @csspart content - The content region.
 * @csspart icon - The icon region.
 * @csspart icon-mark - The icon for the tone, shown when no icon is slotted.
 */
@customElement('helix-headless-callout')
export class HelixHeadlessCallout extends HelixElement {
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
  protected renderIcon(icon: { content: string; viewBox: string }, label: string): TemplateResult {
    return html`<slot name="icon">
      <svg part="icon-mark" fill="currentColor" viewBox=${icon.viewBox} role="img" aria-label=${label}>
        ${unsafeSVG(icon.content)}
      </svg>
    </slot>`
  }

  protected override render(): TemplateResult {
    /* Falls back to `info`, because a callout exists to set a passage apart and
       is therefore always *about* something. `Toast.Item` takes the same lookup
       and draws nothing instead, since a message is just the next thing that
       happened. Same vocabulary, two honest answers to an absent tone. */
    const { icon, label } =
      this.tone === 'neutral' ? NOTE : (toneMark(this.tone) ?? TONE_MARKS.info)

    return html`<span part="icon">${this.renderIcon(icon, label)}</span>
      <div part="content">
        <slot name="heading"></slot>
        <slot></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-callout': HelixHeadlessCallout
  }
}
