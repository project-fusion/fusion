import { HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'

/**
 * Monotonic suffix for generated ids.
 *
 * Deliberately a counter rather than a random value: ids must be stable across
 * a server render and the client hydration that follows it, and a random id
 * differs between the two, which React reports as a hydration mismatch.
 */
let sequence = 0

/**
 * Titles name the card that contains them.
 *
 * The element ensures it has an id, because `Card.Root` names itself by
 * pointing `aria-labelledby` at this title and cannot point at an element with
 * no id. Consumers may set their own id and it is left alone.
 *
 * @slot - The title text.
 */
@customElement('helix-base-card-title')
export class HelixBaseCardTitle extends HelixElement {
  /**
   * Heading level rendered, 1 through 6.
   *
   * A card's title is a heading, and its correct level depends on the document
   * around it, which the component cannot know. Defaulting to 3 and letting the
   * consumer correct it beats hard-coding a level that is wrong half the time.
   */
  @property({ reflect: true, type: Number })
  level: 1 | 2 | 3 | 4 | 5 | 6 = 3

  override connectedCallback(): void {
    super.connectedCallback()
    if (!this.id) {
      sequence += 1
      this.id = `helix-card-title-${sequence}`
    }
  }

  protected override render(): TemplateResult {
    // Lit cannot interpolate a tag name, and a card title is a heading whose
    // level the consumer controls, so the role carries the semantics instead.
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
