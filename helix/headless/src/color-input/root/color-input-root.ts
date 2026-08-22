import {
  customElement,
  type HelixChangeEvent,
  HelixFormElement,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  PopoverController,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
/* Side-effect import, because this renders `<helix-color-picker>` in its own shadow
   root and a custom element registers on import. The public tag rather than the
   base one: a consumer on the styled tier gets the styled picker, and one on the
   headless tier brings a picker of their own under that name. */
import '../../color-picker/index.js'
import { type ColorFormat, parseColor, toCss } from '../../color-picker/color.js'

/**
 * @summary A color, typed in any syntax or picked from a panel.
 *
 * @description
 * **The picker is `helix-color-picker`, not a second one written here.** It owns the
 * square, the ramps, the eyedropper and the syntax toggle, and it is worth
 * having on its own: a settings pane wants a picker flat on the page with
 * nothing to open. This element is the field, the overlay, and the form.
 * Exactly the arrangement Date Input has with `helix-date-picker`.
 *
 * **Typed as well as picked, and the typing is the reason this is not
 * `<input type="color">`.** The native control gives a free picker and takes
 * nearly all styling with it, which is a fair trade until a product needs the
 * panel to match everything around it. What is kept from the native one is the
 * part worth keeping: a real text field, so a reader who has the hex pastes it
 * and never opens anything.
 *
 * **Every syntax is read; the one `format` names is written.** `#f00`,
 * `#ff0000`, `rgb(255 0 0)`, `rgba(255,0,0,.5)`, `rgb(255 0 0 / 50%)` and
 * `hsl(0 100% 50%)` are all colors, and a field that refuses one because it
 * prefers another is arguing with the person using it. What the field *shows* is
 * the value itself, for the reason Date Input gives about its dates: half-typed
 * input does not survive a round trip through a formatter.
 *
 * The properties below are written by this component and read by whoever draws
 * it. A consumer sets none of them: they carry a number this element computed
 * and CSS cannot, which is what lets a stylesheet on this tier draw the thing
 * without measuring anything itself.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases ColorField, ColourInput, InputColor
 * @documentation https://helix.fusion.dev/components/color-input
 *
 * @slot start - Content at the leading end of the field, inside its border.
 * @slot end - Content at the trailing end, before the trigger.
 * @slot trigger - The mark on the field saying a panel opens.
 * @slot hint - Help under the field.
 * @slot feedback - What is wrong with it.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the color changes.
 * @event {HelixOpenEvent} helix-open - Fired when the panel opens.
 * @event {HelixCloseEvent} helix-close - Fired when it closes.
 *
 * @csspart field - The box holding the text and the trigger.
 * @csspart control - The text input carrying the value. Absent in `swatch`.
 * @csspart trigger - The control that opens the panel.
 * @csspart preview - The chip showing the color, inside the trigger.
 * @csspart surface - The floating panel.
 * @csspart picker - The color picker inside it.
 *
 * @cssproperty --color-input-swatch - The chosen colour, to paint over the transparency check.
 */
@customElement('helix-base-color-input')
export class HelixBaseColorInput extends MixinControllerOpen(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /**
   * Whether the field is a text box with a swatch on it, or only the swatch.
   *
   * `swatch` is the native control's shape: a block of color that opens a
   * picker, with no text beside it. It is what a toolbar wants, and a form that
   * asks for a color among twenty other questions, where a hex in a box is
   * eleven characters of noise next to the thing itself.
   *
   * It also settles where the value is stated. The default field *is* the input,
   * so the panel is told `no-value` and would otherwise show a second one. A
   * swatch states nothing, so the panel keeps its own row and the value is
   * readable and typeable exactly once, in whichever of the two is present.
   *
   * The trade is real and is the reason this is not the default: a swatch cannot
   * be read or pasted into without opening the panel, which is worse for a form
   * where the color is the answer rather than a setting.
   */
  @property({ reflect: true })
  appearance?: 'swatch'

  /** Whether the color carries an alpha channel. */
  @property({ reflect: true, type: Boolean })
  alpha = false

  /**
   * The syntax the value is written in: `hex`, `rgb` or `hsl`.
   *
   * **Undefaulted, because it reflects.** The two together are what stamp an
   * attribute onto every host anybody renders, including the ones nobody
   * configured: the server wrote `format="hex"` on every colour input on the
   * page, and React, holding no such prop, reported a hydration mismatch for
   * each one. That is the fault `Tree.chevronPlacement` had and the reason the
   * area rules say a reflected property takes no default. Hex is still what an
   * unset one writes; the difference is that the resting arrangement is the
   * attribute's absence rather than a value spelled out.
   */
  @property({ reflect: true })
  format?: ColorFormat

  /** Whether the reader may change the format from the panel. */
  @property({ attribute: 'no-format', type: Boolean })
  noFormat = false

  /** What the field says before a color is in it. */
  @property()
  placeholder = '#000000'

  /** Colors offered under the picker, as a comma-separated list. */
  @property()
  swatches = ''

  /** Accessible name for the control that opens the panel. */
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose a color'

  /** The overlay, placed against the field for the reason Date Input gives. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.renderRoot?.querySelector<HTMLElement>('[part="field"]'),
    /* The surface *and* the trigger.
     *
     * A control is not always one element: the button that opens this panel is
     * part of it, and a press on it is not a press outside. Scoped to the
     * surface alone, `pointerdown` on the trigger closed the panel and the
     * trigger's own `toggleOpen` reopened it on the `click` that followed, so
     * the panel could never be closed by the button that opened it. Measured
     * across all five popover-bearing components: Menu, Popover and Tooltip
     * already named their invoker; this one and its three siblings did not, and
     * all four stayed open on a second press where Menu closed.
     *
     * `DismissController` documents this exact failure and takes a list for it.
     * The list was the fix; using it was the part that did not happen here. */
    boundary: (): readonly (Element | null | undefined)[] => [
      this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
      this.renderRoot?.querySelector<HTMLElement>('[part="trigger"]'),
    ],
    offset: () => 8,
    onDismiss: () => this.requestOpen(false),
    placement: 'bottom-start',
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
  })

  /**
   * The last value that was a color.
   *
   * Half-typed input reaches here on every keystroke and most of it is not a
   * color, so the picker is given the last thing that was one rather than a
   * fallback. Typing `#00ff00` one character at a time goes `#`, `#0`, `#00`,
   * `#00f`, `#00ff`, `#00ff0`, `#00ff00`: measured, the square went red, red,
   * red, blue, blue, **red**, green, because two of those are colors and the
   * ones between are not. Holding the last good one takes the flicker out and
   * leaves the square on blue until green arrives.
   *
   * Not state, because it is only ever read on a render the value already
   * caused. The same reasoning Date Input records for its calendar, which will
   * not follow a date until the field says something complete.
   */
  private settled = ''

  /**
   * What the label points at and validity hangs off.
   *
   * The input where there is one, the trigger where there is not. `setValidity`
   * needs an element to anchor the message to and a label needs something
   * focusable to name, and in `swatch` the trigger is the only control in the
   * field. It carries `id="control"` there for the same reason.
   */
  private get anchor(): HTMLElement | null {
    if (typeof this.renderRoot?.querySelector !== 'function') {
      return null
    }
    return this.control ?? this.renderRoot.querySelector<HTMLElement>('[part="trigger"]')
  }

  private get control(): HTMLInputElement | null {
    if (typeof this.renderRoot?.querySelector !== 'function') {
      return null
    }
    return this.renderRoot.querySelector<HTMLInputElement>('[part="control"]')
  }

  /** What the picker should show, which is only ever a color. */
  private get picked(): string {
    return parseColor(this.value) ? this.value : this.settled
  }

  /** What the trigger's swatch paints, which is only ever a color. */
  private get painted(): string {
    const parsed = parseColor(this.value)
    return parsed ? toCss(parsed) : 'transparent'
  }

  /** Relayed under this element's name, so a consumer hears one control. */
  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    this.requestValue((event.target as HTMLInputElement).value)
    this.restore()
  }

  private readonly handlePickerChange = (event: Event): void => {
    event.stopPropagation()
    this.requestValue((event as HelixChangeEvent).detail.value)
    this.restore()
  }

  /**
   * The picker is about to take the pointer over, so the panel gets out of the
   * way and comes back after.
   *
   * `helix-color-picker` says what it is doing rather than reaching for a panel it
   * cannot know it is in. A floating panel left up during an eyedropper is one
   * the reader cannot dismiss and may well be trying to sample from underneath.
   */
  private readonly handleSampleStart = (): void => {
    this.requestOpen(false)
  }

  private readonly handleSampleEnd = (): void => {
    this.requestOpen(true)
  }

  /*
   * Puts the field back where the answer differs from what was typed.
   *
   * `requestValue` announces and decides; this is the other half, which Input
   * and Date Input both need for the same reason: the native control has already
   * changed, so wherever the answer does not follow it, it has to be restored.
   */
  private restore(): void {
    const control = this.control
    if (control && control.value !== this.value) {
      control.value = this.value
    }
    this.sync()
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    this.internals.setFormValue(this.value)
    const anchor = this.anchor
    if (!anchor) {
      return
    }
    const control = this.control
    /* Checked here rather than left to the input, which is `text` and has no
       idea what a color is. `type="color"` is what was given up to own the
       panel, and it would not have helped: it has no invalid state, because it
       cannot hold one. */
    if (this.value !== '' && parseColor(this.value) === null) {
      this.internals.setValidity(
        { badInput: true },
        'Enter a color, like #ff0000, rgb(255 0 0) or hsl(0 100% 50%).',
        anchor,
      )
    } else if (control) {
      this.internals.setValidity(control.validity, control.validationMessage, control)
    } else {
      /* A swatch has no native validity of its own, so `required` is the only
         thing left to check and this element has to check it: an empty value on
         a required field is the one state a block of color can be wrong in. */
      this.internals.setValidity(
        this.required && this.value === '' ? { valueMissing: true } : {},
        this.required && this.value === '' ? 'Choose a color.' : '',
        anchor,
      )
    }
    this.refreshFeedback()
  }

  /** Escape shuts the panel without moving the color. */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      event.stopPropagation()
      this.requestOpen(false)
      this.control?.focus()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    // Whatever the markup arrived with, so a form knows before anything is typed.
    this.sync()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value')) {
      this.sync()
      if (parseColor(this.value)) {
        this.settled = this.value
      }
    }
    /* Driven from here rather than from the toggle, because `open` is a property
       a consumer may set directly and the panel has to follow either way. The
       controller is idempotent, so arriving twice for one open costs nothing.
       Without this the surface stays `display: none`, a `popover` element being
       hidden until something shows it, and the square inside measures zero,
       which is the one measurement a drag cannot work without. */
    if (this.open) {
      this.panel.show()
    } else {
      this.panel.hide()
    }
  }

  /** Puts the caret in the field, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.anchor?.focus(options)
  }

  /*
   * The picker is told `no-value` because the field above it is that input.
   *
   * Standing on a page, helix-color-picker states its own color as text: a square and
   * two ramps can build one and cannot state one, and a reader who already has a
   * hex should not have to find it by dragging. Here that row would be a second
   * editable field for the same value, which is two places to type with no
   * answer to which one is authoritative or which has the caret.
   *
   * The other way round was considered, this element dropping its own field and
   * letting the panel's be the only one. It is worse for a form: the value could
   * not be read at a glance or pasted without opening a panel.
   */
  /**
   * The picker the field opens, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The
   * public tag rather than the base one: a consumer on the styled tier gets the
   * styled element, and one on the headless tier brings their own under that
   * name.
   */
  protected renderPicker(): TemplateResult {
    return html`<helix-color-picker
      part="picker"
      ?invalid=${this.resolvedFeedback !== ''}
      ?alpha=${this.alpha}
      ?no-format=${this.noFormat}
      ?no-value=${this.appearance !== 'swatch'}
      .format=${this.format ?? 'hex'}
      .value=${this.picked}
      swatches=${this.swatches || nothing}
      ?disabled=${this.isDisabled}
      @helix-change=${this.handlePickerChange}
      @helix-sample-start=${this.handleSampleStart}
      @helix-sample-end=${this.handleSampleEnd}
    ></helix-color-picker>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        <!-- The same pair Input carries, in the same places: leading content
             before the text, trailing content after it and before the trigger.
             A label wanting to sit inside the field rather than over it goes
             here, which is what the toggle group's own label-placement does and
             what this had no way to express. Backticks stay out of this
             comment: it is inside a tagged template, so one would end the
             literal and the error lands on a line further down. -->
        <slot name="start"></slot>
        ${
          this.appearance === 'swatch'
            ? nothing
            : html`<input
          part="control"
          id="control"
          type="text"
          .value=${this.value}
          name=${this.name || nothing}
          placeholder=${this.placeholder || nothing}
          autocomplete="off"
          spellcheck="false"
          aria-describedby=${this.describedBy ?? nothing}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          @input=${this.handleInput}
        />`
        }
        <slot name="end"></slot>
        <button
          part="trigger"
          id=${this.appearance === 'swatch' ? 'control' : nothing}
          type="button"
          aria-controls="surface"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-haspopup="dialog"
          aria-label=${this.triggerLabel}
          ?disabled=${this.isDisabled}
          @click=${() => this.toggleOpen()}
        >
          <span
            part="preview"
            style="--color-input-swatch: ${this.value === '' ? 'transparent' : this.painted}"
          ></span>
          <slot name="trigger"></slot>
        </button>
      </div>

      <div part="surface" id="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderPicker()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-color-input': HelixBaseColorInput
  }
}
