import { customElement, HelixElement } from '@helix-io/core'
import { checkCircle, type HelixIcon, info, warning, xCircleFill } from '@helix-io/icons'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/** Icon and accessible name for each severity. */
const SEVERITIES: Record<string, { icon: HelixIcon; label: string }> = {
  danger: { icon: xCircleFill, label: 'Error' },
  info: { icon: info, label: 'Information' },
  success: { icon: checkCircle, label: 'Success' },
  warning: { icon: warning, label: 'Warning' },
}

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
 * @since 0.1.0
 * @status experimental
 * @aliases Alert, Banner, Admonition, Notice
 * @documentation https://helix.fusion.dev/components/callout
 *
 * @slot - The callout's content.
 * @slot icon - Replaces the icon chosen by `severity`.
 *
 * @csspart icon - The icon region.
 * @csspart content - The content region.
 */
@customElement('helix-base-callout')
export class HelixBaseCallout extends HelixElement {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the box.
    this.internals.role = 'note'
  }

  /** What kind of attention the passage needs. */
  @property({ reflect: true })
  severity?: 'info' | 'success' | 'warning' | 'danger'

  protected override render(): TemplateResult {
    const { icon, label } =
      SEVERITIES[this.severity ?? 'info'] ?? (SEVERITIES.info as { icon: HelixIcon; label: string })

    return html`<span part="icon">
        <slot name="icon">
          <svg viewBox=${icon.viewBox} role="img" aria-label=${label}>
            ${unsafeSVG(icon.content)}
          </svg>
        </slot>
      </span>
      <div part="content"><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-callout': HelixBaseCallout
  }
}
