import { customElement, HelixElement, hostAria, SEVERITIES, severityMark } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary Sets a passage apart as information, a warning, or an error.
 *
 * @description
 * `tone` lives on the headless tier rather than being a treatment on the styled
 * one, because it is meaning and not decoration. It picks the icon and that
 * icon's accessible name, so a reader who cannot see that the box is red still
 * hears "Error". A callout whose meaning existed only as a color would say
 * nothing to them at all.
 *
 * The icon is the fallback content of a slot, so a consumer replaces it by
 * slotting their own and the default disappears with no emptiness check. That
 * is what slot fallback is for.
 *
 * Not an `Announcement`, which is the other thing this could be mistaken for.
 * A callout interrupts a document to set a passage apart and is read where it
 * sits; an announcement is page-level chrome above the masthead, announces
 * itself as a live region, and can be dismissed. Neither is a variant of the
 * other.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Admonition, Notice, Note, Alert
 * @documentation https://helix.fusion.dev/components/callout
 *
 * @slot - The callout's content.
 * @slot icon - Replaces the icon chosen by `severity`.
 * @slot title - A heading above the content.
 *
 * @csspart content - The content region.
 * @csspart icon - The icon region.
 * @csspart icon-mark - The severity glyph, where none is slotted.
 */
@customElement('helix-base-callout')
export class HelixBaseCallout extends HelixElement {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the box.
    hostAria(this.internals, { role: 'note' })
  }

  /**
   * What kind of attention the passage needs.
   *
   * **`severity` was a sixth spelling of `tone`**, which is the axis for what a
   * thing means, and a subset of it: a callout reports a status and never a
   * brand role, so it takes four of the seven. One word per axis is the whole
   * of the registry, and two words for one axis is how `tone` had drifted into
   * five incompatible value sets before anything held it.
   */
  @property({ reflect: true })
  tone?: 'danger' | 'info' | 'success' | 'warning'

  /**
   * The mark for the callout's severity, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   *
   * The mark and its label are passed in rather than looked up again, since
   * `render` has already resolved the severity and a second lookup is a second
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
       happened. Same vocabulary, two honest answers to an absent severity. */
    const { icon, label } = severityMark(this.tone) ?? SEVERITIES.info

    return html`<span part="icon">${this.renderIcon(icon, label)}</span>
      <div part="content">
        <slot name="title"></slot>
        <slot></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-callout': HelixBaseCallout
  }
}
