import {
  AriaForwardController,
  customElement,
  type HelixBeforeChangeEvent,
  HelixFormElement,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  MixinPickerField,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
/* Relative, so this registers the base picker and the styled file's identical
   import registers the styled one. `tier` picks which the template asks for. */
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
 * The custom property below is written by this component and never set by a
 * consumer: it carries a value this element resolved and CSS cannot, which is
 * what lets a stylesheet on this tier paint the swatch without parsing anything
 * itself.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases ColorField, ColourInput, InputColor
 * @documentation https://fusion.dev/helix/components/color-input
 *
 * @slot end - Content at the trailing end, before the trigger.
 * @slot feedback - What is wrong with it.
 * @slot hint - Help under the field.
 * @slot start - Content at the leading end of the field, inside its border.
 * @slot trigger - The mark on the field saying a panel opens.
 *
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the color changes. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before it closes. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the panel opens. Cancelable: refusing it takes the decision and nothing moves.
 * @event {Event} input - Announced once the value has moved.
 * @event {Event} toggle - Says the state moved, carrying `newState` and `oldState`.
 *
 * @csspart control - The text input carrying the value. Absent in `swatch`.
 * @csspart feedback - What is wrong with it.
 * @csspart field - The box holding the text and the trigger.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart label - The question, over the field.
 * @csspart picker - The color picker inside it.
 * @csspart picker-actions - The group holding the eyedropper and the syntax toggle.
 * @csspart picker-channel - One ramp.
 * @csspart picker-channel-control - The range input.
 * @csspart picker-channel-feedback - What is wrong with it.
 * @csspart picker-channel-field - The row: the control and its readout.
 * @csspart picker-channel-hint - Help under the track, while nothing is wrong.
 * @csspart picker-channel-label - The question, over the track.
 * @csspart picker-channel-marker - One mark.
 * @csspart picker-channel-marker-label - The value a mark stands at, when `marker-labels` is set.
 * @csspart picker-channel-markers - The row of marks along the track.
 * @csspart picker-channel-output - The current value, shown beside it.
 * @csspart picker-channels - The ramps beside it.
 * @csspart picker-controls - The row under the square.
 * @csspart picker-eyedropper - The control that samples a color from the screen.
 * @csspart picker-eyedropper-button - The inner control.
 * @csspart picker-footer - The row holding the value and the tools.
 * @csspart picker-format - The control that changes the syntax the value is written in.
 * @csspart picker-format-button - The inner control.
 * @csspart picker-grid - The saturation and brightness square.
 * @csspart picker-grid-brightness - The range input for its vertical axis.
 * @csspart picker-grid-handle - The mark showing where in the square the color sits.
 * @csspart picker-grid-saturation - The range input for the square's horizontal axis.
 * @csspart picker-icon - A glyph this component draws.
 * @csspart picker-sample - The chip of the current color, which copies it when pressed.
 * @csspart picker-swatch - One preset.
 * @csspart picker-swatches - The row of presets.
 * @csspart picker-value - The color as text, which can be typed or pasted.
 * @csspart preview - The chip showing the color, inside the trigger.
 * @csspart surface - The floating panel.
 * @csspart trigger - The control that opens the panel.
 *
 * @cssproperty --color-input-swatch - The chosen color, to paint over the transparency check.
 *
 * @cssstate invalid - While there is feedback to show: the platform's verdict, or the consumer's `feedback`.
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
   * The syntax the value is written in: `hex`, `rgb` or `hsl`.
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
   * Whether the reader may change the format from the panel.
   */
  @property({ attribute: 'no-format', type: Boolean })
  noFormat = false

  /**
   * What the field says before a color is in it.
   */
  @property()
  placeholder = '#000000'

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
    this.requestValue((event as HelixBeforeChangeEvent).detail.value)
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
        eyedropper-button: picker-eyedropper-button, footer: picker-footer, format: picker-format,
        format-button: picker-format-button, grid: picker-grid,
        grid-brightness: picker-grid-brightness, grid-handle: picker-grid-handle,
        grid-saturation: picker-grid-saturation, icon: picker-icon, sample: picker-sample,
        swatch: picker-swatch, swatches: picker-swatches, value: picker-value"
      ?invalid=${this.resolvedFeedback !== ''}
      ?alpha=${this.alpha}
      ?no-format=${this.noFormat}
      ?no-value=${this.variant !== 'swatch'}
      .format=${this.format ?? 'hex'}
      .value=${this.picked}
      swatches=${this.swatches || nothing}
      ?disabled=${this.isDisabled}
      @helix-before-change=${this.handlePickerChange}
      @change=${this.stopInner}
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
          id="control"
          type="text"
          .value=${this.value}
          name=${this.name || nothing}
          placeholder=${this.placeholder || nothing}
          autocomplete=${this.autocomplete || nothing}
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
          id=${this.variant === 'swatch' ? 'control' : nothing}
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
    'helix-headless-color-input': HelixHeadlessColorInput
  }
}
