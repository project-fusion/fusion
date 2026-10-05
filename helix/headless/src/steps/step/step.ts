import {
  customElement,
  drawStatus,
  HelixElement,
  HelixSelectEvent,
  hostAria,
  StatusController,
} from '@fusion.dev/helix-core'
import { check, circle, record } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
/* Relative, so this registers the base button and the styled file's identical
   import registers the styled one. `tier` picks which the template asks for. */
import '../../button/index.js'

/**
 * @summary One stage in a sequence.
 *
 * @description
 * Only the step's name is a button. The marker is `aria-hidden` decoration, so
 * it is outside the button. The name uses `Button`, so the hover wash, the
 * focus ring, and the disabled style come from `Button`.
 *
 * Every step can be pressed and fires `helix-select`. To stop the user from
 * moving to a step, set `disabled` on it.
 *
 * The marker is a slot, and its fallback shows the step's state: a check for a
 * finished stage, a target for the current stage, and an empty ring for a stage
 * not reached yet. Only that one mark is rendered, so the accessibility tree
 * has no hidden marks.
 *
 * The half lines on each side of the mark are drawn on the step's `::before`
 * and `::after` from properties the list sets, so the step renders no extra
 * element for them.
 *
 * A finished stage says so in words: the name's button is described by
 * `complete-label`, "Complete" unless you translate it, and a stage that
 * becomes complete while the page is open says it once in a polite live
 * region. The current stage's button carries `aria-current="step"`, and only
 * the button, so the state is said once, on the control.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Stage
 * @documentation https://fusion.dev/helix/components/steps
 *
 * @slot - The step's name.
 * @slot content - The stage's content. The headless tier always renders it, because it has no stylesheet to collapse it with. Your stylesheet decides whether it is collapsed.
 * @slot description - A line under the name that describes the stage.
 * @slot marker - Replaces the number, or the check a complete step shows.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the step is pressed. Cancelable: cancel it to keep the current step.
 *
 * @csspart body - The name and its description.
 * @csspart content - What the stage holds, while it is open.
 * @csspart description - The line under the name.
 * @csspart label - The step's name, which is a control.
 * @csspart label-button - The button inside the label.
 * @csspart label-live - The live region inside that button, rendered only from the first time the button is pending.
 * @csspart label-text - The words on that button, trimmed to their capitals and baseline.
 * @csspart live - The live region that says a stage was completed, rendered from the first time one is.
 * @csspart mark - The glyph inside the marker: a tick, a dot, or an empty ring.
 * @csspart marker - The shape carrying the number or the check.
 * @csspart state - The words that describe a finished stage's button. Hidden.
 *
 * @cssstate invalid - The sequence's `validate` last answered that this stage is not valid.
 */
@customElement('helix-headless-step')
export class HelixHeadlessStep extends HelixElement {
  /**
   * Whether this stage is finished.
   */
  @property({ reflect: true, type: Boolean })
  complete = false

  /**
   * The words that tell a screen reader the stage is finished. Translate it
   * with the page.
   */
  @property({ attribute: 'complete-label' })
  completeLabel = 'Complete'

  /**
   * Whether this is the current stage.
   */
  @property({ reflect: true, type: Boolean })
  current = false

  /**
   * Whether the stage is disabled, so the user cannot go to it.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * @internal Set by the sequence: whether its `validate` last answered that
   * this stage is not valid. Recorded as `:state(invalid)`.
   */
  @property({ attribute: false })
  invalid = false

  /**
   * @internal Set by a linear sequence: whether the stage is out of reach
   * until the ones before it are finished. A property, because the sequence
   * writes it after the step upgrades.
   */
  @property({ attribute: false })
  locked = false

  /**
   * Whether a reader may pass the stage without finishing it, in a sequence
   * with `linear`. Ark UI's skippable step.
   */
  @property({ reflect: true, type: Boolean })
  optional = false

  /**
   * The value the step sends in `helix-select`.
   */
  @property()
  value = ''

