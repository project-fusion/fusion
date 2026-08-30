import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
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
 * **The trail does not measure itself, and the overflow is markup.** Measuring
 * how many crumbs fit can never reach the server: there is no width without a
 * DOM, so the server ships every crumb and the client removes some after
 * hydrating, and a trail that collapses paints wrong on every single load. Nor
 * does anybody specify a breadcrumb in units of fit. Designs say "keep the root
 * and the current page, fold the middle", which is a fact about depth, or "fold
 * below this width", which is a fact CSS knows.
 *
 * So the trail lays out crumbs and separators, and the consumer writes what
 * folds: a `helix-menu` of `helix-menu-item`s in a crumb, where the gap
 * belongs. Server rendered, no observer, no stylesheet, and correct before the
 * first script runs. A trail that should fold only at some widths is a
 * container query in the consumer's own sheet, which is theirs to write and
 * theirs to leave out.
 *
 * **And the crumbs carry no marker for any of it.** CSS can already see it: the
 * crumb with the menu in it is `:has(helix-menu)`, and the middle is
 * `:not(:first-child, [current])`. A marker would be the design rule written
 * twice, once in the HTML and once in the sheet, with nothing keeping the two
 * honest.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Breadcrumb, Crumbs
 * @documentation https://helix.fusion.dev/components/breadcrumbs
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
