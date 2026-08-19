import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A sequence of stages, and where the reader is in it.
 *
 * @description
 * **Each step states its own position, and nothing here coordinates them.** A
 * step is `complete`, or `current`, or neither, and it says so on itself. The
 * alternative is an `active` index on this element, which reads better in
 * markup and cannot render on a server: this element would have to count its
 * slotted children to know which one is third, and the server has no children
 * to count. A stepper whose state appears only after hydration is a stepper
 * that flashes every stage as unvisited on first paint.
 *
 * The consequence is that the numbering is not JavaScript either. It is a CSS
 * counter in the tier above, which the browser resolves at layout with no
 * script at all, so the third step reads "3" in the server's own markup.
 *
 * **The connector belongs to the step, not to the list.** Each one draws the
 * line that arrives at it and hides it when it is first, the same arrangement
 * Breadcrumbs uses for its separator and for the same reason: a line drawn
 * between items needs either an index or a parent that counts, and drawing it
 * on the item needs neither.
 *
 * `role="list"` on the host rather than an `<ol>` in the shadow root. The steps
 * are the consumer's elements in the light DOM, so an `<ol>` here would be a
 * list whose items are somewhere else.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Stepper, Wizard, Progress steps
 * @documentation https://helix.fusion.dev/components/steps
 *
 * @slot - The steps, which are `helix-step` elements.
 */
@customElement('helix-base-steps')
export class HelixBaseSteps extends HelixElement {
  /**
   * Accessible name for the sequence.
   *
   * A list of stages is a landmark a reader arrives at out of order, so it
   * needs a name of its own rather than borrowing the heading above it.
   */
  @property()
  label = 'Steps'

  /**
   * Which way the steps run.
   *
   * Absent is a row, which is what a form header wants. `vertical` stacks them,
   * for a sidebar or a narrow column, and is the shape with room under a step
   * for what the stage holds.
   */
  @property({ reflect: true })
  orientation?: 'vertical'

  /**
   * Where a step's name sits against its marker.
   *
   * Absent is beside it. `below` puts it under, which is the shape a row of
   * four or five stages wants: names beside markers in a row spend the width on
   * text and leave the connectors as stubs between them.
   *
   * On the list rather than on each step, for the reason density is on a region
   * rather than on each control: a row where one name is beside its marker and
   * the next is under it is a row nobody meant, and said once it is unwritable
   * rather than merely discouraged.
   */
  @property({ reflect: true })
  labels?: 'below'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'list' })
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-steps': HelixBaseSteps
  }
}