  /** Says a stage was finished, from the first time one is. */
  private readonly status = new StatusController(this)

  /**
   * Fires `helix-select` for the step, unless the step is `disabled` or a
   * linear sequence has it out of reach.
   */
  select(): void {
    if (this.disabled || this.locked) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  /**
   * The mark this stage's state calls for.
   *
   * `complete` first, so a stage a reader has stepped back into keeps its check
   * rather than losing it to the target: they did finish it, and the name and
   * the rule below still say which one is open.
   *
   * **Three shapes, and the reader can tell them apart with the color off.**
   * An outline circle for a stage nobody has reached, the same circle with a
   * center for the one they are standing on, a bare check for one that is done.
   * The first two are one shape filling in, which is the progression, and the
   * check is the only mark that leaves the family because finishing is the only
   * state that is not a position in the sequence. A coin around the check would
   * put two of the three inside the same container and leave hue doing the work
   * of telling them apart.
   *
   * The bare check matches `Timeline`, deliberately: the two components report
   * the same kind of thing, a sequence with marks down it, and a check on a
   * hairline in one beside a check inside a coin in the other is two answers to
   * one question.
   */
  protected renderMarker(): TemplateResult {
    const icon = this.complete ? check : this.current ? record : circle
    return html`<slot name="marker"
      ><svg part="mark" fill="currentColor" viewBox=${icon.viewBox}
        >${unsafeSVG(icon.content)}</svg
      ></slot
    >`
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* No `ariaCurrent` here: the name's button carries `aria-current="step"`,
       and the state is said once, on the control a reader is on. */
    hostAria(this.internals, { role: 'listitem' })
    this.toggleState('invalid', this.invalid)
  }

  /**
   * Says a stage that was finished while the page is open, with its name.
   *
   * Only a change after the first update, so a sequence served with its done
   * stages says nothing when it arrives.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.get('complete') === false && this.complete) {
      const name = (this.textContent ?? '').replace(/\s+/g, ' ').trim()
      this.status.say(name === '' ? this.completeLabel : `${name}, ${this.completeLabel}`)
    }
  }

  /**
   * The step's own label, which is a control because a step can be gone to, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, or leave it out, without reimplementing the whole template.
   * The tag is interpolated rather than written, so `tier` resolves it: this
   * renders the headless element, and a styled subclass that sets `tier`
   * renders the styled one from the same template.
   */
  protected renderLabel(): TemplateResult {
    return html`<${this.tag('button')}
      part="label"
      exportparts="button: label-button, live: label-live, text: label-text"
      emphasis="ghost"
      aria-current=${this.current ? 'step' : nothing}
      aria-describedby=${this.complete ? 'state' : nothing}
      ?disabled=${this.disabled || this.locked}
      @click=${this.select}
    >
      <slot></slot>
    </${this.tag('button')}><span id="state" part="state" hidden>${this.complete ? this.completeLabel : ''}</span>`
  }

  protected override render(): TemplateResult {
    /* The two half lines either side of the mark are the sheet's, on `::before`
       and `::after` of the step, which is why nothing here renders them.
       A single line drawn to the next marker has to know how far away that is,
       which is the next step's size, and a step knows only its own; drawn
       across the gap alone it is a stub. Two halves need neither: each reaches
       from the mark to its own step's edge and half the gap beyond, so it meets
       the one coming the other way in the middle of the gap and the rule reads
       as continuous however wide the steps are or how differently they are
       filled. Both are placed against this element's own box, which is the one
       box a sheet has whether or not this tier renders anything to hang them on.
       The first has nothing on its leading side and the last nothing on its
       trailing one, which `:first-child` and `:last-child` say with no index and
       no parent counting its children. */
    return html`<span part="marker" aria-hidden="true">
        ${this.renderMarker()}
      </span>
      <span part="body">
        ${this.renderLabel()}
        <span part="description"><slot name="description"></slot></span>
      </span>
      <div part="content"><slot name="content"></slot></div>${drawStatus(this.status)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-step': HelixHeadlessStep
  }
}
