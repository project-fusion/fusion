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
 */
@customElement('helix-base-rating')
export class HelixBaseRating extends MixinControllerValue(MixinField(HelixFormElement)) {
  /** Pressed or arrowed, so every change is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

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
    const count = Math.max(1, Math.round(this.max / this.step))
    return Array.from({ length: count }, (_, index) => Number(((index + 1) * this.step).toFixed(2)))
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
    const marks = Array.from({ length: Math.max(0, Math.round(this.max)) })
    const said = this.valueText || `${this.score} out of ${this.max}`
    const mark = html`<span part="mark"></span>`

    return html`<div
      part="marks"
      role=${this.readOnly ? 'img' : 'radiogroup'}
      aria-label=${this.readOnly ? said : this.label || nothing}
      style=${`--_rating-full: ${Math.floor(showing)}; --_rating-part: ${showing - Math.floor(showing)}; --_rating-steps: ${this.steps.length}`}
    >
      <span
        part="track"
        aria-hidden="true"
        >${marks.map(() => mark)}</span
      >
      <span
        part="fill"
        aria-hidden="true"
        >${marks.map(() => mark)}</span
      >
      ${
        this.readOnly
          ? nothing
          : this.steps.map(
              (score, index) => html`<button
                part="option"
                role="radio"
                type="button"
                aria-checked=${this.score === score ? 'true' : 'false'}
                aria-label=${`${score} out of ${this.max}`}
                data-score=${String(score)}
                style=${`--_rating-step: ${index + 1}`}
                ?disabled=${this.isDisabled}
                tabindex=${
                  this.score === score || (this.score === 0 && score === this.step) ? '0' : '-1'
                }
                @click=${this.handleOptionClick}
                @pointerenter=${this.handleOptionEnter}
              ></button>`,
            )
      }
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-rating': HelixBaseRating
  }
}
