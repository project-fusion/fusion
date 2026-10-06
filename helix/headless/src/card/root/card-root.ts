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
 * Name the card with `label`, as a Stat Group is named, or with `aria-label`
 * or `aria-labelledby`. These are the only names that work with server
 * rendering, because reading a title from the light DOM needs a DOM, and the
 * server has none. `label` is set through `ElementInternals`, so it writes no
 * attribute onto the card. **A named card is a group**, so a
 * reader entering it hears its name; an unnamed one has no role, since a group
 * with no name only adds "group" to what a reader says.
 *
 * Each region's slot is a part of the same name, `body` for the main content,
 * as Web Awesome's card names its regions. A slot draws no box, so a part
 * passes inherited properties to what is slotted, and a page wanting a box
 * there gives it one with `display`.
 *
 * `header-actions` and `footer-actions` hold controls at the end of the
 * header's and the footer's line, as Web Awesome's card does. While one holds
 * something, its line is a `header-row` or `footer-row` part; otherwise there
 * is no wrapper and every region is a bare slot. A server cannot see slotted
 * content, so served actions sit on their own line until the script runs.
 *
 * **The card says which regions it holds**, as `:state(has-media)`,
 * `:state(has-header)` and `:state(has-footer)`, so a sheet can draw a card
 * with a header differently, as Web Awesome's `with-header` does, with no
 * attribute written onto the card. Read in the browser, so a served card
 * carries none until the script runs.
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
 * @csspart body - The slot the main content arrives through. A slot draws no box, so it passes inherited properties, such as color and font, to the content; `display: block` gives it one.
 * @csspart footer - The slot the footer arrives through, drawing no box, as `body` does.
 * @csspart footer-actions - The slot the footer's controls arrive through, drawing no box, as `body` does.
 * @csspart footer-row - The line holding `footer` and `footer-actions`, drawn only while `footer-actions` holds something.
 * @csspart header - The slot the header arrives through, drawing no box, as `body` does.
 * @csspart header-actions - The slot the header's controls arrive through, drawing no box, as `body` does.
 * @csspart header-row - The line holding `header` and `header-actions`, drawn only while `header-actions` holds something.
 * @csspart media - The slot the media arrives through, drawing no box, as `body` does.
 *
 * @cssstate has-footer - Something is slotted into `footer` or `footer-actions`.
 * @cssstate has-header - Something is slotted into `header` or `header-actions`.
 * @cssstate has-media - Something is slotted into `media`.
 */
@customElement('helix-headless-card')
export class HelixHeadlessCard extends HelixElement {
  /**
   * The card's accessible name, which makes it a named group.
   *
   * The name `Stat.Group` and the other named regions take, set through
   * `ElementInternals`. `aria-label` and `aria-labelledby` written on the card
   * name it too, and win over this, as an author's attribute does.
   */
  @property()
  label = ''

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
    const named = Boolean(this.label.trim() || this.namedBy?.trim() || this.labelledBy?.trim())
    hostAria(this.internals, { label: this.label, role: named ? 'group' : '' })
  }

  /* Read after every render as well as on `slotchange`, because a hydrated
     slot was filled before any listener was bound and sends no change. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.readRegions()
  }

  /* One listener for every region's slot: `slotchange` bubbles inside the
     shadow root, and a binding on each slot would write a marker into the
     served markup beside every one of them. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.renderRoot.addEventListener('slotchange', this.readRegions)
  }

  /* Content arriving in the light DOM changes no property, so the slots are
     read here. Bound to the slots, because `slotchange` is not composed. The
     actions decide the rows; every region says whether it is filled as a
     state, written out one call apiece so each pairs with its `@cssstate`. */
  private readonly readRegions = (): void => {
    const filled = (name: string): boolean =>
      slotFilled(this.renderRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`))
    this.headerActions = filled('header-actions')
    this.footerActions = filled('footer-actions')
    this.toggleState('has-media', filled('media'))
    this.toggleState('has-header', this.headerActions || filled('header'))
    this.toggleState('has-footer', this.footerActions || filled('footer'))
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
    //
    // Each slot is a part, which draws no box either: a part on a slot is a
    // name a page reaches it by, and the slot stays `display: contents`.
    const header = html`<slot name="header" part="header"></slot
      ><slot
        name="header-actions"
        part="header-actions"
        @slotchange=${this.readRegions}
      ></slot>`
    const footer = html`<slot name="footer" part="footer"></slot
      ><slot
        name="footer-actions"
        part="footer-actions"
        @slotchange=${this.readRegions}
      ></slot>`
    return html`
      <slot name="media" part="media"></slot>
      ${this.headerActions ? html`<div part="header-row">${header}</div>` : header}
      <slot part="body"></slot>
      ${this.footerActions ? html`<div part="footer-row">${footer}</div>` : footer}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-card': HelixHeadlessCard
  }
}
