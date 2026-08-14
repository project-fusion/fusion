import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'

/**
 * @summary One row of a list.
 *
 * @description
 * Layout and semantics, and deliberately not a target.
 *
 * **It does not become a link.** The reference renders an `<a>` when given an
 * `href`, which is the thing Button and Toggle both stopped doing: a router
 * renders its own anchor and cannot render it inside this shadow root, so a row
 * that navigates would force a full page load. A row whose label is a
 * destination slots the consumer's own link as that label, and the link is the
 * target rather than the row around it.
 *
 * That is a real constraint rather than an oversight: a whole-row target needs
 * the anchor to wrap the layout, and the layout is what this component is. When
 * something needs it, it wants a `data-list-item` recipe styling the consumer's
 * anchor, the way `data-button` and `data-nav-item` do.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Row, Entry
 * @documentation https://helix.fusion.dev/components/list
 *
 * @slot start - Leading content, usually an icon or an avatar.
 * @slot - The label.
 * @slot supporting - Secondary text under the label.
 * @slot end - Trailing content.
 */
@customElement('helix-base-list-item')
export class HelixBaseListItem extends HelixElement {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.role = 'listitem'
  }

  protected override render(): TemplateResult {
    return html`<slot name="start"></slot>
      <slot></slot>
      <slot name="supporting"></slot>
      <slot name="end"></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-list-item': HelixBaseListItem
  }
}
