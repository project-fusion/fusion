import { customElement, HelixElement, hostAria, SEVERITIES, severityMark } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary Sets a passage apart as information, a warning, or an error.
 *
 * @description
 * `severity` lives on the headless tier rather than being an `appearance` on the
 * styled one, because it is meaning and not decoration. It picks the icon and
 * that icon's accessible name, so a reader who cannot see that the box is red
 * still hears "Error". A callout whose severity existed only as a color would
 * say nothing to them at all.
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
 * @aliases Admonition, Notice, Note
 * @documentation https://helix.fusion.dev/components/callout
 *
 * @slot - The callout's content.
 * @slot icon - Replaces the icon chosen by `severity`.
 * @slot title - A heading above the content.
 *
 * @csspart icon - The icon region.
 * @csspart content - The content region.
 */
@customElement('helix-base-callout')
export class HelixBaseCallout extends HelixElement {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the box.
    hostAria(this.internals, { role: 'note' })
  }

  /** What kind of attention the passage needs. */
  @property({ reflect: true })
  severity?: 'info' | 'success' | 'warning' | 'danger'

  protected override render(): TemplateResult {
    /* Falls back to `info`, because a callout exists to set a passage apart and
       is therefore always *about* something. `Toast.Item` takes the same lookup
       and draws nothing instead, since a message is just the next thing that
       happened. Same vocabulary, two honest answers to an absent severity. */
    const { icon, label } = severityMark(this.severity) ?? SEVERITIES.info

    return html`<span part="icon">
        <slot name="icon">
          <svg fill="currentColor" viewBox=${icon.viewBox} role="img" aria-label=${label}>
            ${unsafeSVG(icon.content)}
          </svg>
        </slot>
      </span>
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
