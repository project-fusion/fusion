import {
  commaList,
  customElement,
  DisabledCascadeController,
  HelixFormElement,
  hostAria,
  IndicatorController,
  KeyboardNavigationController,
  MixinControllerValue,
  MixinField,
  rovingStop,
  toggleValue,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessToggle } from '../root/toggle-root.js'

/**
 * @summary A row of options with the selection marked by a moving indicator.
 *
 * @description
 * The indicator is one element that moves to the selected item. A single moving
 * object is easier to follow than a fill that swaps, and it shows where the
 * selection came from.
 *
 * Its size and position are measured from the selected item and written to the
 * indicator as custom properties, because labels have different lengths.
 * Measurement happens on the client, so the server renders the indicator hidden
 * and it fades in once measured.
 *
 * `selection-mode="multiple"` makes the group a toolbar of buttons that each
 * say whether they are pressed with `aria-pressed`, as React Aria's
 * ToggleButtonGroup and Radix's ToggleGroup do. A press presses or releases
 * one item, the arrow keys move focus without pressing, and `value` is the
 * pressed values, comma separated, which `values` also gives as a list. Use
 * `values` where an item's value holds a comma. The form receives one entry
 * per pressed value, and a page the browser brings back presses the same
 * items again. The indicator stays hidden, and each pressed item is marked
 * with `:state(pressed)`. Inside a toolbar it is a named group of that
 * toolbar's controls instead, so a reader meets one toolbar.
 *
 * `orientation="vertical"` runs the items down a column, says so to the
 * accessibility tree, and the up and down arrows move between them.
 *
 * **Keyboard.** The group is one tab stop: the chosen item, or the first that
 * can be chosen, as in a radio group, and in a multiple group the item focus
 * was last on.
 *
 * | Key | What it does |
 * |---|---|
 * | Right, Down | Moves to the next item, from the last back to the first. In a single group, chooses it. |
 * | Left, Up | Moves to the item before, from the first round to the last. In a single group, chooses it. |
 * | Home, End | Moves to the first or the last item. In a single group, chooses it. |
 * | Space, Enter | Chooses the focused item, or presses or releases it in a multiple group. |
 *
 * Left and Right swap on a right-to-left page, and a disabled item is passed
 * over. A single group is a `radiogroup` of items with `role="radio"` and
 * `aria-checked`. A multiple group is a `toolbar` of buttons with
 * `aria-pressed`, or a `group` inside a toolbar. The group is named by
 * `label` and carries `aria-orientation` under `orientation`.
 *
 * @since 0.1.0
 * @status stable
 * @aliases SegmentedControl, Segmented, Navigation, Switcher
 * @documentation https://fusion.dev/helix/components/toggle
 *
 * @slot - The group's items.
 * @slot end - Content after the track, on the same line, such as a count or a reset.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 * @slot label - The label, for content richer than the `label` text.
 * @slot start - Content before the track, on the same line, such as an icon or a caption.
 *
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the choice changes. Cancelable: call `preventDefault()` to keep the current choice.
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. The item sends it, and you listen for it on the group. Cancelable: call `preventDefault()` to keep the current choice.
 * @event {Event} input - Fired after the value changes.
 *
 * @csspart feedback - The error message under the row.
 * @csspart hint - The help text under the row, shown while there is no error.
 * @csspart indicator - The moving marker behind the selected item.
 * @csspart label - The label above the row.
 * @csspart row - The line that holds the track and the content on either side of it.
 * @csspart track - The bar the items sit in. Draw the line between an inline
 * label and the items with `::part(track)::before` in your stylesheet. This tier
 * ships no CSS, so it renders no separate element for the line, which would add
 * an empty child to your layout.
 *
 * @cssstate invalid - The group has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-toggle-group')
export class HelixHeadlessToggleGroup extends MixinControllerValue(MixinField(HelixFormElement)) {
  /**
   * Takes the markup's own answer where nothing has set a value.
   *
   * **The case a server renders**, and `Tabs` records the same fault from the
   * other side. This element cannot choose on the server, having no children to
   * count, so a consumer whose first paint is right wrote `selected` on the
   * item: that serves `aria-checked="true"`, and `sync` then cleared it one
   * frame later, because `value` is `''` and nothing matches it. The shipped
   * `disabled` example is exactly that markup, and drew both of its groups with
   * nothing chosen.
   *
   * **Onto `defaultValue`, never onto `value`**, which is the same call
   * `Slider` makes about the midpoint it seeds: what the markup declared is a
   * fact about the markup, so it is where a reset returns to rather than
   * something the reader chose. It also makes the group report the answer it is
   * showing, which marking the item alone would not: a `required` group would
   * otherwise tell a reader a value is missing while they are looking at one.
   *
   * A written `value` still wins, a declared property being a seed and a
   * correction, and a group with neither still marks nothing at all.
   *
   * **The property and never `defaultSelected`, which is the attribute.** React
   * assigns a JSX prop as a property where the custom element has one, and
   * writes no attribute at all, so keying on the attribute answers for markup
   * and not for JSX. Measured by the parity check on the shipped `disabled`
   * example, whose two syntaxes are the same tree: 192 pixels apart, the HTML
   * marking `List` and the TSX marking nothing. The attribute seeds the
   * property at upgrade, so reading the property covers both.
   *
   * Read before `sync` writes to it, which is the only moment it still holds
   * what the consumer declared: after that it holds this group's answer, and
   * `value` is no longer empty, so this returns above.
   *
   * **Called from `willUpdate` and from the slot, never from `sync`**, which
   * runs in `updated`: a reactive property set there schedules a second update,
   * and Lit's development build warns about exactly that once per group. From
   * `willUpdate` the first render already carries the value, which is the pass
   * that has to be right. `children` is undefined on the server, whose element
   * shim carries attributes and no tree, and that is the same guard
   * `MixinCollection` records for the same reason.
   */
  private adopt(): void {
    if (this.value !== '' || this.children === undefined) {
      return
    }
    const declared = this.items.find((item) => item.selected)
    if (declared) {
      this.defaultValue = declared.value
    }
  }

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
    const active = this.chosenItem
    const pressed = new Set(this.values)
    const entry = this.focusable ? this.entry() : undefined
    for (const item of this.items) {
      item.selected = item === active
      item.pressed = this.multiple ? pressed.has(item.value) : undefined
      item.focusable = item === entry
    }
  }

  /**
   * The item that holds the group's tab stop: the chosen one.
   *
   * With nothing chosen there is no selection to carry the tab stop, so the
   * first item holds one until there is. Otherwise an unanswered group is a
   * control the keyboard cannot enter, which is what the fallback was quietly
   * also doing for it. A disabled answer takes no focus either, so the entry
   * goes to the first item that can be chosen, as in `Radio.Group`.
   */
  private entry(): HelixHeadlessToggle | undefined {
    const items = this.items
    /* A toolbar's stop follows focus, so Tab comes back to the button a reader
       left. Then the first pressed one, as a radio group's is its answer. */
    if (this.multiple) {
      return rovingStop(items, this.lastFocused, {
        disabled: (item) => item.disabled,
        selected: (item) => item.pressed === true,
      })
    }
    const active = this.chosenItem
    return active && !active.disabled ? active : items.find((item) => !item.disabled)
  }

  /** The item focus was last on, in a toolbar, which holds its tab stop. */
  private lastFocused: HelixHeadlessToggle | undefined = undefined

  private readonly noteFocus = (event: FocusEvent): void => {
    const item = event.target as HelixHeadlessToggle
    if (this.multiple && item !== this.lastFocused && this.items.includes(item)) {
      this.lastFocused = item
      this.sync()
    }
  }

  /**
   * The item whose value is the group's, in a single group: the exact match,
   * so nothing chosen marks nothing. A multiple group has none.
   */
  private get chosenItem(): HelixHeadlessToggle | undefined {
    return this.multiple ? undefined : this.items.find((item) => item.value === this.value)
  }

  /** Whether several items can be pressed at once. */
  private get multiple(): boolean {
    return this.selectionMode === 'multiple'
  }

  /**
   * Whether the group holds a tab stop of its own.
   *
   * A toolbar is one tab stop, so a toolbar the group sits in sets this to
   * `false` while its stop is on another control, and every item, the chosen
   * one too, is then out of the tab order. The arrow keys inside the group
   * work as before once focus is in it.
   *
   * No attribute: it is coordination between elements, and a consumer has no
   * reason to set it.
   */
  @property({ attribute: false })
  focusable = true

  /**
   * Where the group's label sits. `start` puts it on the track's line.
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
   * The direction the items run. `vertical` puts them in a column, and the up
   * and down arrows move between them.
   *
   * Optional, so the attribute is absent until a consumer writes it.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * Whether one item is chosen, as a radio group, or several can be pressed,
   * as a toolbar of buttons with `aria-pressed`.
   *
   * Optional, so the attribute is absent until a consumer writes it.
   */
  @property({ attribute: 'selection-mode', reflect: true })
  selectionMode?: 'multiple' | 'single'

  /**
   * Focus goes to the item that holds the stop, and to the item that would
   * hold it while a toolbar holds the stop instead, so a label press or a
   * refused submission still lands in the group.
   */
  protected override get focusTarget(): HTMLElement | null {
    return (
      super.focusTarget ??
      this.entry()?.shadowRoot?.querySelector<HTMLElement>('[part="item"]') ??
      null
    )
  }

  private readonly indicator = new IndicatorController(this, {
    // The same exact match `sync` makes: nothing chosen means nothing marked,
    // and the controller takes the mark away rather than parking it on item one.
    active: () => this.chosenItem,
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
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.items,
    selects: () => !this.multiple,
  })

  /* Stated once, and the group never thinks about it again. The controller is
     what stops the cascade being hand-called from whichever methods a component
     happens to have. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.items,
  })

  private get items(): HelixHeadlessToggle[] {
    // Empty on the server, which has no tree, so `focusTarget` can ask while it renders.
    return [...(this.children ?? [])].filter(
      (child): child is HelixHeadlessToggle => child instanceof HelixHeadlessToggle,
    )
  }

  /* Through the mixin, so a consumer can refuse the change with
     `helix-before-change`.

     **And only if the item's own choice stood, read a microtask later.**
     `helix-select` is cancelable and the docblock tells you to listen for it on
     the group, where this listener was added first, when the group connected:
     read inline, a consumer's refusal on the group came too late. The dispatch
     is synchronous, so a microtask is after every listener. */
  private readonly handleSelection = (event: Event): void => {
    queueMicrotask(() => {
      if (event.defaultPrevented) {
        return
      }
      const value = (event as CustomEvent<{ value: string }>).detail.value
      if (!this.multiple) {
        this.requestValue(value)
        return
      }
      const next = toggleValue(
        this.values,
        value,
        this.items.map((item) => item.value),
      )
      /* The list goes in first, so a listener reading `values` while the
         change is announced reads it whole, and comes back out if the change
         is refused. */
      const was = this.chosen
      this.chosen = next
      if (!this.requestValue(next.join(','))) {
        this.chosen = was
      }
    })
  }

  /**
   * Whether the group holds an answer the form can submit: a value an item
   * here carries. A chosen item that was removed is no longer an answer, and
   * `value` keeps the name for an item that arrives later.
   */
  private get answered(): boolean {
    if (this.value === '') {
      return false
    }
    if (this.multiple) {
      return this.children === undefined || this.values.length > 0
    }
    if (this.children === undefined) {
      return true
    }
    const items = this.items
    return items.length === 0 || items.some((item) => item.value === this.value)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection)
    this.addEventListener('focusin', this.noteFocus)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
    this.removeEventListener('focusin', this.noteFocus)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.sync()
    this.indicator.place()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // Every update, not only the ones that name `value`: see the note on
    // `MixinPickerField.updated`. The mark is not placed from here: the indicator
    // controller already places on every update of its own host.
    this.sync()
    this.validate()
    /* Every update, because the label and the message come and go with the
       properties behind them, and an element reference to a node that has been
       re-rendered is a reference to nothing. */
    this.linkHost()
  }

  /**
   * The group's role: a radio group, a toolbar of pressed buttons, or, for
   * pressed buttons inside a toolbar, a group.
   *
   * **A toolbar inside a toolbar is a reader's dead end**, so inside one the
   * pressed buttons are a named group of the outer toolbar, as React Aria's
   * ToggleButtonGroup demotes itself. Read by tag and by role, since the
   * outer toolbar is a Helix one or the page's own `role="toolbar"`.
   */
  private get groupRole(): 'group' | 'radiogroup' | 'toolbar' {
    if (!this.multiple) {
      return 'radiogroup'
    }
    return this.parentElement?.closest('[role="toolbar"], helix-toolbar, helix-headless-toolbar')
      ? 'group'
      : 'toolbar'
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Before `setFormValue` below, which reads the value this may have just
       taken: a group whose answer is on the item would otherwise report nothing
       on the render that already shows it. */
    this.adopt()
    // Through internals, so nothing lands on the host as an attribute. A nav
    // renders a real `<nav>` in the shadow root and takes its semantics from
    // that, so the host stays neutral.
    /* The label goes on as a string as well as the element reference
       `linkHost` sets, because this is the half a server can write. The
       reference wins on the client, which is what lets a consumer slot a label
       richer than a string. */
    hostAria(this.internals, { label: this.label, role: this.groupRole })
    this.internals.ariaOrientation = this.orientation ?? null
    // `null` rather than an empty string when nothing is chosen, which is the
    // difference between a control that submits nothing and one that submits a
    // blank.
    this.internals.setFormValue(this.formValue())
  }

  /**
   * What the form receives: the value, or under `selection-mode="multiple"`
   * one entry per pressed value, as a native `<select multiple>` sends.
   */
  private formValue(): FormData | string | null {
    if (!this.answered) {
      return null
    }
    if (!this.multiple || this.name === '') {
      return this.value
    }
    const data = new FormData()
    for (const value of this.values) {
      data.append(this.name, value)
    }
    return data
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
    this.reportRequired(!this.answered, 'Choose one to continue.', 'track')
  }

  /**
   * The pressed values as a list, under `selection-mode="multiple"`, in the
   * order the items are written. Written, it presses exactly those items.
   * Where one item is chosen, it is that one value, or none.
   */
  @property({ attribute: false })
  get values(): string[] {
    if (!this.multiple) {
      return this.value === '' ? [] : [this.value]
    }
    /* The list as written while `value` still says the same thing, so a value
       holding a comma comes back whole. A `value` written since is split. */
    return this.chosen && this.chosen.join(',') === this.value
      ? [...this.chosen]
      : commaList(this.value)
  }

  set values(next: string[]) {
    this.chosen = [...next]
    this.value = next.join(',')
  }

  /** The pressed values as a list last written, which `values` reads. */
  private chosen: string[] | undefined = undefined

  /**
   * Presses the items a page the browser brings back held. Under
   * `selection-mode="multiple"` the saved state is the form's entries, one per
   * pressed value, which the shared restore leaves alone.
   */
  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (!(state instanceof FormData) || !this.multiple) {
      super.formStateRestoreCallback(state)
      return
    }
    this.values = state.getAll(this.name).filter((one): one is string => typeof one === 'string')
  }

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
       says what it is for. A rule after the word is what makes that legible:
       without it the word is a first segment that cannot be pressed. The rule is
       the sheet's, drawn on the track, there being nothing about it for a box to
       carry. */
    const inside = this.labelPlacement === 'start'
    const label = this.renderGroupLabel()

    return html`${inside ? nothing : label}
      <div part="row">
        <slot name="start"></slot>
        <div part="track">
        ${inside ? label : nothing}
        <div part="indicator" aria-hidden="true"></div>
        <slot
          @slotchange=${() => {
            /* Items that arrive after the first render, which is every item on
               a page the parser is still reading. Outside an update here, so
               taking the declaration schedules one rather than warning. */
            this.adopt()
            this.sync()
            this.indicator.place()
            // And the form, which a removed answer no longer holds.
            this.requestUpdate()
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
