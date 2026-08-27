import { customElement, HelixElement, hostAria, MixinControllerActive } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixHeadlessStep } from '../step/step.js'

/**
 * @summary A sequence of stages, and where the reader is in it.
 *
 * @description
 * **`active` names where the reader is. `complete` stays on each step.** They
 * are two different facts and only one of them is positional. Deriving both
 * from a position is the obvious design and it is wrong the first time anybody
 * steps back: return to stage one of three and stages one and two are still
 * finished, while "everything before the active one" says only the first is.
 * So this element drives `current` and never touches `complete`.
 *
 * **`active` is optional, and a sequence without it still renders.** Left
 * unset, each step's own `current` stands and nothing here overwrites it, which
 * is what lets the whole sequence be right in the server's markup: this element
 * would have to count its slotted children to know which one is third, and the
 * server has no children to count. Set it, and it wins, because it is a
 * statement about the sequence where the attribute on a step is a statement
 * about one step.
 *
 * That is also why the numbering is not JavaScript. It is a CSS counter in the
 * tier above, which the browser resolves at layout with no script at all, so
 * the third step reads "3" in the server's own markup.
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
 *
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired when the active step changes.
 */
@customElement('helix-headless-steps')
export class HelixHeadlessSteps extends MixinControllerActive(HelixElement) {
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
  variant?: 'numeric'

  /** The steps, in the order the consumer wrote them. */
  private get steps(): HelixHeadlessStep[] {
    return [...this.querySelectorAll<HelixHeadlessStep>(':scope > *')].filter(
      (one) => 'current' in one,
    )
  }

  /**
   * Puts `active` on whichever step owns it.
   *
   * Returns without touching anything where nothing has set `active`, which is
   * the case a server renders: the steps' own `current` is the state then, and
   * overwriting it on hydration is exactly the flash this design exists to
   * avoid.
   *
   * `current` only. `complete` is the consumer's on each step, because a reader
   * who steps back has finished more stages than they are standing in front of.
   */
  private sync(): void {
    if (this.active === '') {
      return
    }
    const steps = this.steps
    const value = this.resolveActive(steps)?.value ?? ''
    for (const step of steps) {
      step.current = step.value === value
    }
  }

  private readonly handleSelection = (event: Event): void => {
    this.requestActive((event as CustomEvent<{ value: string }>).detail.value)
  }

  private readonly handleSlotChange = (): void => {
    this.sync()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'list' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('active')) {
      this.sync()
    }
  }

  protected override render(): TemplateResult {
    return html`<slot @slotchange=${this.handleSlotChange}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-steps': HelixHeadlessSteps
  }
}
