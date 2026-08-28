import { customElement, HelixElement, hostAria } from '@helix-io/core'
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
 * @status experimental
 * @aliases OptGroup, Section
 * @documentation https://helix.fusion.dev/components/option-group
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
    hostAria(this.internals, { label: this.label, role: 'group' })
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
