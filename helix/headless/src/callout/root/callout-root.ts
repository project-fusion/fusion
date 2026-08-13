import { customElement, HelixElement } from '@helix-io/core'
import { check, danger, type HelixIcon, info, warning } from '@helix-io/icons'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** Icon and accessible name for each severity. */
const SEVERITIES: Record<string, { icon: HelixIcon; label: string }> = {
  danger: { icon: danger, label: 'Error' },
  info: { icon: info, label: 'Information' },
  success: { icon: check, label: 'Success' },
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
 * @csspart callout - The callout body.
 * @csspart icon - The icon region.
 * @csspart content - The content region.
 */
@customElement('helix-base-callout')
export class HelixBaseCallout extends HelixElement {
  /** What kind of attention the passage needs. */
  @property({ reflect: true })
  severity: 'info' | 'success' | 'warning' | 'danger' = 'info'

  protected override render(): TemplateResult {
    const { icon, label } =
      SEVERITIES[this.severity] ?? (SEVERITIES.info as { icon: HelixIcon; label: string })

    return html`<div part="callout" role="note">
      <span part="icon">
        <slot name="icon">
          <svg
            viewBox=${icon.viewBox}
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            role="img"
            aria-label=${label}
          >
            <path d=${icon.path}></path>
          </svg>
        </slot>
      </span>
      <div part="content"><slot></slot></div>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-callout': HelixBaseCallout
  }
}
