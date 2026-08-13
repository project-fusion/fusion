import { HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { ifDefined } from 'lit/directives/if-defined.js'

/** Shadow-DOM id of the region, so a title outside the shadow root can name it. */
const REGION_ID = 'region'

/**
 * Cards group related content and actions into a single surface.
 *
 * The root owns the surface and the accessible name. Its parts are separate
 * elements rather than slots on one element, because a card's regions are
 * independently styleable, independently omittable, and frequently reordered:
 * `Card.Header`, `Card.Title`, `Card.Body`, `Card.Footer`.
 *
 * **Naming is coordinated, not assumed.** A card that groups content needs an
 * accessible name or it is an unlabelled group, which screen readers announce
 * as noise. Rather than requiring every consumer to pass `aria-label`, the root
 * looks for a `helix-card-title` in its light DOM and points at it. That
 * coordination is the whole reason these are compound components: a title
 * nested three levels down still names the card that contains it.
 *
 * @slot - The card's regions, typically Header, Body, and Footer.
 */
@customElement('helix-base-card')
export class HelixBaseCard extends HelixElement {
  /** Cached so a re-render does not clear a name that has not changed. */
  private labelledBy: string | null = null

  override connectedCallback(): void {
    super.connectedCallback()
    this.adoptTitle()
  }

  /**
   * Points the region at the first descendant title, if there is one.
   *
   * Searches the light DOM rather than the shadow root: the title is the
   * consumer's child, not ours. `querySelector` reaches nested titles, so a
   * title inside a header still names the card.
   */
  protected adoptTitle(): void {
    const title = this.querySelector('helix-card-title, helix-base-card-title')
    // `||` rather than `??`: an element with no id has `id === ''`, which is
    // not nullish, so `??` would accept it and emit `aria-labelledby=""`. An
    // empty reference is worse than no reference, because it names the group
    // as the empty string rather than leaving it unnamed.
    const id = title?.id || null
    if (id !== this.labelledBy) {
      this.labelledBy = id
      this.requestUpdate()
    }
  }

  /**
   * Adopts again once the first render has happened.
   *
   * `connectedCallback` runs before a parser-created element's children exist,
   * so the first pass finds nothing. `slotchange` is supposed to cover that and
   * does in browsers, but it only fires on *initial* assignment in some
   * implementations, so a card that depends solely on it renders unnamed under
   * a DOM that does not. Both hooks, and `adoptTitle` is idempotent.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.adoptTitle()
  }

  protected handleSlotChange = (): void => {
    this.adoptTitle()
  }

  protected override render(): TemplateResult {
    return html`
      <section
        id=${REGION_ID}
        aria-labelledby=${ifDefined(this.labelledBy ?? undefined)}
        part="container"
        role="group"
      >
        <slot @slotchange=${this.handleSlotChange}></slot>
      </section>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-card': HelixBaseCard
  }
}
