import {
  customElement,
  focusItemOf,
  formatWords,
  HelixElement,
  hostAria,
  KeyboardNavigationController,
  MixinControllerActive,
  type NavigableItem,
  whenHydrated,
  words,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { canReach, progressOf } from '../reach.js'
import type { HelixHeadlessStep } from '../step/step.js'

/**
 * A stage as the arrow keys move through it: its name, which is the control.
 * A press from what the stage holds is the stage's own, so the arrows keep
 * moving the caret in a field there.
 */
const navigable = (step: HelixHeadlessStep): NavigableItem => {
  const label = (): Element | null | undefined => step.shadowRoot?.querySelector('[part="label"]')
  return focusItemOf(step, {
    disabled: step.disabled || step.locked,
    focus: () => step.focus(),
    owns: (node) => {
      const control = label()
      return Boolean(control && node && (node === control || control.contains(node)))
    },
  })
}

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
 * same rules, for your own buttons. `reset()` goes back to the first stage and
 * clears every stage's `complete`, as Ark UI's `resetStep` does.
 *
 * `completion="passed"` marks a stage `complete` once a reader moves past it,
 * as Ark UI counts a stage before the current one as completed. Going back
 * leaves it complete. In a `linear` sequence the next stage is then in reach
 * from the current one, and `validate` decides whether the reader may go.
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
 * **Keyboard.** Each stage's name is a button and its own tab stop, and Enter
 * or Space goes to the stage. Set `arrows` and the arrow keys move focus
 * between the names as well, as Ark UI's steps do: Left and Right along a row,
 * Up and Down a column, Home and End to the first and the last. The arrows
 * pass over a disabled stage and one a linear sequence holds out of reach,
 * and they move focus without going to the stage.
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
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-steps': { progressLabel: '{share, number, percent} erledigt' } })`.
   */
  static words = 'helix-steps'

  /**
   * Whether the arrow keys move focus between the stages' names, along the
   * way the steps run. Off by default, so the arrows keep scrolling the page.
   */
  @property({ type: Boolean })
  arrows = false

  /**
   * What marks a stage `complete`.
   *
   * Absent, you do: each step's `complete` is yours, because a reader who
   * steps back has finished more stages than the one they are on. `passed`
   * marks every stage before the one a reader moves to, and leaves the marks
   * when they go back.
   */
  @property({ reflect: true })
  completion?: 'passed'

  /**
   * The sequence's name, read by screen readers.
   *
   * A list of stages is a landmark a reader arrives at out of order, so it
   * needs a name of its own rather than borrowing the heading above it.
   */
  @words
  @property()
  label = 'Steps'

  /**
   * Whether a reader has to finish each stage, or pass an `optional` one,
   * before going on to the next.
   */
  @property({ reflect: true, type: Boolean })
  linear = false

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
   * What the `progress` part says to a screen reader. `{share, number,
   * percent}` writes `progress` as a percentage the way the locale writes one,
   * such as `40%`, or `40 %` in French. `{percent}` is `progress` as a whole
   * number, for a sentence that places the sign itself.
   */
  @words
  @property({ attribute: 'progress-label' })
  progressLabel = '{share, number, percent} complete'

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

  /* The arrows along the way the steps run, from where focus is, choosing
     nothing and stopping at the ends, as Navigation's do. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => (this.arrows ? this.steps.map(navigable) : []),
    origin: 'focus',
    reserved: () =>
      this.orientation === 'vertical' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowDown', 'ArrowUp'],
    selects: () => false,
    wrap: false,
  })

  /** The steps, in the order the consumer wrote them. */
  private get steps(): HelixHeadlessStep[] {
    return [...this.querySelectorAll<HelixHeadlessStep>(':scope > *')].filter(
      (one) => 'current' in one,
    )
  }

  /**
   * The index of the stage the reader is on, or `-1`.
   *
   * Read from `active` once anything has set it, because a move writes
   * `active` at once and each step's `current` only on the next update: two
   * calls to `next()` in one task then move two stages.
   */
  private get at(): number {
    const steps = this.steps
    if (this.active === '') {
      return steps.findIndex((step) => step.current)
    }
    const item = this.resolveActive(steps)
    return item ? steps.indexOf(item) : -1
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

  /**
   * Goes back to the first stage that can be gone to, and clears `complete`
   * and the invalid mark from every stage, as Ark UI's `resetStep` does.
   * Returns whether it moved: a listener can refuse the move with
   * `helix-before-activate`, and the stages then keep their marks.
   */
  reset(): boolean {
    const steps = this.steps
    const first = steps.find((one) => !one.disabled)
    if (!first || !this.requestActive(first.value)) {
      return false
    }
    for (const one of steps) {
      one.complete = false
      one.invalid = false
    }
    return true
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
    return !this.linear || canReach(this.steps, this.at, index, this.completion === 'passed')
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
    const reached = steps.findIndex((step) => step.value === value)
    steps.forEach((step, index) => {
      const current = index === reached
      const passed = this.completion === 'passed' && index < reached
      /* Not into a step still hydrating what a server sent: see `whenHydrated`. */
      whenHydrated(step, () => {
        step.current = current
        if (passed) {
          step.complete = true
        }
      })
    })
  }

  /* Through the mixin, so a consumer can refuse the change with
     `helix-before-activate`.

     **And only if the step's own choice stood, read a microtask later.**
     `helix-select` is cancelable, and the docblock tells you to listen for it
     on the sequence. This listener is on the sequence too, added when it
     connected, so it runs ahead of a listener you add afterwards, and read
     inline the flag was not set yet: a refusal on the sequence changed
     nothing. The dispatch is synchronous, so a microtask is after every
     listener. `Tabs` and `Radio.Group` hold the same pair for the same
     event. */
  private readonly handleSelection = (event: Event): void => {
    /* Only a choice made by one of this sequence's own steps. A tab set, a tree
       or a menu in a step's `content` sends `helix-select` too, and it bubbles
       out of the step: acted on, it set `active` to a value no step has. */
    if (!this.steps.includes(event.target as HelixHeadlessStep)) {
      return
    }
    queueMicrotask(() => {
      const index = this.steps.indexOf(event.target as HelixHeadlessStep)
      if (event.defaultPrevented || !this.reachable(index) || !this.valid(index)) {
        return
      }
      this.requestActive((event as CustomEvent<{ value: string }>).detail.value)
    })
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
    if (changed.has('active') || changed.has('completion')) {
      this.sync()
    }
    if (changed.has('linear') || changed.has('active') || changed.has('completion')) {
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
        aria-valuetext=${formatWords(this, 'progressLabel', { percent: progress, share: progress / 100 })}
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
