import {
  customElement,
  DisabledCascadeController,
  HelixFormElement,
  hostAria,
  IndicatorController,
  KeyboardNavigationController,
  MixinControllerValue,
  MixinField,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { HelixBaseToggle } from '../root/toggle-root.js'

/**
 * @summary A row of options with the selection marked by a moving indicator.
 *
 * @description
 * The indicator is one element that travels, not a background that appears on
 * whichever item is current. That difference is the whole point: a fill that
 * swaps is two things changing at once and reads as a flicker, while one that
 * moves is a single object the eye follows, and it says where the selection
 * came from as well as where it went.
 *
 * Its whole box is measured from the selected item and written onto
 * the indicator as custom properties, because labels are different lengths and
 * no proportion of the group is the right answer. Measurement is client-side by
 * necessity, so the server renders the indicator hidden and it fades in once it
 * has somewhere to be, which is the harmless direction: it appears rather than
 * jumping from a wrong place.
 *
 * A radio group, and only that. Navigation is links marked with `aria-current`
 * and styled by the `data-navigation-item` recipe: radio semantics would announce a
 * set of destinations as a set of choices. A tab controls a panel.
 *
 * Being a radio group, it is a form control, and it says so through
 * `HelixFormElement`: it reports its value under a `name`, comes back to the
 * markup's choice on reset, and restores the one a reader made when the browser
 * brings a form back.
 *
 * The semantics were already right: the host has carried `role="radiogroup"`
 * and the items `role="radio"` from the start. What none of it did was reach a
 * form. A button in a shadow root submits nothing whatever its role, so the
 * value has to be reported by the host, which is the only thing a form can
 * see.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases SegmentedControl, Segmented, Navigation, Switcher
 * @documentation https://helix.fusion.dev/components/toggle-group
 *
 * @slot - The group's items.
 *
 * @csspart track - The bar the items sit in.
 * @csspart indicator - The moving marker behind the selected item.
 *
 * @event {HelixChangeEvent} helix-change - Fired before the answer moves, and cancelable. The only way to refuse one.
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. Dispatched by the item and listened for here.
 */
@customElement('helix-base-toggle-group')
export class HelixBaseToggleGroup extends MixinControllerValue(MixinField(HelixFormElement)) {
  /**
   * Marks the chosen item, which used to happen inside the placing method.
   *
   * They were one method because the geometry needed the active item anyway,
   * and that made a selection change look like a layout concern. `resolveActiveItem`
   * rather than the first item, because a group opening on a disabled segment
   * marked it as chosen.
   */
  private sync(): void {
    /* An exact match and nothing else.
     *
     * This went through `resolveActiveItem`, which falls back to the first
     * enabled item, so a group with no value marked one anyway:
     * `aria-checked="true"`, the thumb placed under it, full selected styling,
     * while the group reported nothing. A `required` group showed an answer it
     * did not have, and a reader who submitted without touching it was told a
     * value was missing while looking at one.
     *
     * The fallback is right where it came from. A tab set always shows a panel,
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

  /* The mark. The selection sync it used to share a method with is `sync()`. */
  private readonly indicator = new IndicatorController(this, {
    // The same exact match `sync` makes: nothing chosen means nothing marked,
    // and the controller takes the mark away rather than parking it on item one.
    active: () => this.items.find((item) => item.value === this.value),
    indicator: () => this.renderRoot?.querySelector<HTMLElement>('[part="indicator"]'),
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="track"]'),
  })

  private observer: ResizeObserver | undefined

  /* Moving and choosing are one act, which is the radio group pattern this
     control also follows, and is what the controller exists to stop being
     written per component. */
  /* Registered rather than held. A controller adds itself to the host, so there
     is no reference to keep: nothing here talks to it after construction, which
     is why it is `protected` and not `private`. A private field nothing reads
     is an unused one, and the honest reading is that the subclass tier is where
     a consumer would reach for it. */
  protected readonly keys = new KeyboardNavigationController(this, { items: () => this.items })

  /* Stated once, and the group never thinks about it again. See the
     controller: the cascade was four hand calls from four different
     methods, so which paths reached it differed by component and a fifth
     group would have got none at all. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.items,
  })

  private get items(): HelixBaseToggle[] {
    return [...this.children].filter(
      (child): child is HelixBaseToggle => child instanceof HelixBaseToggle,
    )
  }

  /**
   * Watches the group and every item it currently holds.
   *
   * Called again on `slotchange`, because the set was read once at first paint:
   * an item added later was measured by nothing, so a group whose options
   * arrive with the data had a thumb that stopped following the moment one of
   * them changed width. Observing the same element twice is a no-op, so there
   * is nothing to unwind first.
   */
  private watch(): void {
    this.observer?.observe(this)
    for (const item of this.items) {
      this.observer?.observe(item)
    }
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
    this.observer?.disconnect()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.sync()
    this.indicator.place()
    /* Per item, not only the host, which is what the controller's own observer
       covers. An item can change width inside a track that keeps its size, and
       the host never fires for that. */
    this.observer = new ResizeObserver(() => this.indicator.place())
    this.watch()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value')) {
      this.sync()
      this.indicator.place()
    }
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
   * The verdict on the answer, which `required` had been asking for and not
   * getting.
   *
   * `required` arrived with `MixinField` and nothing enforced it: the attribute
   * reflected, the marker rendered beside the label, and a form with an
   * unanswered group submitted anyway. An API that exists and does nothing is
   * worse than one that is missing, because the marker is a promise to the
   * reader that something will stop them.
   *
   * The anchor is the track rather than the host, so the browser's own bubble
   * points at the control rather than at a box with nothing in it.
   */
  private validate(): void {
    this.reportRequired(this.value === '', 'Choose one to continue.', 'track')
  }

  protected override render(): TemplateResult {
    /* The track is an element now, where it used to be the host itself.
       It has to be: the label, the hint and the message are the host's children
       too, and with the track on the host they were flex items in the same row
       as the segments. The track also owns the box the indicator is measured
       against, which is why `place` reads it rather than `this`. */
    return html`${this.renderGroupLabel()}
      <div part="track">
        <div part="indicator" aria-hidden="true"></div>
        <slot
          @slotchange=${() => {
            this.watch()
            this.sync()
            this.indicator.place()
          }}
        ></slot>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-toggle-group': HelixBaseToggleGroup
  }
}
