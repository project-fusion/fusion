import { HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'

/**
 * Monotonic suffix for generated ids.
 *
 * A counter rather than a random value because ids must be identical across a
 * server render and the hydration that follows it, and a random id differs
 * between the two.
 */
let sequence = 0

/**
 * @summary Names the card that contains it.
 *
 * @description
 * Ensures it has an id, because `Card.Root` names itself by pointing
 * `aria-labelledby` at this element and cannot reference one without an id. A
 * consumer-supplied id is left alone.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot - The title text.
 *
 * @csspart heading - The heading element.
 */
@customElement('helix-base-card-title')
export class HelixBaseCardTitle extends HelixElement {
  /** Internal signal that a title is ready to be referenced by its card. */
  static readonly readyEvent = 'helix-card-title-ready'

  /** Heading level, 1 through 6. */
  @property({ reflect: true, type: Number })
  level: 1 | 2 | 3 | 4 | 5 | 6 = 3

  /**
   * Assigns an id in `willUpdate`, which SSR calls, rather than
   * `connectedCallback`, which it does not.
   *
   * The guard is what makes hydration safe: the server writes the id into the
   * HTML, the client sees it already present and skips generation, so the two
   * agree regardless of the counter's state in either environment.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (!this.id) {
      sequence += 1
      this.id = `helix-card-title-${sequence}`
    }
  }

  /**
   * Announces this title to the card containing it.
   *
   * A parent cannot poll for a child that has not upgraded yet: the card's
   * first render can happen before this element has assigned its id, and
   * nothing would re-trigger the read. The child announcing itself handles
   * every ordering, including insertion long after mount.
   *
   * This is the descendant-registration pattern every compound component
   * needs (Tabs and Tab, Accordion and Item, Select and Option). It should
   * become a controller in `@helix-io/core` on its second use.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.dispatchEvent(new Event(HelixBaseCardTitle.readyEvent, { bubbles: true, composed: true }))
  }

  protected override render(): TemplateResult {
    // Lit cannot interpolate a tag name, and the correct heading level depends
    // on the surrounding document, so the role carries the semantics.
    return html`
      <div aria-level=${this.level} part="heading" role="heading">
        <slot></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-card-title': HelixBaseCardTitle
  }
}
