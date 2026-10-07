import {
  customElement,
  HelixElement,
  headingIn,
  hostAria,
  slotFilled,
} from '@fusion.dev/helix-core'
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
 * or `aria-labelledby`. `label` is set through `ElementInternals`, so it
 * writes no attribute onto the card. **A named card is a group**, so a
 * reader entering it hears its name; an unnamed one has no role, since a group
 * with no name only adds "group" to what a reader says.
 *
 * **With none of those, a heading in `header` names the card**, such as the
 * `<h2>` of its title, by reference, so the name follows the heading's words.
 * Reading a heading needs a DOM, so a served card is named by it once the
 * script runs; `label`, `aria-label` and `aria-labelledby` are the names a
 * server writes.
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
 * content, so a served card has no row; the styled tier sets served actions at
 * the end of their line from the stylesheet alone, so they do not move when
 * the script runs.
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
   * Hears a name written on the card, which no property mirrors.
   *
   * Lit observes the attributes of its own properties only, and `ariaLabel`
   * and `ariaLabelledByElements` belong to the platform. Observed here rather
   * than through a property, so the manifest lists no attribute of the card's
   * own for them.
   */
  static override get observedAttributes(): string[] {
    // biome-ignore lint/complexity/noThisInStatic: super runs Lit's getter with the subclass as this, so a styled card keeps its own attributes, where the class name would read the base's
    return [...super.observedAttributes, 'aria-label', 'aria-labelledby']
  }

  /**
   * Called by the browser when an observed attribute changes. A name written
   * or taken off asks for an update, because it decides whether the card is a
   * group and whether its heading names it.
   */
  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value)
    if (name === 'aria-label' || name === 'aria-labelledby') {
      this.requestUpdate()
    }
  }

  /** Whether `footer-actions` holds something, read from the slot. */
  @state()
  private footerActions = false

  /** Whether `header-actions` holds something, read from the slot. */
  @state()
  private headerActions = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.writeName()
  }

  /**
   * Says what the card is and what names it. On the host, since the host is
   * the box, and from `willUpdate`, which the server calls too.
   *
   * **A heading in `header` is the name only where nothing else is**, and it
   * names the card by reference, so a renamed heading renames the card. An
   * engine without element references hears its words.
   */
  private writeName(): void {
    const attribute = (name: string): boolean => Boolean(this.getAttribute?.(name)?.trim())
    const named =
      this.label.trim() !== '' || attribute('aria-label') || attribute('aria-labelledby')
    const heading = named
      ? null
      : headingIn(this.knownChildren.filter((child) => child.slot === 'header'))
    const references = 'ariaLabelledByElements' in this.internals
    hostAria(this.internals, {
      label: heading && !references ? (heading.textContent ?? '').trim() : this.label,
      labelledBy: heading ? [heading] : [],
      role: named || heading ? 'group' : '',
    })
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
    this.writeName()
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
