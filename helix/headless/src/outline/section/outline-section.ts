import { customElement, HelixElement, numberConverter } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { placeSection, removeSection } from './placed.js'

/**
 * @summary A section of the page that an outline draws a link for.
 *
 * @description
 * Outline Section marks a section of the page in code you share between the
 * web and a phone. The element takes `anchor` as its id, so a link to
 * `#install` reaches it, and an outline with no links of yours draws a link
 * for each Outline Section on the page, in the order they stand, with
 * `label` as its words and `level` as its `data-level`.
 *
 * On a phone, the section registers its view under `anchor`, as
 * `useSection` does, and the outline draws its link the same way.
 *
 * An id you set on the element yourself stays, and the web's link goes to
 * it. Set it to the same value as `anchor`, so both platforms link alike.
 *
 * @since 0.224.0
 * @status experimental
 * @category navigation
 * @documentation https://fusion.dev/helix/components/outline
 *
 * @slot - The section's content.
 */
@customElement('helix-headless-outline-section')
export class HelixHeadlessOutlineSection extends HelixElement {
  /** The section's id, which a link's fragment names: `install` for `#install`. */
  @property()
  anchor = ''

  /** The words the section's link says in an outline. Its id where empty. */
  @property()
  label = ''

  /** The level of the section's heading, from 1, which nests its link in an outline. */
  @property({ converter: numberConverter('level', 1) })
  level = 1

  override connectedCallback(): void {
    super.connectedCallback()
    placeSection(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    removeSection(this)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The id a link's fragment finds, where the page set none of its own. */
    if (
      changed.has('anchor') &&
      this.anchor !== '' &&
      (this.id === '' || this.id === changed.get('anchor'))
    ) {
      this.id = this.anchor
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('anchor') || changed.has('label') || changed.has('level')) {
      placeSection(this)
    }
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-outline-section': HelixHeadlessOutlineSection
  }
}
