import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Shows that work of unknown length is in progress.
 *
 * @description
 * Draws two concentric circles: a track and a moving arc. The track shows the
 * arc as a proportion of a whole, and costs one element.
 *
 * **The center is a slot, empty by default.** Put your logo there once, where
 * your app wraps the loader. When nothing is slotted, nothing extra is
 * rendered.
 *
 * Slotted content does not rotate. Only the arc moves, so a logo stays
 * readable.
 *
 * The role is set on the host through `ElementInternals`. A `role` in the
 * shadow root would leave the host itself without a role in the light DOM, and
 * a `role` attribute on the host would be missing from React server-rendered
 * markup.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Spinner, Busy, Activity
 * @documentation https://fusion.dev/helix/components/loader
 *
 * @slot - An icon or logo that stays still at the center. Empty by default.
 *
 * @csspart indicator - The arc that turns.
 * @csspart mark - The region that holds the slotted content at the center.
 * @csspart svg - The rotating circle pair.
 * @csspart track - The full circle behind the indicator.
 */
@customElement('helix-headless-loader')
export class HelixHeadlessLoader extends HelixElement {
  /**
   * The loader's name, announced by screen readers while the work is in
   * progress.
   */
  @property()
  label = 'Loading'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'progressbar' })
    this.internals.ariaBusy = 'true'
  }

  protected override render(): TemplateResult {
    return html`<svg part="svg" viewBox="0 0 24 24" aria-hidden="true">
        <circle part="track" cx="12" cy="12" r="10" fill="none" />
        <circle part="indicator" cx="12" cy="12" r="10" fill="none" />
      </svg>
      <span part="mark" aria-hidden="true"><slot></slot></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-loader': HelixHeadlessLoader
  }
}
