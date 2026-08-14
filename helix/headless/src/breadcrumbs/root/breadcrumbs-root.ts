import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'

/**
 * @summary Shows the path to the current page.
 *
 * @description
 * The host is the landmark, so `aria-label` on it names the trail directly and
 * there is no property mirroring one. A page may hold more than one navigation,
 * and landmarks are how a screen-reader user chooses between them.
 *
 * `role="list"` is set explicitly on the `<ol>` even though it is already a
 * list: removing the markers with `list-style: none` strips list semantics in
 * Safari, and a breadcrumb trail always removes its markers.
 *
 * Items are slotted rather than wrapped, so they are `<ol>` children in the flat
 * tree and each carries `role="listitem"` itself.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Breadcrumb, Crumbs
 * @documentation https://helix.fusion.dev/components/breadcrumbs
 *
 * @slot - The trail's items, in order from root to current page.
 *
 * @csspart list - The ordered list.
 */
@customElement('helix-base-breadcrumbs')
export class HelixBaseBreadcrumbs extends HelixElement {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host through internals, so the landmark is the element itself and
    // an author's `aria-label` names it without anything being copied inward.
    this.internals.role = 'navigation'
  }

  protected override render(): TemplateResult {
    return html`<ol part="list" role="list"><slot></slot></ol>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-breadcrumbs': HelixBaseBreadcrumbs
  }
}
