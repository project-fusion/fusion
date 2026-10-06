import { customElement, HelixElement, slotFilled } from '@fusion.dev/helix-core'
import { html, nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A named set of actions inside a speed dial, set apart from the rest.
 *
 * @description
 * A `group` of the dial's menu, named by its label, as React Aria's menu
 * sections and Menu's groups are: a reader hears the name on entering the set,
 * and the arrow keys walk through every group's actions in order, from the
 * last action of one group to the first of the next.
 *
 * Put actions straight into the group, and the group straight into the dial.
 * Anything else slotted here is drawn and is not an action.
 *
 * @since 0.141.0
 * @status experimental
 * @category actions
 * @aliases Speed dial section, Action group
 * @documentation https://fusion.dev/helix/components/speed-dial
 *
 * @slot - The group's actions.
 * @slot label - The group's name, for content richer than the `label` text.
 *
 * @csspart group - The set, which carries the `group` role.
 * @csspart label - The group's name, drawn above its actions while there is one.
 */
@customElement('helix-headless-speed-dial-group')
export class HelixHeadlessSpeedDialGroup extends HelixElement {
  /**
   * The group's name, drawn above its actions and read by screen readers.
   */
  @property()
  label = ''

  /**
   * @internal Read by the dial to find the actions inside a group, which is
   * cheaper than `instanceof` and is why this is public rather than protected.
   * Not a consumer's to read or set.
   */
  readonly isSpeedDialGroup = true

  /** Whether anything is in the `label` slot, so the name is drawn from it. */
  @state()
  private labelSlotted = false

  private readonly readLabel = (event: Event): void => {
    this.labelSlotted = slotFilled(event.target as HTMLSlotElement)
  }

  protected override render(): TemplateResult {
    const named = this.label !== '' || this.labelSlotted
    return html`<div part="group" role="group" aria-labelledby=${named ? 'label' : nothing}>
      <span id="label" part="label" ?hidden=${!named}
        ><slot name="label" @slotchange=${this.readLabel}>${this.label}</slot></span
      >
      <slot></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-speed-dial-group': HelixHeadlessSpeedDialGroup
  }
}
