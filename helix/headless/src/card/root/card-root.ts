import { HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { HelixBaseCardTitle } from '../title/card-title.js'

/** Tags that can name a card. Either tier's title will do. */
const TITLE_SELECTOR = 'helix-card-title, helix-base-card-title'

const LABELLED_BY = 'aria-labelledby'

/**
 * @summary Groups related content and actions into a single surface.
 *
 * @description
 * Composed of regions rather than slots on one element, so a header, body, or
 * footer can be styled, omitted, and reordered independently.
 *
 * A card needs an accessible name or screen readers announce an unlabelled
 * group. Set `aria-labelledby` or `aria-label` yourself for a name that is
 * present in server-rendered HTML; otherwise the card adopts the first
 * `Card.Title` beneath it once it is in a browser.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/card
 * @alias Panel
 * @alias Surface
 *
 * @slot - Card regions, typically Header, Body, and Footer.
 * @csspart container - The card surface.
 */
@customElement('helix-base-card')
export class HelixBaseCard extends HelixElement {
  /** True when the consumer named the card, so adoption must not overwrite it. */
  private consumerNamed = false

  override connectedCallback(): void {
    super.connectedCallback()
    this.consumerNamed = this.hasAttribute(LABELLED_BY) || this.hasAttribute('aria-label')
    this.addEventListener(HelixBaseCardTitle.readyEvent, this.handleTitleReady)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener(HelixBaseCardTitle.readyEvent, this.handleTitleReady)
  }

  private handleTitleReady = (): void => {
    this.adoptTitle()
  }

  /**
   * Sets the role, which needs no DOM access and so is safe on the server.
   *
   * ARIA belongs on the host rather than the shadow-DOM container because
   * IDREFs do not cross shadow boundaries: a reference from inside the shadow
   * root could never resolve to a title in the light DOM.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.setAttribute('role', 'group')
  }

  /**
   * Adopts a title's id as the card's accessible name.
   *
   * Deliberately in `firstUpdated` rather than `willUpdate`: **SSR has no DOM.**
   * The server-side element shim carries attributes but not tree traversal, so
   * `querySelector` is undefined there and any parent-to-child coordination
   * throws. Running here makes adoption a client-side enhancement over whatever
   * the consumer set, which is what actually reaches the server.
   */
  protected adoptTitle(): void {
    if (this.consumerNamed) {
      return
    }

    // `||` not `??`: an element with no id has `id === ''`, which is not
    // nullish, and an empty reference names the group the empty string rather
    // than leaving it unnamed.
    const id = this.querySelector(TITLE_SELECTOR)?.id || null
    if (id) {
      this.setAttribute(LABELLED_BY, id)
    } else {
      this.removeAttribute(LABELLED_BY)
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.adoptTitle()
  }

  protected handleSlotChange = (): void => {
    this.adoptTitle()
  }

  protected override render(): TemplateResult {
    return html`
      <div part="container">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-card': HelixBaseCard
  }
}
