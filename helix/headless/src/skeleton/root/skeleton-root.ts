import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A placeholder shown in place of content that is still loading.
 *
 * @description
 * A skeleton is hidden from screen readers unless it has a `label`. An empty
 * placeholder has nothing to say, and a page of them would be a page of
 * unnamed shapes. Tell a screen reader that a region is loading on the region
 * itself: set `aria-busy="true"` on it while it loads, and put a `Loader` or a
 * status message in it. Set `label` on one skeleton to have it read out by
 * name, such as "Loading profile", when a reader reaches it. The role and the
 * name are set through `ElementInternals`, which writes no attributes.
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
  /**
   * What is loading, read out as the placeholder's name, such as "Loading
   * profile".
   *
   * Absent hides the placeholder from screen readers.
   */
  @property()
  label = ''

  /* The busy state and a live region were on the placeholder itself, which
     holds nothing and never changes, so a screen reader announced nothing. A
     labeled placeholder is a busy indicator with a name, which is what
     `Loader` is; an unlabeled one is hidden. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.label) {
      hostAria(this.internals, { label: this.label, role: 'progressbar' })
      this.internals.ariaHidden = null
    } else {
      hostAria(this.internals, { label: '', role: '' })
      this.internals.ariaHidden = 'true'
    }
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
