import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'

/**
 * @summary A placeholder shown in place of content that is still loading.
 *
 * @description
 * Sets `aria-busy` and a polite live region, so a screen reader announces that
 * the region is loading. Both are set through `ElementInternals`, which writes
 * no attributes.
 *
 * There is no `shape` property. Whether a placeholder is a line, a block, or a
 * circle is presentation, which belongs to the styled tier.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Placeholder, Shimmer, Ghost
 * @documentation https://fusion.dev/helix/components/skeleton
 *
 * @csspart skeleton - The placeholder shape.
 */
@customElement('helix-headless-skeleton')
export class HelixHeadlessSkeleton extends HelixElement {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaBusy = 'true'
    this.internals.ariaLive = 'polite'
  }

  protected override render(): TemplateResult {
    return html`<span part="skeleton"></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-skeleton': HelixHeadlessSkeleton
  }
}
