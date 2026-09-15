import {
  customElement,
  DisabledCascadeController,
  HelixFormElement,
  hostAria,
  IndicatorController,
  KeyboardNavigationController,
  MixinControllerValue,
  MixinField,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessToggle } from '../root/toggle-root.js'

/**
 * @summary A row of options with the selection marked by a moving indicator.
 *
 * @description
 * The indicator is one element that travels, not a background that appears on
 * whichever item is current. A fill that swaps is two things changing at once
 * and reads as a flicker; one that moves is a single object the eye follows,
 * and it says where the selection came from as well as where it went.
 *
 * Its box is measured from the selected item and written onto the indicator as
 * custom properties, labels being different lengths. Measurement is client-side
 * by necessity, so the server renders the indicator hidden and it fades in once
 * it has somewhere to be, which is the harmless direction.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases SegmentedControl, Segmented, Navigation, Switcher
 * @documentation https://helix.fusion.dev/components/toggle-group
 *
 * @slot - The group's items.
 *
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the answer moves, and cancelable. The only way to refuse one.
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. Dispatched by the item and listened for here. Cancelable: refusing it takes the decision and nothing moves.
 * @event {Event} input - Announced once the value has moved.
 *
 * @csspart divider - The rule after an inline label, separating it from the items.
 * @csspart feedback - What is wrong with it.
 * @csspart hint - Help under the row, while nothing is wrong.
 * @csspart indicator - The moving marker behind the selected item.
 * @csspart label - The question, over the row.
 * @csspart row - The line the track sits on, with whatever flanks it.
 * @csspart track - The bar the items sit in.
 *
 * @cssstate invalid - While there is feedback to show: the platform's verdict, or the consumer's `feedback`.
 */
@customElement('helix-headless-toggle-group')
export class HelixHeadlessToggleGroup extends MixinControllerValue(MixinField(HelixFormElement)) {
  /** Marks the chosen item, separately from placing the indicator. */
  private sync(): void {
    /* An exact match and nothing else, never `resolveActiveItem`, which falls
     * back to the first enabled item: a group with no value would mark one
     * anyway, `aria-checked="true"` and the thumb under it and full selected
     * styling, while the group reported nothing. A `required` group would then
     * tell a reader a value is missing while they are looking at one.
     *
     * That fallback is right where it came from. A tab set always shows a panel,
     * so something has to be current; a group that reports a form value has the
     * honest option of reporting none. */
    const active = this.items.find((item) => item.value === this.value)
    /* With nothing chosen there is no selection to carry the tab stop, so the
       first item holds one until there is. Otherwise an unanswered group is a
       control the keyboard cannot enter, which is what the fallback was quietly
       also doing for it. */
    const entry = active ? undefined : this.items.find((item) => !item.disabled)
    for (const item of this.items) {
      item.selected = item === active
      item.focusable = item === entry
    }
  }

  private readonly indicator = new IndicatorController(this, {
    // The same exact match `sync` makes: nothing chosen means nothing marked,
    // and the controller takes the mark away rather than parking it on item one.
    active: () => this.items.find((item) => item.value === this.value),
    indicator: () => this.partNamed('indicator'),
    /* Per item, not only the host, which the controller watches on its own. An
       item can change width inside a track that keeps its size, and the host
       never fires for that. Read again on every placement, so a group whose
       options arrive with the data has each one watched from the placement
       after it lands. */
    observe: () => this.items,
    surface: () => this.partNamed('track'),
  })

  /* Moving and choosing are one act, which is the radio group pattern this
     control also follows, and is what the controller exists to stop being
     written per component. */
  /* Registered rather than held. A controller adds itself to the host, so there
     is no reference to keep: nothing here talks to it after construction, which
     is why it is `protected` and not `private`. A private field nothing reads
     is an unused one, and the honest reading is that the subclass tier is where
     a consumer would reach for it. */
  protected readonly keys = new KeyboardNavigationController(this, { items: () => this.items })

