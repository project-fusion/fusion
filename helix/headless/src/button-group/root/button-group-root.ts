import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Groups related buttons into one control.
 *
 * @description
 * Sets `role="group"` on the host through internals, and `label` names the
 * group. Without a name, a screen reader announces the buttons as separate
 * controls.
 *
 * The group does not manage focus, so each button keeps its own tab stop. For
 * one tab stop with arrow keys between the buttons, the APG toolbar pattern,
 * use Toolbar.
 *
 * Buttons are slotted, so they stay your own elements and keep their own
 * appearance and size.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Segmented buttons, Split button
 * @documentation https://fusion.dev/helix/components/button-group
 *
 * @slot - The buttons in the group.
 */
@customElement('helix-headless-button-group')
export class HelixHeadlessButtonGroup extends HelixElement {
  /**
   * The group's name, read by screen readers.
   *
   * On the host through internals, so an author's `aria-label` still overrides
   * it and nothing lands on the host that a consumer's markup did not have.
   */
  @property()
  label = ''

  /**
   * Which way the buttons are stacked.
   *
   * Unset is a row and stays unset, so a reflected default cannot appear on a
   * host whose server output never had it.
   *
   * **A property and not an `auto`, which the splitter and the carousel earned
   * and this has not.** Turning those two changes what they *do*: a drag axis,
   * arrow keys, how many slides a page holds. A group of buttons turning is
   * paint, so there is no state to resolve and nothing to observe; what it needs
   * is for a consumer who knows the column is narrow to be able to say so.
   *
   * **What it is for, measured.** Three buttons at 320 come to 322 and overflow
   * the page by 26. A row of joined buttons cannot answer that by wrapping,
   * which is the obvious reach and the wrong one: the group's whole contract is
   * buttons sharing edges as one shape, and a wrapped row carries the corners of
   * a first row into a second. Stacked, the same three keep one shape and one
   * column.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'group' })
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-button-group': HelixHeadlessButtonGroup
  }
}
