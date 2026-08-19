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
   * Absent is a row, which is what a form header wants, with each name under
   * its mark: beside them there is a word in the rule's path and the line would
   * be struck through it. `vertical` stacks them, names beside their marks,
   * which is the shape with room under a step for what the stage holds.
   *
   * Each axis has one arrangement rather than a second property offering both
   * in both. Of those four combinations three are ones nobody should pick, and
   * a property whose job is mostly to be left alone is a property that mostly
   * catches people out.
   */
  @property({ reflect: true })
  orientation?: 'vertical'

  /**
   * What each step is marked with.
   *
   * Absent is the state itself: a check where a stage is done, a target where
   * the reader is, an empty ring ahead of them. Three marks that need no
   * legend, which a number does: "3" says where a stage sits in the order and
   * nothing about whether it is finished.
   *
   * `numeric` is the older convention and is still the right one where the
   * order is the point, a form that says "step 3 of 5" beside it, or a sequence
   * a reader is told to come back to by number.
   */
  @property({ reflect: true })
  appearance?: 'numeric'

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
