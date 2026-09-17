import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A named run of options inside a listbox.
 *
 * @description
 * A heading over a set, and nothing else: it holds no selection and no value,
 * because grouping is presentation over a list whose owner is the listbox. Its
 * options are still the listbox's options, which is what keeps the keyboard
 * moving through a grouped list exactly as it moves through a flat one.
 *
 * `role="group"` named by the heading, so a screen reader announces which run
 * an option is in without the heading becoming something to land on.
 *
 * @since 0.1.0
 * @status stable
 * @aliases OptGroup, Section
 * @documentation https://fusion.dev/helix/components/option
 *
 * @slot - The options in this run.
 * @slot label - Richer than a string.
 *
 * @csspart items - The run itself.
 * @csspart label - The heading.
 */
@customElement('helix-headless-option-group')
export class HelixHeadlessOptionGroup extends HelixElement {
  /**
   * The heading over the run.
   */
  @property()
  label = ''

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The string half, which is what a server can write. `nameFromHeading`
       adds the element reference on the client and wins where a consumer
       slotted a heading richer than a string. */
    hostAria(this.internals, { label: this.label, role: 'group' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.nameFromHeading()
  }

  /**
   * Names the run after the heading it drew, whatever the heading is made of.
   *
   * **The string alone was not the name of the heading, it was the name of one
   * way of writing it.** `label` reached `ariaLabel` and the slot reached the
   * screen, so a consumer who took the documented `label` slot for a heading
   * richer than a string got a `role="group"` with no accessible name at all,
   * and the words they wrote were the one thing a reader could not hear: the
   * heading carries `aria-hidden`, because the name was supposed to be on the
   * host already. Set both and they disagreed, the host saying the string and
   * the panel showing the slot.
   *
   * So the host points at the heading, which is the one thing that is always
   * what a reader sees. `ElementInternals` and not an IDREF, because the host
   * is in the light DOM and the heading is in this shadow root, which is the
   * boundary `aria-labelledby` cannot cross. `MixinField.linkHost` does the
   * same for a field's label and records the measurement.
   *
   * Client only. Element references need the nodes to exist, and the server has
   * the string.
   */
  private nameFromHeading(): void {
    const heading = this.partNamed('label')
    hostAria(this.internals, { labelledBy: heading ? [heading] : [] })
  }

  protected override render(): TemplateResult {
    return html`<span part="label" aria-hidden="true">
        <slot name="label">${this.label}</slot>
      </span>
      <div part="items"><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-option-group': HelixHeadlessOptionGroup
  }
}
