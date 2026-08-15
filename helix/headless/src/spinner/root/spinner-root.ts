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
 * The semantics are on the host through `ElementInternals`, not on an inner
 * span. A `role` written into the shadow root announces correctly but leaves
 * the host itself anonymous to anything walking the light DOM, and a `role`
 * written onto the host as an attribute is one a React consumer's server markup
 * never had.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Loader, Busy, Activity
 * @documentation https://helix.fusion.dev/components/spinner
 *
 * @csspart svg - The rotating circle pair.
 * @csspart track - The full circle behind the indicator.
 * @csspart indicator - The arc that turns.
 */
@customElement('helix-base-spinner')
export class HelixBaseSpinner extends HelixElement {
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
    </svg>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-spinner': HelixBaseSpinner
  }
}
