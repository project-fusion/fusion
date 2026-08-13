import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'

/**
 * @summary Groups related content and actions into a single surface.
 *
 * @description
 * Regions are slots rather than separate elements, because a header, body, and
 * footer carry no state, no behavior, and no API of their own. Slotting them
 * costs one custom element instead of five and lets the consumer bring their
 * own markup, so a title can be a real `<h2>` rather than an emulated one.
 *
 * The host is the surface. A wrapper `<div part="container">` would be a second
 * box doing nothing the host cannot: the element itself takes the border, the
 * radius, and the grid, and a consumer styles `helix-card` rather than reaching
 * through `::part`. One node instead of two, on every card on the page.
 *
 * Name the card with `aria-label` or `aria-labelledby`. That is the only
 * naming that survives server rendering: reading a title out of the light DOM
 * needs a DOM, and the server has none.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Panel, Surface
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot media - Image or video that runs edge to edge, outside the inset.
 * @slot header - Title and any actions for the whole card.
 * @slot - The card's main content.
 * @slot footer - Actions that conclude the card.
 */
@customElement('helix-base-card')
export class HelixBaseCard extends HelixElement {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the box. Set here rather than in
    // `connectedCallback`, which the server never calls.
    this.internals.role = 'group'
  }

  protected override render(): TemplateResult {
    // Bare slots, with no wrapper element around any of them. A `<slot>` is
    // `display: contents` in the UA stylesheet, so an unassigned one generates
    // no box at all: no grid row, no gap, nothing. A wrapper would generate one
    // whether or not anything was slotted into it, which is what made an
    // omitted region paint an empty inset band and forced the component to
    // detect its own emptiness.
    //
    // Measured, same content: wrappers present but empty rendered 85px against
    // an ideal of 53px, and bare slots rendered 53px with no hiding logic.
    //
    // It has to be layout rather than detection, because the detection does not
    // exist. `:host(:has([slot='header']))` is invalid CSS, so the whole rule is
    // dropped and the region stays hidden even when filled, and the component
    // cannot inspect its children on the server to do it in JavaScript.
    return html`
      <slot name="media"></slot>
      <slot name="header"></slot>
      <slot></slot>
      <slot name="footer"></slot>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-card': HelixBaseCard
  }
}
