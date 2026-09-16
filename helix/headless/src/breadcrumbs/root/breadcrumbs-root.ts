import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'

/**
 * @summary Shows the path to the current page.
 *
 * @description
 * The host is the landmark, so `aria-label` on it names the trail directly. A
 * page may hold more than one navigation, and landmarks are how a
 * screen-reader user chooses between them.
 *
 * `role="list"` is set explicitly on the `<ol>` even though it is one:
 * `list-style: none` strips list semantics in Safari, and a breadcrumb trail
 * always removes its markers.
 *
 * Items are slotted rather than wrapped, so they are `<ol>` children in the
 * flat tree and each carries `role="listitem"` itself.
 *
 * **The trail does not measure itself, and the overflow is markup.**
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Breadcrumb, Crumbs
 * @documentation https://fusion.dev/helix/components/breadcrumbs
 *
 * @slot - The trail's items, in order from root to current page, with the
 * crumb holding the fold wherever the gap should appear.
 *
 * @csspart list - The ordered list.
 */
@customElement('helix-headless-breadcrumbs')
export class HelixHeadlessBreadcrumbs extends HelixElement {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host through internals, so the landmark is the element itself and
    // an author's `aria-label` names it without anything being copied inward.
    hostAria(this.internals, { role: 'navigation' })
  }

  protected override render(): TemplateResult {
    /* One slot. The crumb holding the fold is one the consumer placed in
       source order, so there is nothing here to position it: the list renders
       what it was given, in the order it was given. */
    return html`<ol part="list" role="list">
      <slot></slot>
    </ol>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-breadcrumbs': HelixHeadlessBreadcrumbs
  }
}
