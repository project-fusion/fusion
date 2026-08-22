import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Says that something indeterminate is in progress.
 *
 * @description
 * Two concentric circles rather than one arc: the track is what makes the
 * moving part read as a proportion of a whole rather than as a shape drifting
 * on its own, and it costs one element.
 *
 * **The center is a slot and is empty by default.** A loader with a mark in the
 * middle is a brand's loader, and this library does not know whose. The slot is
 * the capability; the logo is the application's, put in once wherever the app
 * wraps it. Nothing is rendered when nothing is slotted, so an unbranded loader
 * is still two circles and no extra box.
 *
 * What is slotted does not turn. Only the arc moves, because a mark rotating
 * with it stops reading as a mark and becomes part of the animation, and a
 * wordmark upside down twice a second is worse than no wordmark.
 *
 * The semantics are on the host through `ElementInternals`, not on an inner
 * span. A `role` written into the shadow root announces correctly but leaves
 * the host itself anonymous to anything walking the light DOM, and a `role`
 * written onto the host as an attribute is one a React consumer's server markup
 * never had.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Spinner, Busy, Activity
 * @documentation https://helix.fusion.dev/components/loader
 *
 * @slot - A mark to sit still at the center, usually a logo. Empty by default.
 *
 * @csspart svg - The rotating circle pair.
 * @csspart mark - The region holding what was slotted at the center.
 * @csspart track - The full circle behind the indicator.
 * @csspart indicator - The arc that turns.
 */
@customElement('helix-base-loader')
export class HelixBaseLoader extends HelixElement {
  /** Accessible name, announced while the work is outstanding. */
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
    'helix-base-loader': HelixBaseLoader
  }
}
