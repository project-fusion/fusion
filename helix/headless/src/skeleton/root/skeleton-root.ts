import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'

/**
 * @summary A placeholder shown in place of content that is still loading.
 *
 * @description
 * Carries `aria-busy` and a polite live region, so a reader using a screen
 * reader is told the region is filling rather than told nothing and left to
 * wonder. Both go through `ElementInternals`, which writes no attribute.
 *
 * Holds no `shape`. Whether a placeholder is a line, a block or a circle is
 * presentation, and putting it here would give the headless tier an appearance
 * property, which is the one thing that tier is for not having.
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
