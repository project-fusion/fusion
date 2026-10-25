import { customElement, HelixElement, slotFilled } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A column of a megamenu's panel: a heading and the destinations under it.
 *
 * @description
 * A group named by its heading, which is `label`, or what is passed into
 * `label`, such as a product's mark and its name. The heading is a heading
 * of level 3, so a screen reader finds each column in the page's outline,
 * and a group with no name draws none. Its destinations are the Megamenu
 * Items passed in.
 *
 * @since 0.224.0
 * @status experimental
 * @category navigation
 * @aliases Mega menu column, Flyout section
 * @documentation https://fusion.dev/helix/components/megamenu
 *
 * @slot - The destinations: Megamenu Items.
 * @slot label - The heading, in place of `label`, such as an icon and words.
 *
 * @csspart group - The group around the heading and the destinations, named by the heading.
 * @csspart label - The heading.
 */
@customElement('helix-headless-megamenu-group')
export class HelixHeadlessMegamenuGroup extends HelixElement {
  /** The column's heading, drawn above its destinations. */
  @property()
  label = ''

  /** Whether something is passed into `label`. */
  @state()
  private slottedLabel = false

  private readonly readLabel = (): void => {
    this.slottedLabel = slotFilled(
      this.renderRoot.querySelector<HTMLSlotElement>('slot[name="label"]'),
    )
  }

  /* A heading slotted before the first render is assigned without a
     `slotchange` everywhere, so it is read once here as well. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.readLabel()
  }

  protected override render(): TemplateResult {
    const named = this.label !== '' || this.slottedLabel
    return html`<div part="group" role="group" aria-labelledby=${named ? 'label' : nothing}>
      <div part="label" id="label" role="heading" aria-level="3" ?hidden=${!named}>
        <slot name="label" @slotchange=${this.readLabel}>${this.label}</slot>
      </div>
      <slot></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-megamenu-group': HelixHeadlessMegamenuGroup
  }
}
