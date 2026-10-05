import { customElement, HelixElement, hostAria, slotFilled } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

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
 * DOM needs a DOM, and the server has none. **A named card is a group**, so a
 * reader entering it hears its name; an unnamed one has no role, since a group
 * with no name only adds "group" to what a reader says.
 *
 * `header-actions` and `footer-actions` hold controls at the end of the
 * header's and the footer's line, as Web Awesome's card does. While one holds
 * something, its line is a `header-row` or `footer-row` part; otherwise there
 * is no wrapper and the regions lay out as before. A server cannot see slotted
 * content, so served actions sit on their own line until the script runs.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Panel, Surface
 * @documentation https://fusion.dev/helix/components/card
 *
 * @slot - The card's main content.
 * @slot footer - Actions that conclude the card.
 * @slot footer-actions - Controls at the end of the footer's line, with the footer at its start.
 * @slot header - Title and any actions for the whole card.
 * @slot header-actions - Controls for the whole card at the end of the header's line, such as a menu.
 * @slot media - Image, video, or chart that runs edge to edge, outside the inset.
 *
 * @csspart footer-row - The line holding `footer` and `footer-actions`, drawn only while `footer-actions` holds something.
 * @csspart header-row - The line holding `header` and `header-actions`, drawn only while `header-actions` holds something.
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

  /**
   * @internal The host's `aria-labelledby`, observed so the card becomes a
   * group once it is named. Not reflected: the attribute is the consumer's.
   */
  @property({ attribute: 'aria-labelledby' })
  protected labelledBy: string | null = null

  /**
   * @internal The host's `aria-label`, observed for the same reason as
   * `labelledBy`. Not reflected: the attribute is the consumer's.
   */
  @property({ attribute: 'aria-label' })
  protected namedBy: string | null = null

  /** Whether `footer-actions` holds something, read from the slot. */
  @state()
  private footerActions = false

  /** Whether `header-actions` holds something, read from the slot. */
  @state()
  private headerActions = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the box. Set here rather than in
    // `connectedCallback`, which the server never calls.
    const named = Boolean(this.namedBy?.trim() || this.labelledBy?.trim())
    hostAria(this.internals, { role: named ? 'group' : '' })
  }

  /* Read after every render as well as on `slotchange`, because a hydrated
     slot was filled before any listener was bound and sends no change. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.readActions()
  }

  /* Content arriving in the light DOM changes no property, so the slots are
     read here. Bound to the slots, because `slotchange` is not composed. */
  private readonly readActions = (): void => {
    const filled = (name: string): boolean =>
      slotFilled(this.renderRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`))
    this.headerActions = filled('header-actions')
    this.footerActions = filled('footer-actions')
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
    //
    // A line with actions is the one wrapper, drawn only while the actions slot
    // holds something, so a card without actions renders what it always did.
    const header = html`<slot name="header"></slot
      ><slot name="header-actions" @slotchange=${this.readActions}></slot>`
    const footer = html`<slot name="footer"></slot
      ><slot name="footer-actions" @slotchange=${this.readActions}></slot>`
    return html`
      <slot name="media"></slot>
      ${this.headerActions ? html`<div part="header-row">${header}</div>` : header}
      <slot></slot>
      ${this.footerActions ? html`<div part="footer-row">${footer}</div>` : footer}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-card': HelixHeadlessCard
  }
}
