import {
  customElement,
  fillTemplate,
  HelixElement,
  hostAria,
  MixinControllerActive,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { canReach, progressOf } from '../reach.js'
import type { HelixHeadlessStep } from '../step/step.js'

/**
 * @summary A sequence of stages that shows which stage the user is on.
 *
 * @description
 * `active` sets where the user is, and `complete` stays on each step. Returning
 * to stage one of three leaves stages one and two finished, so the root sets
 * `current` on the steps and never changes `complete`.
 *
 * `active` is optional. Without it, each step keeps its own `current`, so the
 * sequence is correct in the server's markup, where the root cannot count its
 * slotted children.
 *
 * `linear` keeps a reader from passing a stage they have not finished, as Ark
 * UI's linear steps do: a stage ahead is out of reach, and its button disabled,
 * until every stage before it is `complete` or `optional`. Going back is always
 * allowed. `next()` and `previous()` move one stage either way, under the
 * same rules, for your own buttons.
 *
 * To check a stage before a reader moves on from it, set `validate` to a
 * function that answers whether the stage is valid, as Ark UI's `isStepValid`
 * does. Moving forward asks it about the stage the reader is on, and where it
 * answers `false` the reader stays and the stage is `:state(invalid)` until it
 * answers `true`. An `optional` stage is not asked. `helix-before-activate`
 * is still sent for every move, for a check of your own.
 *
 * `progress` is how far through the sequence is, from 0 to 100: the share of
 * its stages that are `complete`. The `progress` part carries it as a
 * `progressbar` and as `--steps-progress`, and is hidden until a stylesheet
 * gives it a `display`, so a bar of your own costs nothing until you draw it.
 * A screen reader hears it as `progress-label` says, "33% complete" unless
 * set, as Ark UI's steps write it. The sequence is `:state(complete)` once
 * every stage is.
 *
 * The sequence is a list named by `label`, and each step a list item. The
 * current stage's button says `aria-current="step"`, and a finished stage's
 * button is described by its `complete-label`.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Stepper, Wizard, Progress steps
 * @documentation https://fusion.dev/helix/components/steps
 *
 * @slot - The steps.
 *
 * @event {HelixActivateEvent} helix-activate - Fired after the current step changes, when the element already holds the new step.
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired before the active step changes. Cancelable: cancel it to keep the current step.
 * @event {HelixSelectEvent} helix-select - Fired when a step is pressed. The step dispatches it, and you can listen for it on the sequence. Cancelable: cancel it to keep the current step.
 *
 * @csspart progress - How far through the sequence is, as a `progressbar` carrying `--steps-progress`. Hidden until a stylesheet gives it a `display`.
 *
 * @cssproperty --steps-progress - How far through the sequence is, as a percentage, written on the `progress` part.
 *
 * @cssstate complete - Every stage is complete.
 */
@customElement('helix-headless-steps')
export class HelixHeadlessSteps extends MixinControllerActive(HelixElement) {
  /**
   * The sequence's name, read by screen readers.
   *
   * A list of stages is a landmark a reader arrives at out of order, so it
   * needs a name of its own rather than borrowing the heading above it.
   */
  @property()
  label = 'Steps'

  /**
   * Whether a reader has to finish each stage, or pass an `optional` one,
   * before going on to the next.
   */
  @property({ reflect: true, type: Boolean })
  linear = false

  /**
   * What the `progress` part says to a screen reader, with `{percent}` filled
   * in with `progress`.
   */
  @property({ attribute: 'progress-label' })
  progressLabel = '{percent}% complete'

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
   * A function that answers whether a stage is valid, asked about the stage a
   * reader is on before they move forward from it. Return `false` to keep them
   * there. Not asked of an `optional` stage, nor for a move back.
   */
  @property({ attribute: false })
  validate?: (step: HelixHeadlessStep) => boolean

  /**
   * How far through the sequence is, from 0 to 100: the share of its stages
   * that are `complete`, rounded to a whole number.
   */
  get progress(): number {
    return progressOf(this.steps)
  }

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

  /** The index of the stage the reader is on, or `-1`. */
  private get at(): number {
    return this.steps.findIndex((step) => step.current)
  }

  /**
   * Moves to the next stage that can be gone to, as Ark UI's `goToNextStep`
   * does. Returns whether it moved: not past the last stage, not into a stage
   * `linear` holds out of reach, and not where a listener refused.
   */
  next(): boolean {
    return this.step(1)
  }

  /** Moves to the stage before, as Ark UI's `goToPrevStep` does. Returns whether it moved. */
  previous(): boolean {
    return this.step(-1)
  }

  /** Moves `delta` stages, skipping disabled ones. */
  private step(delta: number): boolean {
    const steps = this.steps
    let index = this.at + delta
    while (steps[index]?.disabled) {
      index += delta
    }
    const target = steps[index]
    if (!target || !this.reachable(index) || !this.valid(index)) {
      return false
    }
    return this.requestActive(target.value)
  }

  /**
   * Whether the stage the reader is on lets them go to the stage at `index`,
   * by `validate`. Only a move forward is asked, and an `optional` stage is
   * never asked. The stage is marked invalid while the answer is no.
   */
  private valid(index: number): boolean {
    const from = this.steps[this.at]
    if (!from || index <= this.at || !this.validate || from.optional) {
      return true
    }
    const valid = this.validate(from)
    from.invalid = !valid
    return valid
  }

  /** Whether the stage at `index` can be gone to from where the reader is. */
  private reachable(index: number): boolean {
    return !this.linear || canReach(this.steps, this.at, index)
  }

  /** Marks the stages a linear sequence holds out of reach. Client only. */
  private lock(): void {
    const steps = this.steps
    steps.forEach((step, index) => {
      const locked = !this.reachable(index)
      whenHydrated(step, () => {
        step.locked = locked
      })
    })
  }

  /** Watches what decides a stage's reach: which is current, which are done. */
  private watcher: MutationObserver | undefined

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
      const current = step.value === value
      /* Not into a step still hydrating what a server sent: see `whenHydrated`. */
      whenHydrated(step, () => {
        step.current = current
      })
    }
  }

  /* Through the mixin, so a consumer can refuse the change with
     `helix-before-activate`.

     **And only if the step's own choice stood.** `helix-select` is cancelable
     and the step documents it as refusable; this element is the only thing that
     acts on it, so a refusal nothing read was a veto that did nothing. This is
     a bubble listener for an event from a child, so every listener on the step
     has already run by the time it arrives. */
  private readonly handleSelection = (event: Event): void => {
    /* Only a choice made by one of this sequence's own steps. A tab set, a tree
       or a menu in a step's `content` sends `helix-select` too, and it bubbles
       out of the step: acted on, it set `active` to a value no step has. */
    if (event.defaultPrevented || !this.steps.includes(event.target as HelixHeadlessStep)) {
      return
    }
    const index = this.steps.indexOf(event.target as HelixHeadlessStep)
    if (!this.reachable(index) || !this.valid(index)) {
      return
    }
    this.requestActive((event as CustomEvent<{ value: string }>).detail.value)
  }

  private readonly handleSlotChange = (): void => {
    this.sync()
    this.lock()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection)
    /* A stage a script finishes, or one the reader arrives at, moves what a
       linear sequence can reach. Both are reflected, so their attributes say
       when they change. */
    this.watcher = new MutationObserver(() => {
      this.lock()
      this.requestUpdate()
    })
    this.watcher.observe(this, {
      attributeFilter: ['complete', 'current', 'optional'],
      attributes: true,
      subtree: true,
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
    this.watcher?.disconnect()
    this.watcher = undefined
  }

  /**
   * The steps where they can be known, and none on a server or while
   * hydrating, so the progress drawn first is the server's.
   */
  private get known(): HelixHeadlessStep[] {
    return this.knownChildren.filter((one): one is HelixHeadlessStep => 'current' in one)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'list' })
    const known = this.known
    this.toggleState('complete', known.length > 0 && known.every((step) => step.complete))
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('active')) {
      this.sync()
    }
    if (changed.has('linear') || changed.has('active')) {
      this.lock()
    }
  }

  protected override render(): TemplateResult {
    const progress = progressOf(this.known)
    return html`<slot @slotchange=${this.handleSlotChange}></slot>
      <div
        part="progress"
        role="progressbar"
        aria-label=${this.label}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow=${progress}
        aria-valuetext=${fillTemplate(this.progressLabel, { percent: String(progress) })}
        style="--steps-progress: ${progress}%"
        hidden
      ></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-steps': HelixHeadlessSteps
  }
}