  /* Stated once, and the group never thinks about it again. The controller is
     what stops the cascade being hand-called from whichever methods a component
     happens to have. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.items,
  })

  private get items(): HelixHeadlessToggle[] {
    return [...this.children].filter(
      (child): child is HelixHeadlessToggle => child instanceof HelixHeadlessToggle,
    )
  }

  private readonly handleSelection = (event: Event): void => {
    this.requestValue((event as CustomEvent<{ value: string }>).detail.value)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.sync()
    this.indicator.place()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // Every update, not only the ones that name `value`: see the note on
    // `ColorInput.updated`. The mark is not placed from here: the indicator
    // controller already places on every update of its own host.
    this.sync()
    this.validate()
    /* Every update, because the label and the message come and go with the
       properties behind them, and an element reference to a node that has been
       re-rendered is a reference to nothing. */
    this.linkHost()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Through internals, so nothing lands on the host as an attribute. A nav
    // renders a real `<nav>` in the shadow root and takes its semantics from
    // that, so the host stays neutral.
    /* The label goes on as a string as well as the element reference
       `linkHost` sets, because this is the half a server can write. The
       reference wins on the client, which is what lets a consumer slot a label
       richer than a string. */
    hostAria(this.internals, { label: this.label, role: 'radiogroup' })
    // `null` rather than an empty string when nothing is chosen, which is the
    // difference between a control that submits nothing and one that submits a
    // blank.
    this.internals.setFormValue(this.value === '' ? null : this.value)
  }

  /**
   * The verdict on the answer `required` asks for.
   *
   * `required` arrives with `MixinField` and enforces nothing on its own: the
   * attribute reflects and the marker renders beside the label, and without this
   * a form with an unanswered group submits anyway. The marker is a promise to
   * the reader that something will stop them.
   *
   * The anchor is the track rather than the host, so the browser's own bubble
   * points at the control rather than at a box with nothing in it.
   */
  private validate(): void {
    this.reportRequired(this.value === '', 'Choose one to continue.', 'track')
  }

  /**
   * Where the group's label sits, `start` putting it on the track's line.
   *
   * Absent is above, which is what a field looks like and what almost every
   * group wants. `start` is for a row of controls that are labeled rather than
   * a form of fields: a toolbar reads as one line, and a label stacked over
   * every group in it turns one row into two.
   *
   * **A placement rather than a slot, and that is the whole point of it.** A
   * `start` slot would let a consumer put the word there, and would also let
   * them put it there *instead of* setting `label`, which is the group's
   * accessible name: the set would then be named for nobody using a screen
   * reader while looking correct to everybody else. Worse, setting both draws
   * it twice. One property moves the label the consumer already has to give,
   * and cannot be used to remove it.
   */
  @property({ attribute: 'label-placement', reflect: true })
  labelPlacement?: 'start'

  /**
   * The row the track sits in, so something can sit beside it.
   *
   * **Bare slots, and a wrapper only around the row itself.** An unassigned
   * slot is `display: contents` in the UA stylesheet and generates no box at
   * all, so a group with nothing slotted lays out exactly as it did before this
   * existed: no grid track, no flex item, no gap. Wrapping each side in a div
   * instead would paint an empty inset band on every group in the library that
   * never asked for one, which is the measurement Card already paid for.
   *
   * The row does always generate a box, and is entitled to: the track is always
   * in it.
   */
  protected override render(): TemplateResult {
    /* The track is an element rather than the host, and has to be: the label,
       the hint and the message are the host's children too, so a track on the
       host makes them flex items in the same row as the segments. The track also
       owns the box the indicator is measured against, which is why `place` reads
       it rather than `this`. */
    /* **Inside the track when it is placed at the start, not beside it.** A
       label sitting outside reads as a field's label that happens to be on one
       line; inside, with a rule after it, the group reads as one control that
       says what it is for. The divider is what makes that legible: without it
       the word is a first segment that cannot be pressed. */
    const inside = this.labelPlacement === 'start'
    const label = this.renderGroupLabel()

    return html`${inside ? nothing : label}
      <div part="row">
        <slot name="start"></slot>
        <div part="track">
        ${inside ? html`${label}<div part="divider" aria-hidden="true"></div>` : nothing}
        <div part="indicator" aria-hidden="true"></div>
        <slot
          @slotchange=${() => {
            this.sync()
            this.indicator.place()
          }}
          ></slot>
        </div>
        <slot name="end"></slot>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-toggle-group': HelixHeadlessToggleGroup
  }
}
