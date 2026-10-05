import {
  AriaForwardController,
  type ColorFormat,
  type ColorWords,
  colorName,
  customElement,
  type HelixBeforeChangeEvent,
  HelixFormElement,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  MixinPickerField,
  parseColor,
  toCss,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
/* Relative, so this registers the base picker and the styled file's identical
   import registers the styled one. `tier` picks which the template asks for. */
import '../../color-picker/index.js'

/**
 * @summary A field for a color, typed in any syntax or picked from a panel.
 *
 * @description
 * A text field with a button that opens `ColorPicker` in an overlay.
 * `ColorPicker` provides the square, the ramps, the eyedropper, and the syntax
 * toggle, and you can also use it on its own, flat on the page. Color Input
 * adds the field, the overlay, and the form value, the same arrangement Date
 * Input has with `DatePicker`.
 *
 * You can type or paste a color into the field without opening the picker.
 * Color Input is a custom control, unlike `<input type="color">`, so you can
 * style the panel to match your interface.
 *
 * The field reads every color syntax, including `#f00`, `#ff0000`,
 * `rgb(255 0 0)`, `rgba(255,0,0,.5)`, `rgb(255 0 0 / 50%)`, and
 * `hsl(0 100% 50%)`. It writes colors in the syntax that `format` names. The
 * field shows the value without reformatting it, because half-typed input does
 * not survive a round trip through a formatter. Date Input does the same with
 * dates.
 *
 * Typing sends `input` on each keystroke and `change` when you leave the
 * field, as a text field does, so the message about a color it cannot read
 * waits until you are done. Dragging in the panel sends `input` as the color
 * moves and `change` when it settles.
 *
 * The trigger and ArrowDown open the panel with focus in the square. Tab moves
 * between the panel's controls without leaving it, and Escape closes it and
 * returns focus to the field.
 *
 * The component sets `--color-input-swatch`, so do not set it yourself. It
 * holds the resolved color, so the styled tier can paint the swatch without
 * parsing the value.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases ColorField, ColourInput, InputColor
 * @documentation https://fusion.dev/helix/components/color-input
 *
 * @slot end - Content at the trailing end, before the trigger.
 * @slot feedback - The message that says what is wrong with the value.
 * @slot hint - Help text under the field.
 * @slot panel-footer - Content in the panel under the picker, such as a note or an action.
 * @slot panel-header - Content in the panel above the picker, such as a heading or a shortcut.
 * @slot start - Content at the leading end of the field, inside its border.
 * @slot trigger - The icon on the trigger, which shows that the field opens a panel.
 *
 * @event {Event} change - Sent when the user finishes changing the value.
 * @event {HelixBeforeChangeEvent} helix-before-change - The color is about to change. Cancelable: cancel it to keep the current color.
 * @event {HelixBeforeCloseEvent} helix-before-close - The panel is about to close. Cancelable: cancel it to keep it open.
 * @event {HelixBeforeOpenEvent} helix-before-open - The panel is about to open. Cancelable: cancel it to keep it closed.
 * @event {Event} input - Fired as the value changes.
 * @event {ToggleEvent} toggle - The panel opened or closed. The event carries `newState` and `oldState`.
 *
 * @csspart control - The text input that holds the value. Absent in the `swatch` variant.
 * @csspart feedback - The message that says what is wrong with the value.
 * @csspart field - The box holding the text and the trigger.
 * @csspart hint - Help text under the field, shown while there is no feedback.
 * @csspart label - The label above the field.
 * @csspart picker - The color picker inside the panel.
 * @csspart picker-actions - The group holding the eyedropper and the syntax toggle.
 * @csspart picker-channel - One channel slider.
 * @csspart picker-channel-control - The range input of a channel slider.
 * @csspart picker-channel-feedback - The error message for a channel slider.
 * @csspart picker-channel-field - The row that holds a channel slider's control and its readout.
 * @csspart picker-channel-hint - The help text under the track, shown while there is no error.
 * @csspart picker-channel-label - The label above the track.
 * @csspart picker-channel-marker - One mark on the track.
 * @csspart picker-channel-marker-label - The value a mark stands at, when `marker-labels` is set.
 * @csspart picker-channel-markers - The row of marks along the track.
 * @csspart picker-channel-output - The current value, shown beside the track.
 * @csspart picker-channels - The channel sliders beside the sample.
 * @csspart picker-controls - The row under the square.
 * @csspart picker-eyedropper - The control that samples a color from the screen.
 * @csspart picker-eyedropper-button - The button inside `picker-eyedropper`.
 * @csspart picker-eyedropper-live - The live region of the button inside `picker-eyedropper`, which says its pending label.
 * @csspart picker-eyedropper-text - The words on the button inside `picker-eyedropper`.
 * @csspart picker-field - One channel's number field with its label, in `channel-fields`.
 * @csspart picker-field-input - The number input in a channel's field.
 * @csspart picker-field-label - The name above a channel's number input.
 * @csspart picker-fields - The row of channel number fields, in `channel-fields`.
 * @csspart picker-footer - The row holding the value and the tools.
 * @csspart picker-format - The control that changes the syntax the value is written in.
 * @csspart picker-format-button - The button inside `picker-format`.
 * @csspart picker-format-live - The live region of the button inside `picker-format`, which says its pending label.
 * @csspart picker-format-text - The words on the button inside `picker-format`.
 * @csspart picker-grid - The saturation and brightness square.
 * @csspart picker-grid-brightness - The range input for the square's vertical axis.
 * @csspart picker-grid-handle - The mark showing where in the square the color sits.
 * @csspart picker-grid-saturation - The range input for the square's horizontal axis.
 * @csspart picker-icon - An icon drawn by the picker.
 * @csspart picker-sample - A chip of the current color. Pressing it copies the value.
 * @csspart picker-swatch - One preset.
 * @csspart picker-swatches - The row of presets.
 * @csspart picker-value - The text field that holds the color. It accepts a typed or pasted color.
 * @csspart preview - The chip showing the color, inside the trigger.
 * @csspart surface - The floating panel.
 * @csspart trigger - The control that opens the panel.
 *
 * @cssproperty --color-input-swatch - The chosen color, painted over the checkerboard that shows transparency.
 *
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 * @cssstate open - While the picker is open.
 */
@customElement('helix-headless-color-input')
export class HelixHeadlessColorInput extends MixinPickerField(
  MixinControllerOpen(MixinControllerValue(MixinField(HelixFormElement))),
) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control'),
  })

  /**
   * Whether the color carries an alpha channel.
   */
  @property({ reflect: true, type: Boolean })
  alpha = false

  /**
   * What the browser may autofill in the text field, as a platform token.
   *
   * **Defaults to `off`, which is not the platform's default and is the
   * point.** The field holds a color, so a browser offering to fill it with a
   * saved address is competing for the same keystrokes as the picker. A
   * consumer who wants autofill can still ask.
   */
  @property()
  autocomplete = 'off'

  /**
   * Whether the panel shows a number field for each channel of the color.
   * Passed to the panel; see Color Picker's `channel-fields`.
   */
  @property({ attribute: 'channel-fields', type: Boolean })
  channelFields = false

  /**
   * The words a color's name is spoken in, as JSON keyed by their English,
   * such as `{"red": "rot", "vibrant": "kräftiges"}`.
   *
   * Passed to the panel, whose square, hue ramp and presets say the color's
   * name, and read by the swatch in `swatch`, which says it before the value.
   * Color Picker lists the keys.
   */
  @property({ attribute: 'color-words', type: Object })
  colorWords: Partial<ColorWords> = {}

  /**
   * The syntax the value is written in: `hex`, `rgb`, or `hsl`.
   *
   * **Undefaulted, because it reflects.** The two together stamp an attribute
   * onto every host anybody renders, including the ones nobody configured: the
   * server writes `format="hex"` on every color input on the page, and React,
   * holding no such prop, reports a hydration mismatch for each one.
   * `helix component`'s `reflected-defaults` holds it. Hex is still what an unset one
   * writes; the resting arrangement is the attribute's absence rather than a
   * value spelled out.
   */
  @property({ reflect: true })
  format?: ColorFormat

  /**
   * Hides the button in the panel that changes the format.
   */
  @property({ attribute: 'no-format', type: Boolean })
  noFormat = false

  /**
   * The text the field shows before a color is entered.
   */
  @property()
  placeholder = '#000000'

  /**
   * Whether the color is locked. A read-only field still submits its value.
   *
   * The field can be read and copied from, and the panel does not open, as on
   * Date Input and Time Input.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /** Typed, so a keystroke is announced as `input` alone. See `announcesInput`. */
  protected override readonly announcesInput = true

  /** Requests a new value. While `readOnly` is set, nothing changes. */
  override requestValue(next: string): boolean {
    if (this.readOnly) {
      return false
    }
    return super.requestValue(next)
  }

  /** Requests the panel open or closed. While `readOnly` is set, it does not open. */
  override requestOpen(next: boolean): boolean {
    if (next && this.readOnly) {
      return false
    }
    return super.requestOpen(next)
  }

  /**
   * Colors offered under the picker, as a comma-separated list.
   */
  @property()
  swatches = ''

  /**
   * Accessible name for the control that opens the panel.
   */
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose a color'

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
  variant?: 'swatch'

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
  protected override get anchor(): HTMLElement | null {
    return this.control ?? this.partNamed('trigger')
  }

  /** What the picker should show, which is only ever a color. */
  private get picked(): string {
    return parseColor(this.value) ? this.value : this.settled
  }

  /**
   * What the swatch says in `swatch`: the color's name and then the value, or
   * the trigger's words where there is no color yet.
   *
   * The name first, because it is what a sighted reader takes from the block of
   * color, and the value after it, because it is what the field holds and what
   * a reader may need to copy.
   */
  private get swatchWords(): string {
    const parsed = parseColor(this.value)
    if (!parsed) {
      return this.value || this.triggerLabel
    }
    return `${colorName(parsed, this.colorWords, this.lang)} ${this.value}`
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

  /**
   * The picker's request, taken as this element's own.
   *
   * **Only the picker's.** A request from anything inside it arrives here
   * retargeted to the picker, and a slider's carried its number: a hue of 120
   * became this field's value and every page listening heard it. The picker
   * keeps its sliders' requests now, and this checks where the event started
   * as well, so a picker a tier above renders cannot say for it what it did
   * not mean.
   */
  private readonly handlePickerChange = (event: Event): void => {
    event.stopPropagation()
    if (event.composedPath()[0] !== event.currentTarget) {
      return
    }
    /* Refused here, refused in the picker too, so its square stays on the
       color this field holds. */
    if (!this.requestValue((event as HelixBeforeChangeEvent).detail.value)) {
      event.preventDefault()
    }
    this.restore()
  }

  /**
   * The picker's `change`, said under this element's name.
   *
   * The picker sends it when a drag, a key or a preset settles the color, so
   * this field does too, and a drag is one `change` rather than one a frame.
   */
  private readonly handlePickerSettled = (event: Event): void => {
    event.stopPropagation()
    if (event.composedPath()[0] === event.currentTarget) {
      this.announceChange()
    }
  }

  /**
   * The picker is about to take the pointer over, so the panel gets out of the
   * way and comes back after.
   *
   * `ColorPicker` says what it is doing rather than reaching for a panel it
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
   * Reports the value and the validity the host stands behind.
   *
   * The family's own rather than the mixin's, because in `swatch` there is no
   * text control: the mixin stops where it finds none, and here the verdict
   * hangs off the trigger instead and `required` is checked by hand, a block of
   * color having no native validity to adopt.
   */
  protected override sync(): void {
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
        this.badInputMessage || 'Enter a color, like #ff0000, rgb(255 0 0) or hsl(0 100% 50%).',
        anchor,
      )
    } else if (control) {
      this.copyValidity(control)
    } else {
      /* A swatch has no native validity of its own, so `required` is the only
         thing left to check and this element has to check it: an empty value on
         a required field is the one state a block of color can be wrong in. */
      this.internals.setValidity(
        this.required && this.value === '' ? { valueMissing: true } : {},
        this.required && this.value === '' ? this.valueMissingMessage || 'Choose a color.' : '',
        anchor,
      )
    }
    this.refreshFeedback()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value') && parseColor(this.value)) {
      this.settled = this.value
    }
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
   * Not the other way round, this element dropping its own field and letting the
   * panel's be the only one: the value could then not be read at a glance or
   * pasted without opening a panel.
   */
  /**
   * The picker the field opens, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * headless element, and a styled subclass that sets `tier` renders the styled one
   * from the same template.
   */
  protected renderPicker(): TemplateResult {
    return html`<${this.tag('color-picker')}
      part="picker"
      exportparts="actions: picker-actions, channel: picker-channel, channel-control: picker-channel-control,
        channel-feedback: picker-channel-feedback, channel-field: picker-channel-field,
        channel-hint: picker-channel-hint, channel-label: picker-channel-label,
        channel-marker: picker-channel-marker, channel-marker-label: picker-channel-marker-label,
        channel-markers: picker-channel-markers, channel-output: picker-channel-output,
        channels: picker-channels, controls: picker-controls, eyedropper: picker-eyedropper,
        eyedropper-button: picker-eyedropper-button, eyedropper-live: picker-eyedropper-live, eyedropper-text: picker-eyedropper-text,
        field: picker-field, field-input: picker-field-input, field-label: picker-field-label,
        fields: picker-fields, footer: picker-footer, format: picker-format,
        format-button: picker-format-button, format-live: picker-format-live, format-text: picker-format-text, grid: picker-grid,
        grid-brightness: picker-grid-brightness, grid-handle: picker-grid-handle,
        grid-saturation: picker-grid-saturation, icon: picker-icon, sample: picker-sample,
        swatch: picker-swatch, swatches: picker-swatches, value: picker-value"
      ?invalid=${this.resolvedFeedback !== ''}
      ?alpha=${this.alpha}
      ?channel-fields=${this.channelFields}
      ?no-format=${this.noFormat}
      ?no-value=${this.variant !== 'swatch'}
      .colorWords=${this.colorWords}
      .format=${this.format ?? 'hex'}
      .value=${this.picked}
      swatches=${this.swatches || nothing}
      ?disabled=${this.isDisabled}
      @helix-before-change=${this.handlePickerChange}
      @change=${this.handlePickerSettled}
      @input=${this.stopInner}
      @helix-sample-start=${this.handleSampleStart}
      @helix-sample-end=${this.handleSampleEnd}
    ></${this.tag('color-picker')}>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        <!-- The same pair Input carries, in the same places: leading content
             before the text, trailing content after it and before the trigger.
             A label wanting to sit inside the field rather than over it goes
             here, which is what the toggle group's own label-placement does.
             Backticks stay out of this
             comment: it is inside a tagged template, so one would end the
             literal and the error lands on a line further down. -->
        <slot name="start"></slot>
        ${
          this.variant === 'swatch'
            ? nothing
            : html`<input
          part="control"
          id=${this.controlId}
          type="text"
          .value=${this.value}
          name=${this.name || nothing}
          placeholder=${this.placeholder || nothing}
          autocomplete=${this.autocomplete || nothing}
          spellcheck="false"
          aria-describedby=${this.describedBy ?? nothing}
          aria-invalid=${this.invalidity ?? nothing}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          @change=${this.handleCommit}
          @input=${this.handleInput}
          @keypress=${this.handleKeypress}
        />`
        }
        <slot name="end"></slot>
        <button
          part="trigger"
          id=${this.variant === 'swatch' ? 'control' : nothing}
          type="button"
          aria-controls="surface"
          aria-disabled=${this.readOnly ? 'true' : nothing}
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-haspopup="dialog"
          aria-label=${this.variant === 'swatch' ? nothing : this.triggerLabel}
          aria-labelledby=${
            this.variant === 'swatch'
              ? this.labeled
                ? `${this.labelId} swatch-value`
                : 'swatch-value'
              : nothing
          }
          ?disabled=${this.isDisabled}
          @click=${this.handleTriggerClick}
        >
          <span
            part="preview"
            style="--color-input-swatch: ${this.value === '' ? 'transparent' : this.painted}"
          ></span>
          <slot name="trigger"></slot>
          ${
            /* **The swatch is the field, so it is named as one.** The field's
               label points here, and the trigger's own words overrode it, so
               "Brand color" was read as "Choose a color" and the color itself
               was never said. The label, then the value, or the trigger's words
               where there is no value yet. */
            this.variant === 'swatch'
              ? html`<span id="swatch-value" hidden>${this.swatchWords}</span>`
              : nothing
          }
        </button>
      </div>

      ${
        /* A dialog, which is what the trigger's `aria-haspopup` promised: the
           surface had no role, so the promise named something that was not
           there. Named by the trigger's words, which say what it is for. */
        ''
      }
      <div
        part="surface"
        id="surface"
        role="dialog"
        aria-label=${this.triggerLabel}
        popover="manual"
        ?hidden=${!this.open}
      >
        <slot name="panel-header"></slot>
        ${this.renderPicker()}
        <slot name="panel-footer"></slot>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-color-input': HelixHeadlessColorInput
  }
}
