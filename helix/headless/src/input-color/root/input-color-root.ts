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
 * @summary A colour, typed in any syntax or picked from a panel.
 *
 * @description
 * **The picker is `helix-color-picker`, not a second one written here.** It owns the
 * square, the ramps, the eyedropper and the syntax toggle, and it is worth
 * having on its own: a settings pane wants a picker flat on the page with
 * nothing to open. This element is the field, the overlay, and the form.
 * Exactly the arrangement Input Date has with `helix-calendar`.
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
 * `hsl(0 100% 50%)` are all colours, and a field that refuses one because it
 * prefers another is arguing with the person using it. What the field *shows* is
 * the value itself, for the reason Input Date gives about its dates: half-typed
 * input does not survive a round trip through a formatter.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases ColorField, ColorInput, ColourInput
 * @documentation https://helix.fusion.dev/components/input-color
 *
 * @slot trigger - The mark on the field saying a panel opens.
 * @slot hint - Help under the field.
 * @slot feedback - What is wrong with it.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the colour changes.
 * @event {HelixOpenEvent} helix-open - Fired when the panel opens.
 * @event {HelixCloseEvent} helix-close - Fired when it closes.
 *
 * @csspart field - The box holding the text and the trigger.
 * @csspart control - The text input carrying the value. Absent in `swatch`.
 * @csspart trigger - The control that opens the panel.
 * @csspart preview - The chip showing the colour, inside the trigger.
 * @csspart surface - The floating panel.
 * @csspart picker - The colour picker inside it.
 */
@customElement('helix-base-input-color')
export class HelixBaseInputColor extends MixinControllerOpen(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /**
   * Whether the field is a text box with a swatch on it, or only the swatch.
   *
   * `swatch` is the native control's shape: a block of colour that opens a
   * picker, with no text beside it. It is what a toolbar wants, and a form that
   * asks for a colour among twenty other questions, where a hex in a box is
   * eleven characters of noise next to the thing itself.
   *
   * It also settles where the value is stated. The default field *is* the input,
   * so the panel is told `no-value` and would otherwise show a second one. A
   * swatch states nothing, so the panel keeps its own row and the value is
   * readable and typeable exactly once, in whichever of the two is present.
   *
   * The trade is real and is the reason this is not the default: a swatch cannot
   * be read or pasted into without opening the panel, which is worse for a form
   * where the colour is the answer rather than a setting.
   */
  @property({ reflect: true })
  appearance?: 'swatch'

  /** Whether the colour carries an alpha channel. */
  @property({ reflect: true, type: Boolean })
  alpha = false

  /** The syntax the value is written in: `hex`, `rgb` or `hsl`. */
  @property({ reflect: true })
  format: ColorFormat = 'hex'

  /** Whether the reader may change the format from the panel. */
  @property({ attribute: 'no-format', type: Boolean })
  noFormat = false

  /** What the field says before a colour is in it. */
  @property()
  placeholder = '#000000'

  /** Colours offered under the picker, as a comma-separated list. */
  @property()
  swatches = ''

  /** Accessible name for the control that opens the panel. */
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose a colour'

  /** The overlay, placed against the field for the reason Input Date gives. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.renderRoot?.querySelector<HTMLElement>('[part="field"]'),
    boundary: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
    offset: () => 8,
    onDismiss: () => this.requestOpen(false),
    placement: 'bottom-start',
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
  })

  /**
   * The last value that was a colour.
   *
   * Half-typed input reaches here on every keystroke and most of it is not a
   * colour, so the picker is given the last thing that was one rather than a
   * fallback. Typing `#00ff00` one character at a time goes `#`, `#0`, `#00`,
   * `#00f`, `#00ff`, `#00ff0`, `#00ff00`: measured, the square went red, red,
   * red, blue, blue, **red**, green, because two of those are colours and the
   * ones between are not. Holding the last good one takes the flicker out and
   * leaves the square on blue until green arrives.
   *
   * Not state, because it is only ever read on a render the value already
   * caused. The same reasoning Input Date records for its calendar, which will
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

  /** What the picker should show, which is only ever a colour. */
  private get picked(): string {
    return parseColor(this.value) ? this.value : this.settled
  }

  /** What the trigger's swatch paints, which is only ever a colour. */
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

  /**
   * Puts the field back where the answer differs from what was typed.
   *
   * `requestValue` announces and decides; this is the other half, which Input
   * and Input Date both need for the same reason: the native control has already
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
       idea what a colour is. `type="color"` is what was given up to own the
       panel, and it would not have helped: it has no invalid state, because it
       cannot hold one. */
    if (this.value !== '' && parseColor(this.value) === null) {
      this.internals.setValidity(
        { badInput: true },
        'Enter a colour, like #ff0000, rgb(255 0 0) or hsl(0 100% 50%).',
        anchor,
      )
    } else if (control) {
      this.internals.setValidity(control.validity, control.validationMessage, control)
    } else {
      /* A swatch has no native validity of its own, so `required` is the only
         thing left to check and this element has to check it: an empty value on
         a required field is the one state a block of colour can be wrong in. */
      this.internals.setValidity(
        this.required && this.value === '' ? { valueMissing: true } : {},
        this.required && this.value === '' ? 'Choose a colour.' : '',
        anchor,
      )
    }
    this.refreshFeedback()
  }

  /** Escape shuts the panel without moving the colour. */
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
   * Standing on a page, helix-color-picker states its own colour as text: a square and
   * two ramps can build one and cannot state one, and a reader who already has a
   * hex should not have to find it by dragging. Here that row would be a second
   * editable field for the same value, which is two places to type with no
   * answer to which one is authoritative or which has the caret.
   *
   * The other way round was considered, this element dropping its own field and
   * letting the panel's be the only one. It is worse for a form: the value could
   * not be read at a glance or pasted without opening a panel.
   */
  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
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
            style="--_color: ${this.value === '' ? 'transparent' : this.painted}"
          ></span>
          <slot name="trigger"></slot>
        </button>
      </div>

      <div part="surface" id="surface" popover="manual" ?hidden=${!this.open}>
        <helix-color-picker
          part="picker"
          ?invalid=${this.resolvedFeedback !== ''}
          ?alpha=${this.alpha}
          ?no-format=${this.noFormat}
          ?no-value=${this.appearance !== 'swatch'}
          .format=${this.format}
          .value=${this.picked}
          swatches=${this.swatches || nothing}
          ?disabled=${this.isDisabled}
          @helix-change=${this.handlePickerChange}
          @helix-sample-start=${this.handleSampleStart}
          @helix-sample-end=${this.handleSampleEnd}
        ></helix-color-picker>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-input-color': HelixBaseInputColor
  }
}
