import {
  type Color,
  type ColorFormat,
  type ColorWords,
  CopyController,
  capturePointer,
  colorName,
  customElement,
  drawIcon,
  focusItemOf,
  formatColor,
  formatNumber,
  formatWords,
  HelixFormElement,
  hostAria,
  hueName,
  internalsOf,
  isRtl,
  KeyboardNavigationController,
  labelsOf,
  MixinControllerValue,
  MixinPickerFeedback,
  type PickerFailure,
  parseColor,
  rovingStop,
  toCss,
  words,
  wordsConverter,
  wordsLocale,
} from '@fusion.dev/helix-core'
import {
  areaAt,
  areaKeyed,
  type ChannelName,
  COLOR_START,
  channelFields,
  colorPresets,
  hueAt,
  nextColorFormat,
  writeChannel,
} from '@fusion.dev/helix-core/color-picker'
import { eyedropper } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { live } from 'lit/directives/live.js'
import { html } from 'lit/static-html.js'
import { HelixSampleEndEvent, HelixSampleStartEvent } from '../events/index.js'
/* Relative, so this registers the base slider and the styled file's identical
   import registers the styled one. `tier` picks which the template asks for. */
import '../../button/index.js'
import '../../button-group/index.js'
import '../../slider/index.js'

/** What `EyeDropper` looks like where the browser has one. */
interface EyeDropperConstructor {
  new (): { open(): Promise<{ sRGBHex: string }> }
}

/**
 * @summary A color picker made of a square and two ramps.
 *
 * @description
 * The picker on its own, with no field around it, for a settings pane or a
 * toolbar. Color Input shows this element in a panel behind a text field.
 *
 * The saturation and brightness square is two `<input type="range">` elements,
 * laid over the square and made invisible, and the handle is drawn from their
 * values. The keyboard behavior, the announcements, and the touch targets come
 * from the platform, and there is no `role="application"`.
 *
 * The picker works in HSB and derives the value from it. A value set from
 * outside is read into the model once. Black is `brightness: 0`, which has no
 * hue or saturation, so a model read back from the value would turn red into
 * gray after you drag to the bottom of the square and back.
 *
 * The square is one tab stop. In it, the up and down arrows move brightness
 * and the left and right arrows move saturation, by ten with Shift. PageUp and
 * PageDown move brightness by ten, and Home and End move saturation by ten,
 * turned on a right-to-left page as the arrows are, as React Aria's ColorArea
 * does. The picker sends `input` as the color moves and `change`
 * when a drag, a key, a typed value or a preset settles it, as
 * `<input type="color">` does.
 *
 * A screen reader hears the color's name, such as "vibrant red", after the two
 * numbers on the square and after the number on the hue ramp, and each preset
 * is named by its color. The opacity ramp is heard as a percentage. Set
 * `color-words` to speak the names in another language.
 *
 * `label` names the picker, which is then a group with that name, and the
 * square's ramps say it before their own, as "Brand, Saturation". `hint`
 * writes help under the picker, which the square, the ramps and the value
 * field are described by. Inside Color Input the field carries both.
 *
 * The presets are a listbox with the current color selected, and one tab
 * stop. The arrow keys move between them, Home and End go to the ends, and
 * Enter, Space or a press chooses one.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Color, ColorArea, Swatch picker
 * @documentation https://fusion.dev/helix/components/color-picker
 *
 * @slot eyedropper-icon - The icon on the eyedropper button, usually a dropper.
 * @slot hint - Help under the picker, for content richer than the `hint` text.
 * @slot label - The name above the picker, for content richer than the `label` text.
 *
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the color changes. Cancelable: call `preventDefault()` to keep the current color.
 * @event {HelixCopyEvent} helix-copy - Fired when the color is put on the clipboard.
 * @event {HelixSampleEndEvent} helix-sample-end - Fired when the eyedropper closes, whether or not a color was taken.
 * @event {HelixSampleStartEvent} helix-sample-start - Fired as the eyedropper opens. Hide anything that covers the page.
 * @event {Event} input - Fired after the value changes.
 *
 * @csspart actions - The group holding the eyedropper and the syntax toggle.
 * @csspart channel - One ramp.
 * @csspart channel-control - The range input.
 * @csspart channel-feedback - The error message for a ramp.
 * @csspart channel-field - The row that holds a ramp's control and its readout.
 * @csspart channel-hint - The help text under the track, shown while there is no error.
 * @csspart channel-label - The label above the track.
 * @csspart channel-marker - One mark on the track.
 * @csspart channel-marker-label - The value a mark stands at, when `marker-labels` is set.
 * @csspart channel-markers - The row of marks along the track.
 * @csspart channel-output - The current value, shown beside the track.
 * @csspart channel-thumb - A ramp's thumb box, which holds no content in a picker.
 * @csspart channel-thumbs - The layer over a ramp's track that holds its thumb box.
 * @csspart channel-tooltip - A ramp's value in a bubble, where a ramp shows one.
 * @csspart channel-tooltips - The layer over a ramp's track that holds its bubble.
 * @csspart channels - The ramps beside the sample.
 * @csspart controls - The row under the square.
 * @csspart eyedropper - The control that samples a color from the screen.
 * @csspart eyedropper-button - The button inside `eyedropper`.
 * @csspart eyedropper-live - The live region of the button inside `eyedropper`, which says its pending label.
 * @csspart eyedropper-spinner - The ring the eyedropper button turns while it is pending.
 * @csspart eyedropper-text - The words on the button inside `eyedropper`, trimmed to their capitals and baseline.
 * @csspart feedback - The message under the picker: `feedback`, or what is wrong with the answer once the picker is marked invalid.
 * @csspart field - One channel's number field with its label, in `channel-fields`.
 * @csspart field-input - The number input in a channel's field.
 * @csspart field-label - The name above a channel's number input.
 * @csspart fields - The row of channel number fields, in `channel-fields`.
 * @csspart footer - The row holding the value and the tools.
 * @csspart format - The control that changes the syntax the value is written in.
 * @csspart format-button - The button inside `format`.
 * @csspart format-live - The live region of the button inside `format`, which says its pending label.
 * @csspart format-spinner - The ring the syntax button turns while it is pending.
 * @csspart format-text - The words on the button inside `format`, trimmed to their capitals and baseline.
 * @csspart grid - The saturation and brightness square. Draw the mark that shows
 * where the color sits with `::part(grid)::after` in your stylesheet. The
 * square carries the two channels as `--color-picker-saturation` and
 * `--color-picker-brightness`, and this tier ships no CSS.
 * @csspart grid-brightness - The range input for the square's vertical axis.
 * @csspart grid-saturation - The range input for the square's horizontal axis.
 * @csspart hint - The help under the picker, while `hint` is set or the `hint` slot has content.
 * @csspart label - The name above the picker, while `label` is set or the `label` slot has content.
 * @csspart sample - A chip of the current color. Pressing it copies the value.
 * @csspart swatch - One preset, an option in the `swatches` listbox.
 * @csspart swatches - The row of presets, a listbox.
 * @csspart value - The text field that holds the color. It accepts a typed or pasted color.
 * @csspart wheel - The hue ring round the square, with `wheel`. Draw the ring and its mark from `--color-picker-hue`.
 * @csspart wheel-hue - The range input behind the ring, which a reader turns with the keys.
 *
 * @cssproperty --color-picker-brightness - The chosen brightness, 0 to 100, as a percentage.
 * @cssproperty --color-picker-hue - The chosen hue, 0 to 360, unitless.
 * @cssproperty --color-picker-saturation - The chosen saturation, 0 to 100, as a percentage.
 * @cssproperty --color-picker-swatch - The color a chip shows: the current color on the sample, and the preset's color on each preset.
 *
 * @cssstate copied - The moment after the sample copies the value, while it says `copied-label`.
 * @cssstate dragging - While a pointer drags the square's handle.
 * @cssstate invalid - While `invalid` is set or `feedback` says what is wrong.
 * @cssstate sampling - While the eyedropper is open over the screen.
 */
