import {
  customElement,
  HelixFormElement,
  KeyboardNavigationController,
  MixinControllerValue,
  MixinField,
  type NavigableItem,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A score out of a few marks, given or shown.
 *
 * @description
 * **Half marks decide the shape, so they are decided first.** Supporting them
 * means the value is not an integer and the targets are not the marks: five
 * stars at a half step is ten places to press, and a mark that is filled to the
 * middle. Everything else follows from that, which is why `step` is here rather
 * than added later, when the pointer handling would have to be rewritten around
 * it.
 *
 * **A partial mark is the whole mark, clipped.** Not a second glyph filled to
 * the middle: that needs a matching pair drawn for every mark anybody uses, and
 * the moment a consumer wants a heart or a circle they need to draw one too. The
 * fill is the same marks over the same marks, cut off partway, so any mark works
 * and any fraction does.
 *
 * **Read-only is not this control greyed out, it is a different thing.** The
 * commoner use is showing a score nobody is being asked for, a product's
 * average, and that is not a control at all: it takes no focus, answers no keys,
 * has no options to choose between, and reads as one thing rather than as five.
 * So `readonly` is `role="img"` with the score in its name, where the control is
 * a radio group. A disabled control is still a control and still says so; this
 * is not one.
 *
 * **Moving is choosing here**, which is the radio group's reading and the
 * opposite of `Menu`'s: arriving at four stars *is* rating it four, because
 * nothing else follows and there is nothing to confirm. That is what
 * `KeyboardNavigationController` takes `selects` for, and why this can use it
 * where a menu cannot.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Stars, Score, Review score
 * @documentation https://helix.fusion.dev/components/rating
 *
 * **The mark is a stylesheet's, not a slot's.** A slot projects its content
 * once, and there are two layers of marks here: slotting a star would put it in
 * the track or the fill and leave the other empty. So the mark is a shape the
 * styled tier masks with, which is also what lets a partial one be a clip of the
 * whole rather than a second drawing of it.
 *
 * @csspart marks - The row of marks.
 * @csspart track - The unfilled marks.
 * @csspart fill - The filled marks, clipped to the score.
 * @csspart mark - One mark, in either layer.
 * @csspart option - One place a reader can press, which is one step.
 * @csspart value - The score written out, under `show-value`.
 */
@customElement('helix-base-rating')
export class HelixBaseRating extends MixinControllerValue(MixinField(HelixFormElement)) {
  /*
   * Discrete, which is the default and is said here only because it was wrong.
   *
   * `Input`, `Slider`, `NumberInput`, `Textarea` and `PinInput` all announce
   * input, and every one of them is edited continuously: a value passes through
   * every keystroke or pixel on its way to the one meant. A rating does not. A
   * press picks a score, an arrow picks the next one, and the drag deliberately
   * asks for nothing until it is let go, so there is exactly one value and it
   * is the chosen one. That is `helix-change`, the same as the radio group this
   * announces itself as.
   */
  protected override readonly announcesInput = false

  /** How many marks there are. */
  @property({ type: Number })
  max = 5

  /**
   * The smallest part of a mark that can be chosen.
   *
   * `0.5` is the half star, and it is the reason the value is a number rather
   * than an index: with halves, five marks are ten answers.
   */
  @property({ type: Number })
  step = 1

  /**
   * Whether this shows a score rather than asks for one.
   *
   * A readout is not a control that has been switched off. It takes no focus,
   * answers no keys, and reads as one thing: see the note on the class.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * How the score is read out, where "3.5 out of 5" is not what it should say.
   *
   * A rating out of five is one of the few places a screen reader gets a worse
   * answer from the value than from a sentence: "3.5" alone is a number without
   * a subject. This names the readout, where a control is named by its `label`
   * and each of its options by the score that option is.
   */
  @property({ attribute: 'value-text' })
  valueText = ''

  /**
   * Whether the score is written out beside the marks.
   *
   * Marks say roughly, and a number says exactly. Four and a bit stars is not a
   * reading anyone can repeat, which is why a product's average is nearly always
   * printed next to them. `Meter` spells its reading the same way and under the
   * same attribute.
   *
   * It follows the pointer, because it labels what the marks are showing rather
   * than what the form holds: a label that disagreed with the marks under the
   * reader's own cursor would be worse than no label.
   */
  @property({ attribute: 'show-value', reflect: true, type: Boolean })
  showValue = false

  /**
   * Which mark the row is drawn with.
   *
   * `marks` is the star, and is what a rating means to most readers. `dots`
   * drops the glyph for a plain circle, which says how much rather than how
   * good: a star carries a judgement that a level of spice, a difficulty or a
   * confidence has not earned. Both are one shape repeated and clipped, so
   * halves work in either.
   *
   * **`chips` is a different thing wearing the same name.** Each position is
   * its own drawing rather than a copy of the first, which is what a face scale
   * is: the third mark is a flat mouth and the fifth is a grin, and neither is
   * a fraction of the other. There is nothing to clip, so there is no fill
   * layer and no half of anything, and `step` is one whatever it says.
   *
   * **Here rather than on the styled element**, where a presentation property
   * belongs, because `chips` changes the structure: the marks move inside the
   * targets and two layers become one. The element that draws that has to know.
   * `Megamenu` puts `appearance` in this tier for the same reason. `dots` rides
   * along because splitting one property across two tiers would be worse than
   * one property in the tier that needs it.
   */
  @property({ reflect: true })
  appearance: 'chips' | 'dots' | 'marks' = 'marks'

  /**
   * The shapes a consumer slotted, if they slotted any.
   *
   * Read rather than projected. A `<slot>` shows its content once and a rating
   * needs the shape as many times as there are marks, twice over while there
   * are two layers, so the slot here is a way of being handed the shape rather
   * than a place the shape is drawn. The element it is handed gets cloned into
   * each position.
   */
  @state()
  private markSources: Element[] = []

  /** What the pointer is over, which is shown instead of the score while it is. */
  @state()
  private previewing: number | undefined = undefined

  /* The radio group's reading, and `selects` is what makes it one: arriving at
     a mark rates it. `Menu` passes false to the same option for the opposite
     reason, which is the whole of the difference between a set of choices and a
     set of commands. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.options,
    selects: () => true,
    wrap: false,
  })

  /** The score, as a number, clamped to what the marks can show. */
  get score(): number {
    const parsed = Number.parseFloat(this.value)
    if (!Number.isFinite(parsed)) {
      return 0
    }
    return Math.min(Math.max(parsed, 0), this.max)
  }

  /** Every score a reader can choose, which is `max / step` of them. */
  private get steps(): number[] {
    /* One target per mark under `chips`, whatever `step` says. Half of a face
       is not a rating anybody has ever given. */
    const step = this.appearance === 'chips' ? 1 : this.step
    const count = Math.max(1, Math.round(this.max / step))
    return Array.from({ length: count }, (_, index) => Number(((index + 1) * step).toFixed(2)))
  }

  /**
   * The options, as the shared controller wants them.
   *
   * Adapters rather than elements, because these are buttons this element drew
   * rather than a consumer's custom elements: the interface asks for five
   * things and a `<button>` in a shadow root can answer all five without being
   * dressed up as a component to do it.
   */
  private get options(): NavigableItem[] {
    const found = [...(this.renderRoot?.querySelectorAll<HTMLElement>('[part="option"]') ?? [])]
    return found.map((element) => ({
      contains: (node: Node | null) => element.contains(node),
      disabled: this.isDisabled || this.readOnly,
      focusItem: () => element.focus(),
      select: () => {
        this.requestValue(element.dataset.score ?? '')
      },
      selected: element.getAttribute('aria-checked') === 'true',
    }))
  }

  /** The pointer drawing a score, while one is. */
  private dragging: number | undefined = undefined

  /**
   * One clone per place a mark goes, kept so a render does not remake them.
   *
   * A drag renders on every pointer move, and handing Lit a fresh node each
   * time would swap every mark in the row on every frame of a gesture whose
   * whole point is that only the fill moves.
   */
  private readonly clones = new Map<string, Node>()

  /**
   * The shape for one position, or nothing when the stylesheet is drawing it.
   *
   * **One slotted element is the shape for every mark; several are the shapes
   * in order.** Those are the two things a consumer can mean. A star is one
   * drawing repeated, and a face scale is five drawings, and the count says
   * which without an attribute to set wrong. Past the end of a short list the
   * last one repeats, so four marks and two shapes is a decision rather than a
   * crash.
   */
  private markFor(layer: string, index: number): Node | undefined {
    const sources = this.markSources
    if (sources.length === 0) {
      return undefined
    }
    const key = `${layer}:${index}`
    const held = this.clones.get(key)
    if (held) {
      return held
    }
    const source = sources.length === 1 ? sources[0] : sources[Math.min(index, sources.length - 1)]
    const clone = source?.cloneNode(true)
    if (clone) {
      this.clones.set(key, clone)
    }
    return clone
  }

  private readonly handleMarkSlot = (event: Event): void => {
    this.clones.clear()
    this.markSources = (event.target as HTMLSlotElement).assignedElements({ flatten: true })
  }

  /**
   * The step under a point on the row, or the nearest one to it.
   *
   * Asked of the boxes rather than worked out from `max` and `step`, because
   * where a step sits is the stylesheet's arithmetic and this would be a second
   * copy of it that could disagree. The browser has already laid the targets
   * out; this reads them back.
   *
   * Nearest rather than only a hit, so a drag that runs off the end of the row
   * pins to the last mark instead of stopping at whatever it last touched, and
   * a pointer in the half-gap outside the first mark still answers.
   */
  private scoreAt(clientX: number): string | undefined {
    let nearest: string | undefined
    let best = Number.POSITIVE_INFINITY
    for (const option of this.renderRoot?.querySelectorAll<HTMLElement>('[part="option"]') ?? []) {
      const box = option.getBoundingClientRect()
      if (clientX >= box.left && clientX < box.right) {
        return option.dataset.score
      }
      const away = clientX < box.left ? box.left - clientX : clientX - box.right
      if (away < best) {
        best = away
        nearest = option.dataset.score
      }
    }
    return nearest
  }

  /**
   * Dragging across the marks draws a score, and letting go chooses it.
   *
   * One press and a slide is how a rating is given on a phone, and on a desktop
   * it is how somebody who overshoots corrects without lifting. Pointer capture
   * is what makes it one gesture: without it the events go to whichever target
   * the pointer crossed into, and a drag that leaves the row stops reporting.
   *
   * Nothing is chosen until release, so a drag that ends back where it started,
   * or off the element entirely, has asked for nothing.
   */
  private readonly handleDragStart = (event: PointerEvent): void => {
    if (this.isDisabled || this.readOnly || event.button !== 0) {
      return
    }
    const score = this.scoreAt(event.clientX)
    if (score === undefined) {
      return
    }
    try {
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    } catch {
      /* A synthesised pointer has no capture to take, and the drag works
         without it right up until the pointer leaves the row. Worth having the
         gesture testable rather than making the specs drive a real device. */
    }
    this.dragging = event.pointerId
    this.previewing = Number.parseFloat(score)
  }

  private readonly handleDragMove = (event: PointerEvent): void => {
    if (this.dragging !== event.pointerId) {
      return
    }
    const score = this.scoreAt(event.clientX)
    if (score !== undefined) {
      this.previewing = Number.parseFloat(score)
    }
  }

  private readonly handleDragEnd = (event: PointerEvent): void => {
    if (this.dragging !== event.pointerId) {
      return
    }
    this.dragging = undefined
    this.previewing = undefined
    const score = this.scoreAt(event.clientX)
    if (score !== undefined) {
      this.requestValue(score)
    }
  }

  /* A cancelled pointer is the system taking the gesture away, which is not the
     reader choosing. Put the marks back to the value they already held. */
  private readonly handleDragCancel = (event: PointerEvent): void => {
    if (this.dragging !== event.pointerId) {
      return
    }
    this.dragging = undefined
    this.previewing = undefined
  }

  /** Reports the value. */
  private sync(): void {
    this.internals.setFormValue(this.value)
    this.refreshFeedback()
  }

  private readonly handleOptionClick = (event: MouseEvent): void => {
    const option = event.currentTarget as HTMLElement
    this.requestValue(option.dataset.score ?? '')
  }

  private readonly handleOptionEnter = (event: MouseEvent): void => {
    if (this.isDisabled) {
      return
    }
    const option = event.currentTarget as HTMLElement
    this.previewing = Number.parseFloat(option.dataset.score ?? '')
  }

  private readonly handleLeave = (): void => {
    this.previewing = undefined
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('pointerleave', this.handleLeave)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('pointerleave', this.handleLeave)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    if (changed.has('value')) {
      this.sync()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.sync()
  }

  protected override render(): TemplateResult {
    const showing = this.previewing ?? this.score
    const said = this.valueText || `${this.score} out of ${this.max}`
    const chips = this.appearance === 'chips'
    const count = Math.max(0, Math.round(this.max))
    const first = this.steps[0]

    const mark = (layer: string, index: number): TemplateResult =>
      html`<span part="mark">${this.markFor(layer, index)}</span>`

    /* Both layers hold every mark, because the fill is a clip of the whole row
       rather than a count of the filled ones. `chips` has neither.
     
       Written out twice rather than through one helper taking the part name:
       `check:selectors` reads the literals to know what this renders, and a
       `part=${name}` binding is invisible to it. It called the stylesheet's
       `[part="track"]` and `[part="fill"]` dead. */
    const marksIn = (layer: string): unknown =>
      Array.from({ length: count }, (_, index) => mark(layer, index))

    const option = (score: number, index: number): TemplateResult => html`<button
        part="option"
        role="radio"
        type="button"
        aria-checked=${this.score === score ? 'true' : 'false'}
        aria-label=${`${score} out of ${this.max}`}
        data-score=${String(score)}
        style=${`--_rating-step: ${index + 1}`}
        ?disabled=${this.isDisabled}
        tabindex=${this.score === score || (this.score === 0 && score === first) ? '0' : '-1'}
        @click=${this.handleOptionClick}
        @pointerenter=${this.handleOptionEnter}
        >${chips ? mark('chip', index) : nothing}</button
      >`

    /* A readout under `chips` has no targets to put the marks in, so it draws
       them itself and says which one it is. */
    const shown = (): unknown =>
      Array.from(
        { length: count },
        (_, index) => html`<span
            part="mark"
            data-chosen=${index + 1 === Math.round(this.score) ? '' : nothing}
            >${this.markFor('chip', index)}</span
          >`,
      )

    return html`<div
      part="marks"
      role=${this.readOnly ? 'img' : 'radiogroup'}
      aria-label=${this.readOnly ? said : this.label || nothing}
      data-slotted=${this.markSources.length > 0 ? '' : nothing}
      style=${`--_rating-full: ${Math.floor(showing)}; --_rating-part: ${showing - Math.floor(showing)}; --_rating-steps: ${this.steps.length}`}
      @pointercancel=${this.handleDragCancel}
      @pointerdown=${this.handleDragStart}
      @pointermove=${this.handleDragMove}
      @pointerup=${this.handleDragEnd}
    >
      <!-- Hidden because this is where the shape arrives, not where it is drawn:
           what a reader sees is the clones, one per position. -->
      <slot
        name="mark"
        hidden
        @slotchange=${this.handleMarkSlot}
      ></slot>
      ${
        chips
          ? nothing
          : html`<span
              part="track"
              aria-hidden="true"
              >${marksIn('track')}</span
            >`
      }
      ${
        chips
          ? nothing
          : html`<span
              part="fill"
              aria-hidden="true"
              >${marksIn('fill')}</span
            >`
      }
      ${this.readOnly ? (chips ? shown() : nothing) : this.steps.map(option)}
    </div>
    ${
      this.showValue
        ? html`<span
          part="value"
          aria-hidden="true"
          >${showing}</span
        >`
        : nothing
    }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-rating': HelixBaseRating
  }
}
