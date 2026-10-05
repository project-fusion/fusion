import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Shows the path to the current page.
 *
 * @description
 * The host is the navigation landmark, named "Breadcrumb" by default. An
 * `aria-label` on the host names the trail instead, and so does `label`. When a
 * page has more than one navigation landmark, screen reader users choose
 * between them by name.
 *
 * The `<ol>` has an explicit `role="list"`, because Safari removes list
 * semantics from a list with `list-style: none`, and the trail always hides its
 * markers.
 *
 * The items are slotted directly, so they are `<ol>` children in the flat tree,
 * and each item sets `role="listitem"` on itself.
 *
 * The trail does not measure itself, and you write its overflow in markup: put
 * the crumb that holds the folded items where the gap should appear.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Breadcrumb, Crumbs
 * @documentation https://fusion.dev/helix/components/breadcrumbs
 *
 * @slot - The trail's items, in order from the root to the current page. Put
 * the crumb that holds the folded items where the gap should appear.
 *
 * @csspart list - The ordered list.
 */
@customElement('helix-headless-breadcrumbs')
export class HelixHeadlessBreadcrumbs extends HelixElement {
  /**
   * The landmark's name, read by screen readers. An `aria-label` on the host
   * wins over it.
   */
  @property()
  label = 'Breadcrumb'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host through internals, so the landmark is the element itself and
    // an author's `aria-label` names it without anything being copied inward.
    // The default name goes the same way, and an attribute beats internals.
    hostAria(this.internals, { label: this.label, role: 'navigation' })
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
