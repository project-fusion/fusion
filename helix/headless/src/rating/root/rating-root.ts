import {
  AriaForwardController,
  valueAsNumber as asNumber,
  customElement,
  fillTemplate,
  numberAsValue as fromNumber,
  HelixClearEvent,
  HelixFormElement,
  HelixPreviewEvent,
  KeyboardNavigationController,
  MixinControllerValue,
  MixinField,
  type NavigableItem,
  nearest,
  reportRuntime,
  SlottedGlyph,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A row of marks, such as stars, for giving or showing a score.
 *
 * @description
 * Supports half marks, so the value is not always an integer and the press
 * targets are not the marks: five stars at a half step give ten places to
 * press. The pointer handling and `step` are built around half marks.
 *
 * A partial mark is the full mark, clipped. The filled marks are drawn over the
 * empty marks and cut off partway, so any mark and any fraction work.
 *
 * A read-only rating displays a score, which is the most common use. It is
 * announced as a displayed value and does not look disabled.
 *
 * With `clearable`, pressing the chosen score again, or Backspace or Delete on
 * the marks, takes the rating back to unrated and sends `helix-clear`.
 *
 * **Keyboard.** The marks are one tab stop, on the chosen score or the first.
 *
 * | Key | What it does |
 * |---|---|
 * | Right, Down | Chooses the next score up, and stops at the highest. |
 * | Left, Up | Chooses the next score down, and stops at the lowest. |
 * | Home, End | Chooses the lowest or the highest score. |
 * | Space, Enter | Chooses the focused score, or clears it under `clearable` when it is already chosen. |
 * | Backspace, Delete | Clears the rating, under `clearable`. |
 *
 * Left and Right swap on a right-to-left page. The marks are a `radiogroup`
 * named by `label`, and each score is a `radio` named by `option-label`, such
 * as "3 out of 5". A read-only rating is one `img` named by its score.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Stars, Score, Review score
 * @documentation https://fusion.dev/helix/components/rating
 *
 * @slot empty-mark - The shape of an unfilled mark, copied into every position of the track, such as an outlined star beside a filled `mark`. Without it, the track copies `mark`.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 * @slot label - The label, for content richer than the `label` text.
 * @slot mark - The shape of a mark, copied into every position.
 *
 * @event {Event} change - The score was chosen. Sent together with `input`, because each choice commits the score.
 * @event {HelixBeforeChangeEvent} helix-before-change - The score is about to change. Cancelable: cancel it to keep the current score.
 * @event {HelixClearEvent} helix-clear - The rating went back to unrated, under `clearable`. Sent after `input` and `change`.
 * @event {HelixPreviewEvent} helix-preview - The score under the pointer, shown before it is chosen, or `''` once the marks show the score again. Sent once each time the preview changes.
 * @event {Event} input - The score changed.
 *
 * @csspart feedback - The message that says what is wrong.
 * @csspart field - The row that holds the marks and the score next to them.
 * @csspart fill - The filled marks, clipped to the score.
 * @csspart hint - Help text under the marks, shown while there is no feedback.
 * @csspart label - The label above the marks.
 * @csspart mark - One mark, in the fill or the track.
 * @csspart marks - The row of marks.
 * @csspart option - One target you can press, for one step.
 * @csspart track - The unfilled marks.
 * @csspart value - The score as a number, shown with `show-value`.
 *
 * @cssproperty --rating-full - The number of marks that are fully filled.
 * @cssproperty --rating-part - How much of the next mark is filled, from 0 to 1.
 * @cssproperty --rating-step - The target's position among all the steps in the row, counting from one. Steps below `min` still count.
 * @cssproperty --rating-steps - The number of steps in the whole row: `max` divided by `step`.
 *
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-rating')
export class HelixHeadlessRating extends MixinControllerValue(MixinField(HelixFormElement)) {
  /*
   * Discrete. `Input`, `Slider`, `NumberInput`, `Textarea` and `PinInput` all
   * announce input, and every one of them is edited continuously: a value passes
   * through every keystroke or pixel on its way to the one meant. A rating does
   * not. A press picks a score, an arrow picks the next one, and the drag
   * deliberately asks for nothing until it is let go, so there is exactly one
   * value and it is the chosen one. That is `helix-before-change`, the same as
   * the radio group this announces itself as.
   */
  protected override readonly announcesInput = false

  /**
   * Whether a reader can take the rating back to unrated: by pressing the
   * chosen score again, or with Backspace or Delete. Zag's rating group
   * clears the same way.
   */
  @property({ type: Boolean })
  clearable = false

  /**
   * How many marks there are.
   */
  @property({ type: Number })
  max = 5

  /**
   * The lowest score that can be given. A cleared rating shows this score.
   *
   * Zero rather than one, because "no rating" and "the worst rating" are
   * different answers and a control that cannot express the first has to
   * pretend the second. A survey that requires an answer says so with
   * `required`, not by making one unreachable.
   *
   * **It is the floor of the scale, and every edge follows from that.**
   *
   * *Clearing* returns the row to it. An empty rating, a value nothing can
   * parse, and a form reset with nothing declared are all the same situation,
   * and all three draw `min` filled: at the default of zero that is the empty
   * row this always drew, and at `min="2"` it is two marks, the way an empty
   * `Slider` sits at its own minimum rather than at zero. The value is still
   * `""` through all of it, so `required` still refuses it and `valueAsNumber`
   * is still `NaN`: what the row shows is the bottom of the scale, not an
   * answer somebody gave.
   *
   * *The steps* are the scores from `step` up to `max` that are not below it,
   * so `min="2"` on five marks offers 2 to 5 and leaves the first two marks
   * filled and unpressable. At zero nothing is dropped, which is why the
   * default row is unchanged.
   *
   * *The keyboard* moves through those steps and no others. `wrap` is already
   * false here, so arrowing down from the lowest one holds its ground rather
   * than reaching a score this property forbids, and the tab stop an unrated
   * rating carries sits on the lowest score offered rather than on the first
   * mark.
   *
   * *A `min` between two steps* is a floor and not a step: `min="1.5"` with
   * whole marks clamps the value at 1.5 and offers 2 upward, since 1.5 is not
   * somewhere the row can be pressed. That is a real thing to ask for and is
   * left to mean what it says.
   *
   * *A `min` outside the marks is refused rather than obeyed*, and says so
   * once on the console. Below zero and anything that is not a number are read
   * as zero, there being no mark to draw for a negative score; above `max` is
   * read as `max`, which collapses the scale to its top score rather than
   * leaving a rating with nothing to press. A property that silently accepts
   * nonsense is the fault this pays off, so neither case is quietly ignored.
   */
  @property({ type: Number })
  min = 0

  /**
   * The name of each mark a reader can choose, with `{score}` and `{max}`
   * filled in. Set it to translate "3 out of 5".
   *
   * Also what a read-only rating says for its score where `value-text` is
   * empty.
   */
  @property({ attribute: 'option-label' })
  optionLabel = '{score} out of {max}'

  /**
   * Shows the score without letting users change it.
   *
   * A readout is not a control that has been switched off. It takes no focus,
   * answers no keys, and reads as one thing: see the note on the class.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * Shows the score as a number next to the marks.
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
   * The smallest part of a mark that can be chosen.
   *
   * `0.5` is the half star, and it is the reason the value is a number rather
   * than an index: with halves, five marks are ten answers.
   */
  @property({ type: Number })
  step = 1

  /**
   * The text screen readers read for the score, in place of "3.5 out of 5".
   *
   * A rating out of five is one of the few places a screen reader gets a worse
   * answer from the value than from a sentence: "3.5" alone is a number without
   * a subject. This names the readout, where a control is named by its `label`
   * and each of its options by the score that option is.
   */
  @property({ attribute: 'value-text' })
  valueText = ''

  /* The row of marks is what a reader is on, a radiogroup, and the host is a
     generic beside it: a host `aria-labelledby` and a page's `<label>` named
     the host and left the radiogroup unnamed. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('marks'),
  })

  /** @internal The element a missing name is checked on: the set of stars, so the name of one star does not count as the name of the rating. */
  protected override get namedControl(): HTMLElement | null {
    return this.partNamed('marks')
  }

  /**
   * The shape a consumer slotted, if they slotted one.
   *
   * Read rather than projected. A `<slot>` shows its content once and a rating
   * needs the shape as many times as there are marks, twice over because there
   * are two layers, so the slot here is a way of being handed the shape rather
   * than a place the shape is drawn. What is handed over gets cloned into every
   * position.
   *
   * **One shape, not one per position.** A rating is a quantity of identical
   * marks and the fill is a clip across all of them, so a row whose third mark
   * is a different drawing from its first is not a rating: it is a set of
   * choices, which is `Radio.Group` and already carries a value and a name on
   * each of its own options. Anything past the first slotted element is
   * ignored.
   */
  private readonly mark = new SlottedGlyph()

  /** Whether `mark` has had its first answer from the children. */
  private markRead = false

  /**
   * What the pointer is over, which is shown instead of the score while it is.
   */
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

  /**
   * The floor the row actually uses, which is `min` where `min` is one.
   *
   * Between zero and `max`, and zero for anything that is not a number, per
   * the note on `min`. Derived on read rather than corrected into the property,
   * so `rating.min` still reports what the consumer set and the warning below
   * can tell the two apart.
   */
  private get floor(): number {
    if (!Number.isFinite(this.min)) {
      return 0
    }
    return Math.min(Math.max(this.min, 0), Math.max(this.max, 0))
  }

  /** The score, as a number, clamped to what the marks can show. */
  get score(): number {
    const parsed = Number.parseFloat(this.value)
    if (!Number.isFinite(parsed)) {
      return this.floor
    }
    return Math.min(Math.max(parsed, this.floor), this.max)
  }

  /**
   * Every score the marks can show, which is `max / step` of them.
   *
   * The whole row rather than the part `min` leaves open, because this is what
   * the stylesheet lays the targets out against: `--rating-steps` is the pitch
   * and a step's own place in this list is where it sits along the row. Counted
   * from the part a reader can press instead, a floor above zero would widen
   * every target and slide the row left.
   */
  private get positions(): number[] {
    const count = Math.max(1, Math.round(this.max / this.step))
    return Array.from({ length: count }, (_, index) => Number(((index + 1) * this.step).toFixed(2)))
  }

  /** Every score a reader can choose, which is the positions `min` leaves open. */
  private get steps(): number[] {
    return this.positions.filter((score) => score >= this.floor)
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
   * The shape for one place, or nothing when the stylesheet is drawing it.
   *
   * One copy per place, kept so a render does not remake them: a drag renders
   * on every pointer move, and handing Lit a fresh node each time would swap
   * every mark in the row on every frame of a gesture whose whole point is
   * that only the fill moves.
   */
  private markFor(layer: string, index: number): Node | undefined {
    const glyph = layer === 'track' && this.empty.slotted ? this.empty : this.mark
    return glyph.copyFor(`${layer}:${index}`)
  }

  private readonly handleMarkSlot = (event: Event): void => {
    const slot = event.target as HTMLSlotElement
    ;(slot.name === 'empty-mark' ? this.empty : this.mark).read(slot)
    this.requestUpdate()
  }

  /** The element slotted into `empty-mark`, which the track copies. */
  private readonly empty = new SlottedGlyph()

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
    let closest: string | undefined
    let best = Number.POSITIVE_INFINITY
    for (const option of this.renderRoot?.querySelectorAll<HTMLElement>('[part="option"]') ?? []) {
      const box = option.getBoundingClientRect()
      if (clientX >= box.left && clientX < box.right) {
        return option.dataset.score
      }
      const away = clientX < box.left ? box.left - clientX : clientX - box.right
      if (away < best) {
        best = away
        closest = option.dataset.score
      }
    }
    return closest
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
      /* A synthesized pointer has no capture to take, and the drag works
         without it right up until the pointer leaves the row. Worth having the
         gesture testable rather than making the specs drive a real device. */
    }
    this.dragging = event.pointerId
    this.pressedOn = score
    this.previewing = Number.parseFloat(score)
  }

  /** The score a press began on, so releasing on the chosen one can clear it. */
  private pressedOn: string | undefined = undefined

  /**
   * Whether a drag has just chosen, so the click a browser may send after it
   * does not choose again. Cleared a task later, since the click may not come.
   */
  private dragChose = false

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
    if (score === undefined) {
      return
    }
    this.dragChose = true
    setTimeout(() => {
      this.dragChose = false
    }, 0)
    if (this.clearsAt(score) && score === this.pressedOn) {
      this.clear()
      return
    }
    this.requestValue(score)
  }

  /** Whether a press on `score` takes a clearable rating back to unrated. */
  private clearsAt(score: string): boolean {
    return this.clearable && this.value !== '' && Number(score) === Number(this.value)
  }

  /* A canceled pointer is the system taking the gesture away, which is not the
     reader choosing. Put the marks back to the value they already held. */
  private readonly handleDragCancel = (event: PointerEvent): void => {
    if (this.dragging !== event.pointerId) {
      return
    }
    this.dragging = undefined
    this.previewing = undefined
  }

  /**
   * Reports the value, and whether the form may go without one.
   *
   * **`required` arrives from the mixin, so it prints on the reference page
   * whether or not anything here enforces it.** Without a `setValidity` call a
   * form holding an unrated required rating submits, `:valid` true and the
   * entry present but empty. `reportRequired` is what makes the property real.
   *
   * **Empty is `value === ''` rather than a score at the floor**, and the two
   * are not the same thing: an unanswered row draws `min`, per the note on that
   * property, so a control that read its own picture would call every rating
   * with `min="2"` answered the moment it rendered. What `required` asks is
   * whether the reader answered at all, which only the value knows. A consumer
   * who writes `value="0"` has answered, and is not refused.
   *
   * `Slider` is deliberately not given the same treatment: a native
   * `<input type="range" required>` is always valid, because a range always
   * holds a number, and matching the platform there is the point.
   */
  private sync(): void {
    /* Nothing where nothing is chosen, which is what a radio group submits:
       an empty entry reads on the server as a rating somebody gave. */
    this.internals.setFormValue(this.value === '' ? null : this.value)
    this.reportRequired(this.value === '', 'Choose a rating to continue.', 'marks')
  }

  private readonly handleOptionClick = (event: MouseEvent): void => {
    if (this.dragChose) {
      return
    }
    const option = event.currentTarget as HTMLElement
    const score = option.dataset.score ?? ''
    if (this.clearsAt(score)) {
      this.clear()
      return
    }
    this.requestValue(score)
  }

  /** Backspace and Delete take a clearable rating back to unrated. */
  private readonly handleClearKey = (event: KeyboardEvent): void => {
    if (this.clearable && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault()
      this.clear()
    }
  }

  /** Back to unrated, through the same cancelable request as a score, and said. */
  private clear(): void {
    if (this.value !== '' && !this.readOnly && !this.isDisabled && this.requestValue('')) {
      this.dispatchEvent(new HelixClearEvent())
    }
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

  /** Whether the console has already been told about a `min` off the scale. */
  private warned = false

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    /* Once per change of what is previewed, not per pointer move: Lit records
       `previewing` only when it differs. */
    if (changed.has('previewing')) {
      this.dispatchEvent(
        new HelixPreviewEvent({
          value: this.previewing === undefined ? '' : String(this.previewing),
        }),
      )
    }
    // Every update, not only the ones that name `value`: see the note on
    // `MixinPickerField.updated`.
    this.sync()
    /* Said once, and said because the alternative is a property that quietly
       does something other than what it says. Both refusals are recoverable and
       neither is guessable from the row: a floor above `max` leaves one score
       to press and a negative one draws exactly like zero, so nothing on screen
       tells the consumer their number was not taken. */
    if (this.floor !== this.min && !this.warned) {
      this.warned = true
      reportRuntime({
        kind: 'min-out-of-range',
        message:
          `<${this.localName}> has min="${this.min}", which is not a score between 0 and its max of ` +
          `${this.max}, so the lowest score it offers is ${this.floor}. Put min inside the marks, ` +
          'or move max.',
        tag: this.localName,
      })
    }
  }

  /* The first shape from the children, before the render that clones it. The
     slot alone left the first render with the stock mark and a second to
     follow, and a hydrated row with it for good: a declarative shadow root
     reports its slots before anything listens. `slotchange` answers after. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (!this.markRead && this.childrenKnown) {
      this.markRead = true
      this.mark.take(this.knownChildren.find((child) => child.slot === 'mark'))
      this.empty.take(this.knownChildren.find((child) => child.slot === 'empty-mark'))
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.finishHydration()
    this.sync()
  }

  /** The name of one score, as `optionLabel` writes it. */
  private nameFor(score: number): string {
    return fillTemplate(this.optionLabel, { max: this.max, score })
  }

  /**
   * The option that is checked and holds the tab stop: the chosen one, or for
   * a score between steps, such as an average of 3.4 on whole marks, the
   * nearest step, and the first while nothing is chosen. Between steps no
   * option matched, so no option was checked and the rating left the tab
   * order.
   */
  private stopAt(answered: boolean, first: number | undefined): number | undefined {
    if (!answered) {
      return first
    }
    return nearest(this.steps, this.score) ?? first
  }

  protected override render(): TemplateResult {
    const showing = this.previewing ?? this.score
    const said = this.valueText || this.nameFor(this.score)
    const count = Math.max(0, Math.round(this.max))
    const first = this.steps[0]
    /* The floor is drawn while nothing is chosen and is not an answer, so no
       option claims to be checked until one is. */
    const answered = this.value !== '' && Number.isFinite(Number.parseFloat(this.value))
    const stop = this.stopAt(answered, first)

    const mark = (layer: string, index: number): TemplateResult =>
      html`<span part="mark">${this.markFor(layer, index)}</span>`

    /* Both layers hold every mark, because the fill is a clip of the whole row
       rather than a count of the filled ones.
     
       Written out twice rather than through one helper taking the part name:
       a part is read from the source as a literal, and a `part=${name}`
       binding is invisible. The stylesheet's `[part="track"]` and
       `[part="fill"]` read as dead. */
    const marksIn = (layer: string): unknown =>
      Array.from({ length: count }, (_, index) => mark(layer, index))

    /* A group label and not `renderLabel`, which writes `<label for="control">`
       and would name an id nothing here renders: the control is a row of
       buttons rather than one field. `Radio.Group` is the same shape and takes
       the same seam.

       **The row is wrapped, and the host is the stack.** This is the one field
       in the library whose control is genuinely inline, so the layout question
       is where the question and the message go: beside the marks would put a
       hint in the middle of a line of stars, and a row that stretched to hold
       one would stop a rating sitting in a sentence. So the marks and the
       readout keep their row, in `field`, and the host becomes the column every
       other field already is, so a sheet dresses it the way it dresses
       them. `inline-flex` on that column, not `flex`: a rating goes in
       a product card and a table cell, and a block one would take the width of
       whatever holds it. */
    return html`${this.renderGroupLabel()}
    <div part="field">
    <div
      part="marks"
      role=${this.readOnly ? 'img' : 'radiogroup'}
      aria-label=${this.readOnly ? said : nothing}
      aria-labelledby=${!this.readOnly && this.labeled ? this.labelId : nothing}
      aria-describedby=${this.describedBy ?? nothing}
      aria-invalid=${this.invalidity ?? nothing}
      aria-required=${this.required && !this.readOnly ? 'true' : nothing}
      data-slotted=${this.mark.slotted ? '' : nothing}
      style=${`--rating-full: ${Math.floor(showing)}; --rating-part: ${showing - Math.floor(showing)}; --rating-steps: ${this.positions.length}`}
      @pointercancel=${this.handleDragCancel}
      @keydown=${this.handleClearKey}
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
      <slot
        name="empty-mark"
        hidden
        @slotchange=${this.handleMarkSlot}
      ></slot>
      <span
        part="track"
        aria-hidden="true"
        data-slotted=${this.empty.slotted ? '' : nothing}
        >${marksIn('track')}</span
      >
      <span
        part="fill"
        aria-hidden="true"
        >${marksIn('fill')}</span
      >
      ${
        this.readOnly
          ? nothing
          : /* Walked over every position and skipped below the floor, rather
               than mapped over the open ones: the index is the step's place
               along the whole row, and `min` must drop a target without moving
               the ones left. See `positions`. */
            this.positions.map((score, index) =>
              score < this.floor
                ? nothing
                : html`<button
                part="option"
                role="radio"
                type="button"
                aria-checked=${answered && score === stop ? 'true' : 'false'}
                aria-label=${this.nameFor(score)}
                data-score=${String(score)}
                style=${`--rating-step: ${index + 1}`}
                ?disabled=${this.isDisabled}
                tabindex=${score === stop ? '0' : '-1'}
                @click=${this.handleOptionClick}
                @pointerenter=${this.handleOptionEnter}
              ></button>`,
            )
      }
    </div>
    ${
      this.showValue
        ? html`<span
          part="value"
          aria-hidden="true"
          >${showing}</span
        >`
        : nothing
    }
    </div>
    ${this.renderHint()}${this.renderFeedback()}`
  }

  /**
   * The value as a number, or `NaN` while the control is empty.
   *
   * `NaN` and not zero, which is the trap the platform already avoids: `Number('')`
   * is zero, so an empty control would report a number it does not hold and a
   * form would submit it.
   */
  get valueAsNumber(): number {
    return asNumber(this.value)
  }

  set valueAsNumber(count: number) {
    this.value = fromNumber(count)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-rating': HelixHeadlessRating
  }
}
