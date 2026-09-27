import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Groups related content and actions into a single surface.
 *
 * @description
 * The header, body, and footer regions are slots, because they have no state,
 * behavior, or API of their own. You bring your own markup, so a title can be a
 * real `<h2>`.
 *
 * The host is the surface. The element itself takes the border, the radius, and
 * the grid, so you style `Card` directly and there is no wrapper part to reach
 * through with `::part`.
 *
 * Name the card with `aria-label` or `aria-labelledby`. These are the only
 * names that work with server rendering, because reading a title from the light
 * DOM needs a DOM, and the server has none.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Panel, Surface
 * @documentation https://fusion.dev/helix/components/card
 *
 * @slot - The card's main content.
 * @slot footer - Actions that conclude the card.
 * @slot header - Title and any actions for the whole card.
 * @slot media - Image, video, or chart that runs edge to edge, outside the inset.
 */
@customElement('helix-headless-card')
export class HelixHeadlessCard extends HelixElement {
  /**
   * Places the media after the content. By default it comes before.
   *
   * **A figure that concludes a card is the same region as one that opens it**,
   * and the only thing that differs is which edge it is flush against. Media is
   * the one region that escapes the inset, so a chart wanting to span the card
   * has nowhere else to be: slotted into the content it keeps the padding on
   * both sides, and there is no second bleeding region to add without saying
   * twice what this says once.
   *
   * Reflected and undefaulted, so a card that has not asked reads as a card
   * with no attribute on it and the stylesheet only describes the departure.
   */
  @property({ attribute: 'media-placement', reflect: true })
  mediaPlacement?: 'end'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the box. Set here rather than in
    // `connectedCallback`, which the server never calls.
    hostAria(this.internals, { role: 'group' })
  }

  protected override render(): TemplateResult {
    // Bare slots, with no wrapper element around any of them. A `<slot>` is
    // `display: contents` in the UA stylesheet, so an unassigned one generates
    // no box at all: no grid row, no gap, nothing. A wrapper generates one
    // whether or not anything is slotted into it, so an omitted region would
    // paint an empty inset band.
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
    'helix-headless-card': HelixHeadlessCard
  }
}