@customElement('helix-headless-color-picker')
export class HelixHeadlessColorPicker extends MixinPickerFeedback(
  MixinControllerValue(HelixFormElement),
) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-color-picker': { hueLabel: 'Farbton' } })`.
   */
  static words = 'helix-color-picker'

  /**
   * Whether the color carries an alpha channel.
   *
   * Off by default, because it widens every value written, and a consumer who
   * did not ask for transparency should not have to strip a byte off each one.
   */
  @property({ reflect: true, type: Boolean })
  alpha = false

  /**
   * What the browser may autofill in the text field, as a platform token.
   *
   * **Defaults to `off`, which is not the platform's default and is the
   * point.** The field holds a color, so a browser offering to fill it with a
   * saved address is competing for the same keystrokes as the square and the
   * ramps. A consumer who wants autofill can still ask.
   */
  @property()
  autocomplete = 'off'

  /**
   * The message shown when the value is text that is not a color.
   */
  @words
  @property({ attribute: 'bad-input-message' })
  badInputMessage = 'Enter a color, like #ff0000, rgb(255 0 0) or hsl(0 100% 50%).'

  /**
   * What the blue channel's field is called, in `channel-fields`.
   */
  @words
  @property({ attribute: 'blue-label' })
  blueLabel = 'Blue'

  /**
   * What the square's vertical ramp is called.
   *
   * **Every word the picker speaks is a property**, so a page in another
   * language hears its own rather than English between its own labels.
   */
  @words
  @property({ attribute: 'brightness-label' })
  brightnessLabel = 'Brightness'

  /**
   * Whether the picker shows a number field for each channel of the color, as
   * React Aria's ColorField does with `channel`: red, green and blue for hex
   * and rgb, hue, saturation and lightness for hsl, hue, saturation and
   * brightness for hsb, lightness, chroma and hue for oklch, and the opacity
   * with `alpha`.
   *
   * For a reader who has the numbers from a brand guide, and for a keyboard,
   * where typing 128 is quicker than holding an arrow key. The fields follow
   * the syntax the format toggle sets.
   */
  @property({ attribute: 'channel-fields', type: Boolean })
  channelFields = false

  /**
   * What the chroma channel's field is called, in `channel-fields` with
   * oklch.
   */
  @words
  @property({ attribute: 'chroma-label' })
  chromaLabel = 'Chroma'

  /**
   * The words a color's name is spoken in, as JSON keyed by their English,
   * such as `{"red": "rot", "vibrant": "kräftiges"}`.
   *
   * **A color is named the way React Aria names one**, as "vibrant red" or
   * "dark grayish blue", and the keys are the ones `@react-stately/color`
   * translates, so a table a page already has for it can be handed over whole.
   * `colorName` and `transparentColorName` are the two sentences that put the
   * words together. A word left out is spoken in English.
   *
   * The name follows the numbers on the square, follows the number on the hue
   * ramp, and names each preset, so a reader who cannot see the color hears
   * which one it is.
   */
  @property({ attribute: 'color-words', converter: wordsConverter })
  colorWords: Partial<ColorWords> = {}

  /**
   * The text the sample shows for a moment after it copies the value.
   */
  @words
  @property({ attribute: 'copied-label' })
  copiedLabel = 'Copied'

  /**
   * The name of the sample, which copies the value. `{value}` is replaced with
   * the color.
   */
  @words
  @property({ attribute: 'copy-label' })
  copyLabel = 'Copy {value}'

  /**
   * What the eyedropper is called.
   */
  @words
  @property({ attribute: 'eyedropper-label' })
  eyedropperLabel = 'Sample a color from the screen'

  /**
   * The syntax the value is written in: `hex`, `rgb`, `hsl`, `oklch`, or
   * `hsb`.
   *
   * Only what is written. Everything is read whatever this says, so a picker on
   * `hex` still takes an `rgb()` or an `oklch()` handed to it and stores the
   * hex for it. `oklch` writes the sRGB color the picker holds, such as
   * `oklch(62.8% 0.258 29.2)`; a color outside sRGB that is handed in is
   * clipped to it. `hsb` writes the picker's own model, `hsb(0, 100%, 100%)`,
   * as React Aria's and Zag's color strings do. It is not CSS, so the toggle
   * walks the other four.
   */
  @property({ reflect: true })
  format?: ColorFormat

  /**
   * What the syntax toggle is called, with `{format}` filled in.
   */
  @words
  @property({ attribute: 'format-label' })
  formatLabel = 'Syntax: {format}. Change it.'

  /**
   * What the green channel's field is called, in `channel-fields`.
   */
  @words
  @property({ attribute: 'green-label' })
  greenLabel = 'Green'

  /**
   * Help under the picker, such as what the color is used for. The `hint`
   * slot takes richer content.
   */
  @property()
  hint = ''

  /**
   * What the hue channel is called.
   */
  @words
  @property({ attribute: 'hue-label' })
  hueLabel = 'Hue'

  /**
   * The name above the picker, such as "Brand color". The picker is then a
   * group with this name. The `label` slot takes richer content.
   */
  @property()
  label = ''

  /**
   * What the lightness channel's field is called, in `channel-fields` with
   * hsl and oklch.
   */
  @words
  @property({ attribute: 'lightness-label' })
  lightnessLabel = 'Lightness'

  /**
   * Hides the eyedropper. Without it, the eyedropper appears in browsers that
   * support one.
   */
  @property({ attribute: 'no-eyedropper', type: Boolean })
  noEyedropper = false

  /**
   * Hides the syntax toggle, so the format cannot be changed.
   */
  @property({ attribute: 'no-format', type: Boolean })
  noFormat = false

  /**
   * Hides the text field that holds the value. Use it when the value is shown
   * elsewhere.
   *
   * The row reads the color as text and lets it be typed or pasted, which is
   * what makes this element complete standing on a page: a square and two ramps
   * can build a color and cannot state one, and a reader who has a hex already
   * should not have to find it by dragging.
   *
   * Color Input sets this, because its field is that input. Two editable fields
   * for one value is the outcome worth avoiding: two places to type, and no
   * answer to which one is authoritative or which has the caret. Do not close it
   * the other way round, with Color Input dropping its own field: the value
   * would then be unreadable and unpasteable without opening a panel.
   */
  @property({ attribute: 'no-value', type: Boolean })
  noValue = false

  /**
   * What the opacity channel is called, where `alpha` offers one.
   */
  @words
  @property({ attribute: 'opacity-label' })
  opacityLabel = 'Opacity'

  /**
   * What the row of `swatches` is called.
   */
  @words
  @property({ attribute: 'presets-label' })
  presetsLabel = 'Presets'

  /**
   * Makes the color read-only. The value is still submitted with the form.
   *
   * **Enforced by refusing every request in one place**, which is the seam this
   * component already has: `requestValue` is what every path here comes through,
   * and gating it once is what stops the next call site from being written
   * without the check.
   *
   * Not `disabled`, which is the confusion worth naming: a disabled control
   * submits nothing and leaves the tab order, and a read-only one submits its
   * value and stays reachable, which is what a form showing a color somebody
   * else set needs.
   *
   * **One gate is not enough here, and the second is `move`.** This picker
   * holds a model beside its value, which Date Picker and Time Picker do not:
   * `moved` is the HSB the square is drawn from, and it is written before the
   * value is requested. Gating only the request would leave the square under
   * the reader's pointer and the value where it was, which is a control that
   * refuses and looks like it accepted.
   *
   * **Two controls are refused whole rather than at either seam**, because
   * both do something before they ask. The syntax toggle rewrites the value, so
   * letting it move would show `rgb` over a hex it is no longer allowed to
   * restate. The eyedropper clears the screen and runs a system sampler, so
   * letting it open would take a color from the reader and drop it.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * What the red channel's field is called, in `channel-fields`.
   */
  @words
  @property({ attribute: 'red-label' })
  redLabel = 'Red'

  /**
   * Requires a color before the form can submit.
   *
   * **A color is exactly as requirable as a date**, which is the comparison
   * that settles it: this element extends `HelixFormElement`, carries `name`
   * and reports its value, so a consumer writing `<helix-headless-color-picker
   * name="brand" required>` inside a form has every reason to expect the form
   * to refuse an empty one. Its two siblings in the same composition position,
   * Date Picker and Time Picker, both check it.
   *
   * Written out rather than taken from `MixinField`, for the reason those two
   * record: the mixin brings a label, a hint and a feedback region, and this is
   * a panel composed *into* a field that already has all three, so taking it
   * would give one control two of each. What is left is the validity call and
   * the anchor the browser points its bubble at.
   *
   * **Text that is not a color is bad input**, so a form does not submit
   * `#00` from a half-typed value. The picker marks it, and says
   * `badInputMessage` under itself, once the reader leaves the value field or
   * presses Enter, and a missing color once the reader has committed one or a
   * form has refused the picker. Color Input shows its own message against the
   * field the reader typed into.
   */
  @property({ reflect: true, type: Boolean })
  required = false

  /**
   * What the square's horizontal ramp is called.
   */
  @words
  @property({ attribute: 'saturation-label' })
  saturationLabel = 'Saturation'

  /**
   * What a screen reader hears for the square's place, the color's two
   * numbers and its name, on whichever of its two inputs it is on.
   * `{first}` is `saturation` or `brightness`, the input's own channel, which
   * is said first, so each order is its whole sentence. `{saturation}` and
   * `{brightness}` are shares from 0 to 1, written as percentages with
   * `number, percent`, `{saturationLabel}` and `{brightnessLabel}` the
   * channels' names, and `{name}` the color's, such as "vibrant red".
   */
  @words
  @property({ attribute: 'square-text' })
  squareText =
    '{first, select, brightness {{brightnessLabel} {brightness, number, percent}, {saturationLabel} {saturation, number, percent}, {name}} other {{saturationLabel} {saturation, number, percent}, {brightnessLabel} {brightness, number, percent}, {name}}}'

  /**
   * Colors offered under the picker, as a comma-separated list.
   */
  @property()
  swatches = ''

  /**
   * What the group holding the eyedropper and the syntax toggle is called.
   */
  @words
  @property({ attribute: 'tools-label' })
  toolsLabel = 'Color tools'

  /**
   * What the text field holding the value is called.
   */
  @words
  @property({ attribute: 'value-label' })
  valueLabel = 'Color'

  /**
   * The message shown when a color is required and none is chosen.
   *
   * **Every sentence a control raises in the browser's bubble is a property**,
   * named for the validity flag it reports, so a form in another language
   * speaks it. Unset is the sentence registered for the page's language, then
   * the English.
   */
  @words
  @property({ attribute: 'value-missing-message' })
  valueMissingMessage = 'Choose a color.'

  /**
   * Draws the hue as a wheel around the square, in place of the hue ramp, as
   * React Aria's ColorWheel sits round its ColorArea.
   *
   * The ring is one stop, a slider a reader turns with the arrow keys, Home
   * and End, the same way round in either writing direction, and a press or a
   * drag on it takes the hue in that direction. Off, the picker keeps its
   * ramp.
   */
  @property({ reflect: true, type: Boolean })
  wheel = false

  /**
   * The color the reader has moved to, or nothing while they have moved none.
   *
   * Held rather than re-read, which is the whole point: see the class
   * description. Cleared whenever a value arrives from anywhere else, so the
   * next reading comes from that value instead.
   */
  @state()
  private moved: Color | undefined

  /**
   * Whether this browser can sample a color off the screen.
   *
   * Settled before each render rather than at construction, because a server
   * has no `EyeDropper` and a button that ships in the markup and does nothing
   * in Firefox is worse than one that is never offered. Not while hydrating a
   * server's markup, which was rendered without it.
   */
  @state()
  private sampling = false

  /** The preset the reader was last on, which holds the row's one tab stop. */
  @state()
  private swatchAt: number | undefined

  /**
   * The children in a slot, read off the children rather than heard from
   * `slotchange`: a declarative shadow root fires that before anything
   * listens, so a served picker kept its label hidden.
   */
  private slottedIn(name: 'hint' | 'label'): Element[] {
    return this.knownChildren.filter((child) => child.slot === name)
  }

  private readonly handleNamingSlot = (): void => {
    this.requestUpdate()
  }

  /** The picker's own name, from `label` or the `label` slot's words. */
  private get named(): string {
    return (
      this.label ||
      this.slottedIn('label')
        .map((child) => child.textContent ?? '')
        .join(' ')
        .trim()
    )
  }

  /** Whether help is shown under the picker. */
  private get hinted(): boolean {
    return this.hint !== '' || this.slottedIn('hint').length > 0
  }

  /** The ids a control in the picker is described by: the help, then the message. */
  private get describedBy(): string | typeof nothing {
    const ids = [this.hinted ? 'hint' : '', this.said === '' ? '' : 'feedback'].filter(Boolean)
    return ids.length > 0 ? ids.join(' ') : nothing
  }

  /**
   * Whether the reader is typing into the value field, between the first
   * keystroke and the `change` that ends it.
   *
   * Half-typed text is rarely a color: `#00ff00` passes through `#0` and
   * `#00ff0` on the way. So text that is not a color is refused once the
   * reader leaves the field or presses Enter, and not on every keystroke.
   */
  @state()
  private typing = false

  /**
   * Text in the value field that is not a color, or undefined while the field
   * holds the value.
   *
   * **Kept in the field and out of the value**, as a native number field keeps
   * "12e": the text stays where the reader can correct it, the value stays the
   * last color, and the picker reports `badInput` until the text is a color or
   * the value moves. Measured before this: typed "nonsense" became the value,
   * so a form read `brand=nonsense` and the square had no color to show.
   */
  @state()
  private draft: string | undefined = undefined

  /**
   * A required picker with no color is missing, and text that is not a color
   * is refused, once the reader has finished typing it. See
   * `MixinPickerFeedback.marked`.
   *
   * Measured before this: typed "nonsense" and a required picker its form
   * refused both failed `checkValidity()` while `:state(invalid)` stayed off,
   * the value field had no `aria-invalid`, and nothing was said.
   */
  protected override get failure(): PickerFailure | undefined {
    if (this.draft !== undefined) {
      return this.typing ? undefined : 'refused'
    }
    if (this.value === '') {
      return this.required ? 'missing' : undefined
    }
    return parseColor(this.value) === null ? 'refused' : undefined
  }

  /**
   * The line under the picker: `feedback`, or, where the picker is marked by
   * its own validation, what is wrong.
   */
  private get said(): string {
    if (this.feedback !== '') {
      return this.feedback
    }
    if (!this.marked || this.invalid) {
      return ''
    }
    const failure = this.failure
    return failure === 'refused'
      ? this.badInputMessage
      : failure === 'missing'
        ? this.valueMissingMessage
        : ''
  }

  /**
   * A reset ends any typing and takes back text that was not a color, so the
   * field shows the color the reset put back.
   */
  override formResetCallback(): void {
    super.formResetCallback()
    this.typing = false
    if (this.draft !== undefined) {
      this.draft = undefined
      const field = this.partNamed('value') as HTMLInputElement | null
      if (field) {
        field.value = this.value
      }
    }
  }

  /**
   * The line `said` holds, or nothing while it is empty. `role="alert"`, as
   * every field's feedback line has, so the message is announced when it
   * appears.
   */
  protected override renderPickerFeedback(): TemplateResult | typeof nothing {
    const said = this.said
    return said === '' ? nothing : html`<p part="feedback" id="feedback" role="alert">${said}</p>`
  }

  /** Whether a pointer is dragging the square's handle, said as `:state(dragging)`. */
  @state()
  private dragging = false

  /** Whether the eyedropper is open, said as `:state(sampling)`. */
  @state()
  private picking = false

  /**
   * Whether the value on this element was produced here.
   *
   * The one bit that keeps the model from being overwritten by the value it just
   * produced. Without it, dragging to the bottom of the square writes black,
   * which reads back as hue 0 and saturation 0, and the next drag starts gray.
   */
  private owned = false

  /** Dragged and keyed, so a move is announced as `input` alone. See `announcesInput`. */
  protected override readonly announcesInput = true

  /** Whether the value has moved since `change` was last sent. */
  private unsettled = false

  /**
   * Sends `change` for a value that has settled, where it moved.
   *
   * Measured before this: a six-step drag sent six `change` events, so a
   * consumer saving on `change`, as they would for `<input type="color">`,
   * saved on every frame.
   */
  private settle(): void {
    if (this.unsettled) {
      this.unsettled = false
      this.announceChange()
    }
  }

  /** The current color: the last one moved to, the value, or the start color. */
  get color(): Color {
    /* `settled` between the value and the start, so a half-typed value leaves
       the square where the last whole one put it rather than throwing it back to
       red. Only reached where the value itself is not a color. */
    return this.moved ?? parseColor(this.value) ?? parseColor(this.settled) ?? COLOR_START
  }

  /**
   * Whether the tools row holds anything at all.
   *
   * The group is withheld rather than rendered empty, because it is an element
   * with a role and a name: an empty group labeled "Color tools" announces
   * nothing, and the footer cannot tell it is empty either, so the row kept its
   * padding with nothing in it.
   */
  private get tools(): boolean {
    return (this.sampling && !this.noEyedropper) || !this.noFormat
  }

  /**
   * The presets, as written, with anything that is not a color dropped.
   *
   * Split on the commas between colors and never inside one, so
   * `rgba(34,197,94,.5)` stays one swatch rather than four fragments none of
   * which parses.
   */
  private get presets(): string[] {
    return colorPresets(this.swatches)
  }

  /**
   * The last value that was a color.
   *
   * Half-typed input reaches the row on every keystroke and most of it is not a
   * color, so the square is given the last thing that was one. Typing `#00ff00`
   * a character at a time goes `#`, `#0`, `#00`, `#00f`, `#00ff`, `#00ff0`,
   * `#00ff00`: two of those are colors and the ones between are not, so without
   * this the square walks red, blue, red, green. Color Input keeps the same
   * guard for its own field, each local to the input it protects.
   */
  private settled = ''

  /** Takes what was typed, and lets the square follow only a whole color. */
  private readonly handleValueInput = (event: Event): void => {
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
    /* The field already carries `readonly`, so this is the second lock rather
       than the first: it covers an `input` a consumer's own script dispatched. */
    if (this.readOnly) {
      return
    }
    const typed = (event.target as HTMLInputElement).value
    this.typing = true
    const parsed = parseColor(typed)
    /* Text that is not a color stays in the field and out of the value. See
       `draft`. Empty text is no color at all, which is a value. */
    if (!parsed && typed.trim() !== '') {
      this.draft = typed
      this.sync()
      return
    }
    this.draft = undefined
    if (parsed) {
      this.moved = parsed
      // Owned only where the value moves, for the reason `move` gives.
      this.owned = typed !== this.value
    }
    this.requestValue(typed)
  }

  /** Blocks every change while `readOnly` is set. */
  override requestValue(next: string): boolean {
    if (this.readOnly) {
      return false
    }
    const before = this.value
    const taken = super.requestValue(next)
    if (taken && this.value !== before) {
      this.unsettled = true
    }
    return taken
  }

  /** Moves part of the model and announces the value that follows from it. */
  private readonly move = (next: Partial<Color>): void => {
    /* Before the model is touched, not after: the square is drawn from `moved`
       rather than from the value, so a refusal taken only at `requestValue`
       would move the handle and leave the value behind it. See `readOnly`. */
    if (this.readOnly) {
      return
    }
    const before = this.moved
    this.moved = { ...this.color, ...next }
    const value = formatColor(this.moved, this.format ?? 'hex', this.alpha)
    /* **Owned only where the value moves.** A move that hands back the value
       already there, as a drag past a corner does, starts no update to clear the
       flag, so the next value set from outside was taken for this element's own:
       after a reset, the square stayed where the drag ended. */
    this.owned = value !== this.value
    /* A refusal puts the square back where the value still is, which is the
       same promise `readOnly` keeps above, made for a listener that refused. */
    if (!this.requestValue(value)) {
      this.moved = before
      this.owned = false
    }
  }

  /**
   * Copying the value, which is the one thing here worth taking away.
   *
   * A reader who has just built a color wants it in a stylesheet, and the
   * alternative is selecting text out of a field that may not be on screen. The
   * chip is the obvious target: it is the color, at the size of a control.
   *
   * The controller rather than four lines here, because Copy Button shares
   * everything about this that is easy to get wrong: the write, the
   * confirmation, the timer that ends it, the event, and a failure that is
   * correctly silent.
   */
  private readonly copier = new CopyController(this)

  /** Takes a preset, in this picker's syntax rather than as the preset spelled it. */
  private readonly handleSwatch = (preset: string): void => {
    const parsed = parseColor(preset)
    if (!parsed) {
      return
    }
    /* Written from the preset's own numbers where its syntax has them, as a
       channel field writes: through the model, `#00aa00` came out `#00ab00`,
       the brightness being held as a whole percentage. */
    const format = this.format ?? 'hex'
    const fields = channelFields(preset, parsed, format, this.alpha)
    const first = fields[0]
    const exact = first && writeChannel(fields, format, this.alpha, first.channel, first.value)
    if (exact) {
      this.takeWritten(exact)
    } else {
      this.move(parsed)
    }
    this.settle()
  }

  /**
   * The arrows, Home and End in the presets: focus moves, and nothing is
   * chosen until Enter, Space or a press, as in React Aria's swatch picker.
   *
   * Core's roving set, as Legend's toggles are: the arrows follow the line of
   * text, so the row reverses in a right-to-left page, Up and Down are the
   * previous and the next since the row wraps onto lines, and focus stops at
   * the ends, since a row of colors is no ring. A press from anywhere else in
   * the picker is not the row's to move.
   */
  protected readonly swatchKeys = new KeyboardNavigationController(this, {
    items: () =>
      [
        ...(this.renderRoot?.querySelectorAll<HTMLElement>('[part="swatches"] [part="swatch"]') ??
          []),
      ].map((swatch, index) =>
        focusItemOf(swatch, {
          focus: () => {
            this.swatchAt = index
            swatch.focus()
          },
          owns: (node) => node === swatch,
        }),
      ),
    origin: 'focus',
    selects: () => false,
    wrap: false,
  })

  /** Walks the format on, and rewrites the value in it. */
  private readonly handleFormat = (): void => {
    /* Refused whole rather than half. Walking the syntax on is a rewrite of the
       value, so a read-only picker that let the toggle move would show `rgb`
       over a hex it was no longer allowed to restate. */
    if (this.readOnly) {
      return
    }
    this.format = nextColorFormat(this.format)
    if (this.value !== '') {
      this.move({})
      this.settle()
    }
  }

  /**
   * Samples a color from anywhere on the screen.
   *
   * `helix-sample-start` and `helix-sample-end` bracket it, because whatever is
   * holding this picker may need to get out of the way: `EyeDropper` takes the
   * pointer over, and a floating panel left up during it is one the reader
   * cannot dismiss and may well be trying to sample from underneath. This
   * element cannot know it is in a panel, so it says what it is doing and lets
   * whatever does know decide.
   */
  private readonly handleEyeDropper = async (): Promise<void> => {
    /* Refused whole, the way the syntax toggle is, and for a sharper version of
       the same reason. The two events below are a request to whatever is
       holding this picker to get off the screen, and `EyeDropper` takes the
       pointer over the whole page: gating this at `move` alone would clear a
       panel, run a system sampler, take a color from the reader and drop it,
       which is the control that refuses and looks like it accepted. */
    if (this.readOnly) {
      return
    }
    const Dropper = (globalThis as { EyeDropper?: EyeDropperConstructor }).EyeDropper
    if (!Dropper) {
      return
    }
    this.dispatchEvent(new HelixSampleStartEvent())
    this.picking = true
    try {
      const { sRGBHex } = await new Dropper().open()
      const parsed = parseColor(sRGBHex)
      if (parsed) {
        // A sample carries no alpha, so whatever was set is kept.
        this.move({ ...parsed, alpha: this.color.alpha })
        this.settle()
      }
    } catch {
      /* Canceling is how this is normally left, and the platform reports it as
         a rejection. There is nothing to recover from and nothing to say. */
    }
    this.picking = false
    this.dispatchEvent(new HelixSampleEndEvent())
  }

  /**
   * Dragging in the square.
   *
   * The two ranges are the state, so this reads a point and writes to them
   * rather than keeping a position of its own. Pointer capture, so a drag that
   * leaves the square keeps going: leaving and coming back is how a reader
   * reaches a corner, and without it the handle stops wherever the pointer left.
   */
  private readonly handleGridPointer = (event: PointerEvent): void => {
    /* Off means off to a pointer too. Measured before this: a disabled picker,
       by its own attribute or a disabled fieldset, took a click and a drag in
       the square and changed its value. */
    if (this.isDisabled) {
      return
    }
    const grid = event.currentTarget as HTMLElement
    if (event.type === 'pointerup' || event.type === 'pointercancel') {
      this.dragging = false
      this.settle()
      return
    }
    if (event.type === 'pointerdown') {
      this.dragging = true
      capturePointer(grid, event.pointerId)
      /* So the keyboard carries on from where the pointer left off. Without
         scrolling: the square is under the pointer already, and a scroll
         here moved it under a press that was read against where it had been. */
      this.partNamed('grid-saturation')?.focus({ preventScroll: true })
    } else if (!grid.hasPointerCapture(event.pointerId)) {
      return
    }
    event.preventDefault()
    const box = grid.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) {
      return
    }
    /* The pointer is physical, so the line is turned here, where the handle
       and the saturation range are logical already. */
    this.move(areaAt(event.clientX, event.clientY, box, isRtl(grid)))
  }

  /**
   * A press or a drag on the hue wheel: the hue in that direction from its
   * center. A press in the square inside it is the square's.
   */
  private readonly handleWheelPointer = (event: PointerEvent): void => {
    const wheel = event.currentTarget as HTMLElement
    const grid = this.partNamed('grid')
    if (this.isDisabled || (grid && event.composedPath().includes(grid))) {
      return
    }
    /* Whether or not the capture took, as the square settles: a pointer the
       browser would not capture still moved the hue, and `change` was lost. */
    if (event.type === 'pointerup' || event.type === 'pointercancel') {
      this.settle()
      return
    }
    if (event.type === 'pointerdown') {
      capturePointer(wheel, event.pointerId)
      this.partNamed('wheel-hue')?.focus({ preventScroll: true })
    } else if (!wheel.hasPointerCapture(event.pointerId)) {
      return
    }
    event.preventDefault()
    const box = wheel.getBoundingClientRect()
    if (box.width > 0 && box.height > 0) {
      this.move({ hue: hueAt(event.clientX, event.clientY, box) })
    }
  }

  protected override firstUpdated(changed: import('lit').PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /**
   * Reports the color to the form.
   *
   * **The one thing a form-associated element owes, and this element owed it
   * from the start without paying.** It extends `HelixFormElement`, takes
   * `MixinControllerValue` and carries `name`, so a consumer writing
   * `<helix-headless-color-picker name="brand">` inside a form has every reason
   * to expect an entry, and the form carried none: no error, nothing in the
   * markup to look at, and a field silently missing from the submission. Its
   * two siblings in the same composition position, Color Input and Slider, both
   * report.
   *
   * `null` rather than an empty string where there is no color, which is the
   * difference between a control that submits nothing and one that submits a
   * blank.
   *
   * The verdict goes beside it, because `required` is this element's own claim
   * and nothing else can answer it: a picker standing on a page has no field
   * around it to check on its behalf. What it is *not* is a second opinion on
   * everything else, which is why bad input is left to Color Input. See
   * `required`.
   */
  private sync(): void {
    internalsOf(this).setFormValue(this.value === '' ? null : this.value)
    this.reportRequired()
  }

  /**
   * Moves the square from the keyboard, both axes from either of its inputs.
   *
   * The square is two native ranges, and a native range maps every arrow to
   * its own one axis: on the saturation input, ArrowUp moved the handle
   * sideways. Here the vertical keys move brightness and the horizontal keys
   * move saturation, turned on a right-to-left page as the pointer is, which is
   * what React Aria's ColorArea does. Shift makes an arrow a step of ten, and
   * Home and End are saturation's steps of ten, as PageUp and PageDown are
   * brightness's.
   */
  private readonly handleAreaKeydown = (event: KeyboardEvent): void => {
    if (this.isDisabled || this.readOnly) {
      return
    }
    const next = areaKeyed(this.color, {
      key: event.key,
      rtl: isRtl(this),
      shift: event.shiftKey,
    })
    if (!next) {
      return
    }
    event.preventDefault()
    this.move(next)
    this.settle()
  }

  /**
   * Reports "required and empty", or clears it.
   *
   * Anchored on the square, which is where a reader would go to answer: it is
   * the first control in the panel and the one `focus` puts the keyboard on, so
   * the browser's bubble points at the thing to do rather than at the row that
   * states the result.
   */
  private reportRequired(): void {
    if (this.draft !== undefined) {
      internalsOf(this).setValidity(
        { badInput: true },
        this.badInputMessage,
        this.partNamed('value') ?? this.partNamed('grid') ?? undefined,
      )
      return
    }
    if (this.required && this.value === '') {
      internalsOf(this).setValidity(
        { valueMissing: true },
        this.valueMissingMessage,
        this.partNamed('grid') ?? undefined,
      )
      return
    }
    if (this.value !== '' && parseColor(this.value) === null) {
      internalsOf(this).setValidity(
        { badInput: true },
        this.badInputMessage,
        this.partNamed('value') ?? this.partNamed('grid') ?? undefined,
      )
      return
    }
    internalsOf(this).setValidity({})
  }

  protected override updated(changed: import('lit').PropertyValues): void {
    super.updated(changed)
    this.sync()
    if (changed.has('value')) {
      if (parseColor(this.value)) {
        this.settled = this.value
      }
      /* Let go only where the value came from somewhere else, so the getter
         reads that value instead. `owned` is cleared here rather than where it
         is set, so it covers exactly the one update this element caused. */
      if (this.owned) {
        this.owned = false
      } else {
        this.moved = undefined
      }
    }
  }

  /** Moves focus to the square. */
  override focus(options?: FocusOptions): void {
    this.partNamed('grid-saturation')?.focus(options)
  }

  /** What each channel's field is called, from the words a page gives. */
  private channelWord(channel: ChannelName): string {
    return {
      alpha: this.opacityLabel,
      blue: this.blueLabel,
      brightness: this.brightnessLabel,
      chroma: this.chromaLabel,
      green: this.greenLabel,
      hue: this.hueLabel,
      lightness: this.lightnessLabel,
      red: this.redLabel,
      saturation: this.saturationLabel,
    }[channel]
  }

  /**
   * Takes a number typed into a channel's field. A field emptied or holding
   * something that is not a number moves nothing, so a reader can clear it to
   * type afresh.
   */
  private readonly handleField = (channel: ChannelName, event: Event): void => {
    // Stopped for the reason `Input.handleInput` gives.
    event.stopPropagation()
    const typed = (event.target as HTMLInputElement).value
    if (typed.trim() === '') {
      return
    }
    const format = this.format ?? 'hex'
    const written = writeChannel(
      channelFields(this.value, this.color, format, this.alpha),
      format,
      this.alpha,
      channel,
      Number(typed),
    )
    if (written !== null) {
      this.takeWritten(written)
    }
  }

  /**
   * Takes a value written out whole, as `move` takes a part of the model: the
   * square follows it, keeping its hue where the value is a gray with none to
   * give, and a refusal puts the square back.
   */
  private takeWritten(next: string): void {
    const parsed = parseColor(next)
    if (this.readOnly || parsed === null) {
      return
    }
    const before = this.moved
    const hueless = parsed.saturation === 0 || parsed.brightness === 0
    this.moved = hueless ? { ...parsed, hue: this.color.hue } : parsed
    this.owned = next !== this.value
    if (!this.requestValue(next)) {
      this.moved = before
      this.owned = false
    }
  }

  /**
   * A number field for each channel, behind a seam the styled tier can move.
   *
   * `live` on the value, so a number put back inside its range, 300 for a byte,
   * is redrawn though the value it settles on is the one drawn before.
   */
  protected renderFields(color: Color): TemplateResult {
    return html`<div part="fields">
      ${channelFields(this.value, color, this.format ?? 'hex', this.alpha).map((field) => {
        const word = this.channelWord(field.channel)
        const name = this.channelName(word)
        /* The picker's name with the word the label shows, and the label
           alone where the picker has no name. */
        return html`<label part="field">
          <span part="field-label">${word}</span>
          <input
            part="field-input"
            type="number"
            aria-label=${name === word ? nothing : name}
            inputmode=${field.step < 1 ? 'decimal' : 'numeric'}
            min=${field.min}
            max=${field.max}
            step=${field.step}
            .value=${live(String(field.value))}
            ?disabled=${this.isDisabled}
            ?readonly=${this.readOnly}
            @input=${(event: Event) => this.handleField(field.channel, event)}
            @change=${(event: Event) => {
              event.stopPropagation()
              this.settle()
              this.requestUpdate()
            }}
          />
        </label>`
      })}
    </div>`
  }

  /**
   * A channel's name, after the picker's own where the picker has one.
   *
   * **Every channel the same way**, as React Aria's color area names its own:
   * "Brand, Saturation" says which picker on a page with two. The square's
   * axes and the wheel took the picker's name, and the hue and opacity ramps
   * and the number fields did not, so two pickers on a page gave two sliders
   * named "Hue", measured in Chromium's tree.
   */
  protected channelName(channel: string): string {
    const owner = this.getAttribute('aria-label')?.trim() || this.named
    return owner ? `${owner}, ${channel}` : channel
  }

  /**
   * One of the ramps under the square.
   *
   * `protected` rather than `private`, the method being the seam a tier above
   * renders its own ramp through. `spoken` is what a screen reader says for the
   * ramp's value, with `{value}` filled in, and empty says the number alone.
   */
  protected renderChannel(
    channel: 'alpha' | 'hue',
    label: string,
    max: number,
    value: number,
    spoken = '',
  ): TemplateResult {
    return html`<${this.tag('slider')}
      part="channel"
      exportparts="control: channel-control, feedback: channel-feedback, field: channel-field,
        hint: channel-hint, label: channel-label, marker: channel-marker,
        marker-label: channel-marker-label, markers: channel-markers, output: channel-output,
        thumb: channel-thumb, thumbs: channel-thumbs, tooltip: channel-tooltip,
        tooltips: channel-tooltips"
      data-channel=${channel}
      aria-invalid=${this.marked ? 'true' : nothing}
      label=${this.channelName(label)}
      max=${max}
      min="0"
      value-text=${spoken || nothing}
      .value=${String(value)}
      ?disabled=${this.isDisabled}
      @input=${(event: Event) => this.takeChannel(channel, event)}
      @change=${(event: Event) => {
        this.takeChannel(channel, event)
        this.settle()
      }}
      @helix-before-change=${this.keepChannelRequest}
    ></${this.tag('slider')}>`
  }

  /**
   * A slider's own request, kept inside.
   *
   * **The slider is a Helix control, so it asks before it moves**, with
   * `helix-before-change` carrying its number, and that event is composed. Let
   * out, it reached a consumer listening on this element as though the picker
   * had asked for a hue of 120 or an alpha of 0 as its color, which Color
   * Input took for its value and the theme builder then failed to read as a
   * brand. What this element asks for is a color, and it asks through `move`.
   * Not refused, only kept: the slider applies, and `takeChannel` reads it.
   */
  private readonly keepChannelRequest = (event: Event): void => {
    event.stopPropagation()
  }

  /**
   * One axis of the area, taken the way `takeChannel` takes a rail.
   *
   * **Named rather than inline because of the first line.** The `<input
   * type="range">` behind each axis sends its own composed `input`, which
   * reaches a consumer listening on this element beside this element's own
   * unless it is stopped: a consumer dragging the area receives the range's
   * event and not this component's.
   */
  private takeArea(axis: 'brightness' | 'hue' | 'saturation', event: Event): void {
    event.stopPropagation()
    const control = event.target as HTMLInputElement
    if (this.readOnly) {
      this.putBack(control, this.color[axis])
      return
    }
    this.move({ [axis]: Number(control.value) })
  }

  /**
   * Returns a control that moved itself to what the model still holds.
   *
   * **A refusal has to undo something, and here it is a handle.** Every other
   * control in this picker is drawn from the model, so refusing the change
   * leaves the picture right on its own. The two area ranges and the two
   * channel sliders are not: each moved before it announced, and each is bound
   * with `.value`, which lit dirty-checks against the value it last committed.
   * The model never changed, so that binding writes nothing and the handle
   * stays where the reader dragged it, on a control that refused. Carousel
   * settles the same question the same way: a refusal puts the track back on
   * the slide the index still holds.
   */
  private putBack(control: { value: string }, at: number): void {
    control.value = String(at)
  }

  /**
   * A channel's new value, read off the slider that just applied it.
   *
   * **Both native events, because a slider sends both and at different
   * moments.** It is one of the controls a reader edits continuously, so it
   * announces `input` all the way through a drag and `change` when the drag
   * ends. Listening only for the commit leaves the picker deaf while a handle
   * moves, and the hue and alpha handles do not move at all.
   *
   * **Read off the target rather than out of a detail.** Do not bind `Input`
   * and `helix-change` and take the proposed value out of the event: those are
   * requests, announcing what the slider is *about* to do, before anything has
   * moved and while a listener may still refuse it. The native pair fires after
   * the slider applied, so the value is on the element and cannot disagree with
   * it.
   *
   * Idempotent, so taking both costs nothing: the same value applied twice is
   * the same color.
   */
  private takeChannel(channel: 'alpha' | 'hue', event: Event): void {
    event.stopPropagation()
    const control = event.target as unknown as { value: string }
    if (this.readOnly) {
      this.putBack(control, this.color[channel])
      return
    }
    this.move({ [channel]: Number(control.value) })
  }

  /* `ariaInvalid` on the host through `ElementInternals`, the same route
     Date Picker takes and for the reason the whole library records: a `role` or a
     state written onto the host as an attribute is one a React consumer's
     server markup never had. **And on every control it draws**, since the host
     has no role and a reader is on a slider or the value: read from Chromium's
     tree, an invalid picker's sliders and value all reported `invalid: false`. */
  protected override willUpdate(changed: PropertyValues): void {
    /* A value from anywhere replaces text that was not a color, before the
       mixin reads `failure` to mark the picker. */
    if (changed.has('value')) {
      this.draft = undefined
    }
    super.willUpdate(changed)
    /* A group only where a page's `<label for>` names the picker, so the
       name has somewhere to be read. Unlabeled, the host stays without a
       role, as it is inside Color Input. */
    const outside = labelsOf(this)
    const named = this.named
    hostAria(internalsOf(this), {
      label: outside.length > 0 ? '' : named,
      labelledBy: outside,
      role: outside.length > 0 || named !== '' ? 'group' : '',
    })
    if (!this.hydrating) {
      this.sampling = 'EyeDropper' in globalThis
    }
    this.toggleState('copied', this.copier.copied)
    this.toggleState('dragging', this.dragging)
    this.toggleState('sampling', this.picking)
  }

  /**
   * The eyedropper and the swatch tools, which are a group of buttons, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template. The tag is interpolated
   * rather than written, so `tier` resolves it and one template serves both
   * tiers.
   */
  protected renderTools(): TemplateResult {
    return html`<${this.tag('button-group')} part="actions" label=${this.toolsLabel}>
                ${
                  this.sampling && !this.noEyedropper
                    ? html`<${this.tag('button')}
                        part="eyedropper"
      exportparts="button: eyedropper-button, live: eyedropper-live, spinner: eyedropper-spinner, text: eyedropper-text"
                        label=${this.eyedropperLabel}
                        ?disabled=${this.isDisabled}
                        @click=${this.handleEyeDropper}
                      >
                        <slot name="eyedropper-icon">${drawIcon(eyedropper)}</slot>
                      </${this.tag('button')}>`
                    : nothing
                }
                ${
                  this.noFormat
                    ? nothing
                    : html`<${this.tag('button')}
                        part="format"
      exportparts="button: format-button, live: format-live, spinner: format-spinner, text: format-text"
                        label=${formatWords(this, 'formatLabel', { format: this.format ?? 'hex' })}
                        ?disabled=${this.isDisabled}
                        @click=${this.handleFormat}
                      >
                        ${this.format ?? 'hex'}
                      </${this.tag('button')}>`
                }
              </${this.tag('button-group')}>`
  }

  /**
   * The presets, as a listbox of colors with the current one selected, which
   * is React Aria's ColorSwatchPicker: one tab stop, held by the preset the
   * reader was last on, then the selected one, then the first.
   */
  private renderSwatches(painted: string): TemplateResult {
    const presets = this.presets
    const chosen = presets.map((preset) => {
      const parsed = parseColor(preset)
      return parsed !== null && toCss(parsed) === painted
    })
    const indexes = presets.map((_, index) => index)
    const stop = rovingStop(indexes, this.swatchAt, { selected: (index) => chosen[index] === true })
    return html`<div
      part="swatches"
      role="listbox"
      aria-label=${this.presetsLabel}
      aria-orientation="horizontal"
    >
      ${presets.map((preset, index) => {
        const parsed = parseColor(preset)
        return html`<button
          part="swatch"
          type="button"
          role="option"
          tabindex=${index === stop ? '0' : '-1'}
          aria-label=${parsed ? colorName(parsed, this.colorWords, wordsLocale(this)) : preset}
          aria-selected=${chosen[index] ? 'true' : 'false'}
          style="--color-picker-swatch: ${preset}"
          ?disabled=${this.isDisabled}
          @click=${() => {
            this.swatchAt = index
            this.handleSwatch(preset)
          }}
        ></button>`
      })}
    </div>`
  }

  protected override render(): TemplateResult {
    const color = this.color
    const painted = toCss(color)
    /* Each axis says both numbers, its own first, since either key pair moves
       either axis from the one tab stop. */
    /* And then the color's name, which is what the two numbers make: "Saturation
       100%, Brightness 100%" says where the handle is and "vibrant red" says
       what a sighted reader sees there, which is React Aria's reading. */
    const locale = wordsLocale(this)
    const square = (first: 'brightness' | 'saturation'): string =>
      formatWords(this, 'squareText', {
        brightness: color.brightness / 100,
        brightnessLabel: this.brightnessLabel,
        first,
        name: colorName(color, this.colorWords, locale),
        saturation: color.saturation / 100,
        saturationLabel: this.saturationLabel,
      })
    const both = square('saturation')
    const reversed = square('brightness')
    /* The hue ramp names the hue at full strength, which is what the ramp
       paints: the current color's own hue is gray wherever saturation is
       nothing, and a ramp read out as gray all the way along says nothing. */
    const hue = hueName(
      { alpha: 100, brightness: 100, hue: color.hue, saturation: 100 },
      this.colorWords,
      locale,
    )
    /* The hue's number and its name as the language lists two things: "120,
       green" in English. */
    const hueSaid = (value: number | string): string =>
      new Intl.ListFormat(locale, { style: 'short', type: 'unit' }).format([String(value), hue])
    const area = html`<div
        part="grid"
        style="--color-picker-hue: ${color.hue}; --color-picker-saturation: ${color.saturation}%; --color-picker-brightness: ${color.brightness}%"
        @pointerdown=${this.handleGridPointer}
        @pointermove=${this.handleGridPointer}
        @pointerup=${this.handleGridPointer}
        @pointercancel=${this.handleGridPointer}
        @keydown=${this.handleAreaKeydown}
      >
        <input
          part="grid-saturation"
          type="range"
          min="0"
          max="100"
          aria-label=${this.channelName(this.saturationLabel)}
          aria-describedby=${this.describedBy}
          aria-valuetext=${both}
          aria-invalid=${this.marked ? 'true' : nothing}
          .value=${String(color.saturation)}
          ?disabled=${this.isDisabled}
          @input=${(event: Event) => this.takeArea('saturation', event)}
          @change=${() => this.settle()}
        />
        ${
          /* Out of the Tab order: the square is one stop, and the saturation
             input above takes both pairs of arrows. Still in the tree, so a
             screen reader browsing the panel finds the vertical axis.

             **Vertical in its writing mode**, which is the only thing Chromium
             reads a range's orientation from, maximum at the top. */
          ''
        }
        <input
          part="grid-brightness"
          type="range"
          min="0"
          max="100"
          tabindex="-1"
          style="writing-mode: vertical-lr; direction: rtl"
          aria-label=${this.channelName(this.brightnessLabel)}
          aria-describedby=${this.describedBy}
          aria-valuetext=${reversed}
          aria-invalid=${this.marked ? 'true' : nothing}
          .value=${String(color.brightness)}
          ?disabled=${this.isDisabled}
          @input=${(event: Event) => this.takeArea('brightness', event)}
          @change=${() => this.settle()}
        />
      </div>`
    return html`<div part="label" ?hidden=${this.named === ''}>
        <slot name="label" @slotchange=${this.handleNamingSlot}>${this.label}</slot>
      </div>
      ${
        this.wheel
          ? html`<div
            part="wheel"
            style="--color-picker-hue: ${color.hue}"
            @pointerdown=${this.handleWheelPointer}
            @pointermove=${this.handleWheelPointer}
            @pointerup=${this.handleWheelPointer}
            @pointercancel=${this.handleWheelPointer}
          >
            ${
              /* Left to right whatever the page's direction: a ring has no
                 line of text, and the arrows turn it the same way round. */
              ''
            }
            <input
              part="wheel-hue"
              type="range"
              min="0"
              max="360"
              dir="ltr"
              aria-label=${this.channelName(this.hueLabel)}
              aria-describedby=${this.describedBy}
              aria-valuetext=${hueSaid(color.hue)}
              aria-invalid=${this.marked ? 'true' : nothing}
              .value=${String(color.hue)}
              ?disabled=${this.isDisabled}
              @input=${(event: Event) => this.takeArea('hue', event)}
              @change=${() => this.settle()}
            />
            ${area}
          </div>`
          : area
      }

      <div part="controls" style="--color-picker-hue: ${color.hue}; --color-picker-swatch: ${painted}">
        <button
          part="sample"
          type="button"
          aria-label=${
            this.copier.copied
              ? this.copiedLabel
              : formatWords(this, 'copyLabel', { value: this.value }).trim()
          }
          data-copied=${this.copier.copied ? '' : nothing}
          ?disabled=${this.isDisabled || this.value === ''}
          @click=${() => this.copier.copy(this.value)}
        ></button>
        <div part="channels">
          ${this.wheel ? nothing : this.renderChannel('hue', this.hueLabel, 360, color.hue, hueSaid('{value}'))}
          ${
            this.alpha
              ? this.renderChannel(
                  'alpha',
                  this.opacityLabel,
                  100,
                  color.alpha,
                  /* A percentage in the reader's language, "50%" or "50 %",
                     React Aria's reading of an alpha slider: the bare number
                     did not say what it counted. */
                  formatNumber(color.alpha / 100, locale, { style: 'percent' }),
                )
              : nothing
          }
        </div>
      </div>
      ${this.channelFields ? this.renderFields(color) : nothing}

      <!-- The syntax and the presets share a row, because neither fills one.
           Above them the ramps get the whole width, which is what they need:
           with the two controls stacked in a column beside them the hue bar was
           eighty pixels, and a hue is picked out of three hundred and sixty. -->
      <div part="footer">
        ${
          this.noValue
            ? nothing
            : html`<input
                part="value"
                type="text"
                aria-label=${this.valueLabel}
                aria-describedby=${this.describedBy}
                aria-invalid=${this.marked ? 'true' : nothing}
                autocomplete=${this.autocomplete || nothing}
                spellcheck="false"
                .value=${this.value}
                ?disabled=${this.isDisabled}
                ?readonly=${this.readOnly}
                @input=${this.handleValueInput}
                @change=${(event: Event) => {
                  event.stopPropagation()
                  this.typing = false
                  this.settle()
                }}
              />`
        }
        ${this.tools ? html`${this.renderTools()}` : nothing}
      </div>

      ${this.presets.length === 0 ? nothing : this.renderSwatches(painted)}
      <div part="hint" id="hint" ?hidden=${!this.hinted}>
        <slot name="hint" @slotchange=${this.handleNamingSlot}>${this.hint}</slot>
      </div>
      ${this.renderPickerFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-color-picker': HelixHeadlessColorPicker
  }
}
