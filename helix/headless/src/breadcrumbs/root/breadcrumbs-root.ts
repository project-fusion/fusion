import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Shows the path to the current page.
 *
 * @description
 * A navigation landmark wrapping a list. `role="list"` is set explicitly on the
 * `<ol>` even though it is already a list: removing the markers with
 * `list-style: none` strips list semantics in Safari, and a breadcrumb trail
 * always removes its markers.
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
 * @csspart nav - The navigation landmark.
 * @csspart list - The ordered list.
 */
@customElement('helix-base-breadcrumbs')
export class HelixBaseBreadcrumbs extends HelixElement {
  /**
   * Accessible name for the landmark.
   *
   * Named rather than left bare because a page may hold more than one
   * navigation, and landmarks are how a screen-reader user chooses between them.
   */
  @property()
  label = 'Breadcrumb'

  protected override render(): TemplateResult {
    return html`<nav part="nav" aria-label=${this.label}>
      <ol part="list" role="list"><slot></slot></ol>
    </nav>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-breadcrumbs': HelixBaseBreadcrumbs
  }
}
