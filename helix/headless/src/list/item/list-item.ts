import { customElement, HelixElement, hostAria } from '@helix-io/core'
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
 * anchor, the way `data-button` and `data-navigation-item` do.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Row, Entry
 * @documentation https://helix.fusion.dev/components/list
 *
 * @csspart row - The layout, held off the host so the host can carry a marker.
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
    hostAria(this.internals, { role: 'listitem' })
  }

  protected override render(): TemplateResult {
    /* One wrapper, and it earns its place rather than breaking the bare-slot
       rule. That rule is about optional *regions*, which generate an empty box
       when nothing fills them; this is a single always-present container whose
       job is to hold the layout somewhere other than the host.
     *
     * The host has to be free for `display: list-item`, which is how an ordered
       or unordered list gets its marker: native numbering, native counters,
       native RTL, and nothing written by script or counted on the server. But
       `list-item` cannot combine with `grid`, so a row whose host carried the
       grid lost it the moment the list asked for a marker. Measured before this
       wrapper: a row with a leading icon put the icon 32px in instead of 16 and
       its supporting text beside the label instead of under it. */
    return html`<div part="row">
      <slot name="start"></slot>
      <slot></slot>
      <slot name="supporting"></slot>
      <slot name="end"></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-list-item': HelixBaseListItem
  }
}
