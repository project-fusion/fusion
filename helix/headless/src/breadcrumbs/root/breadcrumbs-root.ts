import { customElement, HelixElement, hostAria } from '@helix-io/core'
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
 * **The trail does not measure itself, and the overflow is markup.** It held a
 * `collapse` property, a `ResizeObserver` through `CollapseController`, an
 * `overflowed` getter and a `helix-change` event, all to answer one question:
 * how many crumbs fit. Removed 20 Aug 2026, because the question is the wrong
 * one and answering it cost more than it returned.
 *
 * - **It can never reach the server.** There is no width without a DOM, so the
 *   server shipped every crumb and the client removed some after hydrating. A
 *   trail that collapses therefore painted wrong on every single load, and the
 *   SSR spec asserting "hides no crumb, whatever collapse says" was recording
 *   that as correct behaviour rather than as the cost it is.
 * - **The consumer already wrote the crumbs.** The measurement hid some, then
 *   announced which, so that the consumer could read them back off the element
 *   and clone them into menu items. The overflow example spent 32 lines of
 *   JavaScript making a round trip out of data that started in its own markup.
 * - **Nobody specifies a breadcrumb in units of fit.** Designs say "keep the
 *   root and the current page, fold the middle", which is a fact about depth,
 *   or "fold below this width", which is a fact CSS knows. The arithmetic was
 *   the only thing that needed a width, and it was wrong three times in one day:
 *   the observer watched a container that did not exist yet, the gap between
 *   items went uncounted, and the result was still wrong at 34rem.
 *
 * So the trail lays out crumbs and separators, and the consumer writes what
 * folds. A `helix-menu` of `helix-menu-item`s in a crumb, and a container query
 * deciding when it shows: server rendered, no observer, and correct before the
 * first script runs. `.examples/overflow.css` is the whole of it.
 *
 * **And the crumbs carry no marker for any of it.** There was an `overflow`
 * property on the crumb, which existed so the controller could tell a control
 * from a step and so the trail could size it. With the controller gone the
 * first use went with it, and the second is better answered by the crumb
 * sizing whatever is slotted into it, which is true of every crumb rather than
 * of one a consumer remembered to mark. What is left is a fact CSS can already
 * see: the crumb with the menu in it is `:has(helix-menu)`, and the middle is
 * `:not(:first-child, [current])`. A marker would be the design rule written
 * twice, once in the HTML and once in the sheet, with nothing keeping the two
 * honest.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Breadcrumb, Crumbs
 * @documentation https://helix.fusion.dev/components/breadcrumbs
 *
 * @slot - The trail's items, in order from root to current page, with the
 * crumb holding the fold wherever the gap should appear.
 *
 * @csspart list - The ordered list.
 */
@customElement('helix-base-breadcrumbs')
export class HelixBaseBreadcrumbs extends HelixElement {
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
    'helix-base-breadcrumbs': HelixBaseBreadcrumbs
  }
}
