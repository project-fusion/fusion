import {
  type Color,
  type ColorFormat,
  type ColorWords,
  CopyController,
  capturePointer,
  colorName,
  customElement,
  drawIcon,
  fillTemplate,
  formatColor,
  HelixFormElement,
  HelixSampleEndEvent,
  HelixSampleStartEvent,
  hostAria,
  hueName,
  inlineStep,
  isRtl,
  MixinControllerValue,
  parseColor,
  rovingStop,
  splitValues,
  toCss,
  wordsConverter,
} from '@fusion.dev/helix-core'
import { eyedropper } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { live } from 'lit/directives/live.js'
import { html } from 'lit/static-html.js'
import { type ChannelName, channelFields, writeChannel } from '../channels.js'
import { swatchMove } from '../swatches.js'
/* Relative, so this registers the base slider and the styled file's identical
   import registers the styled one. `tier` picks which the template asks for. */
import '../../button/index.js'
import '../../button-group/index.js'
import '../../slider/index.js'

/** The formats the toggle walks through, in the order it walks them. */
const FORMATS: ColorFormat[] = ['hex', 'rgb', 'hsl']

/**
 * Where a picker starts when there is nothing to start from.
 *
 * Not black, which is what `<input type="color">` opens on. Black is
 * `brightness: 0`, and from there the hue ramp moves nothing and the square is
 * one flat color: the whole thing is dead until the reader happens to raise
 * brightness first. Pure red is the nearest color where everything answers the
 * first thing touched.
 */
const START: Color = { alpha: 100, brightness: 100, hue: 0, saturation: 100 }

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
 * and the left and right arrows move saturation, and PageUp and PageDown move
 * brightness by ten. The picker sends `input` as the color moves and `change`
 * when a drag, a key, a typed value or a preset settles it, as
 * `<input type="color">` does.
 *
 * A screen reader hears the color's name, such as "vibrant red", after the two
 * numbers on the square and after the number on the hue ramp, and each preset
 * is named by its color. The opacity ramp is heard as a percentage. Set
 * `color-words` to speak the names in another language.
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
 * @csspart channels - The ramps beside the sample.
 * @csspart controls - The row under the square.
 * @csspart eyedropper - The control that samples a color from the screen.
 * @csspart eyedropper-button - The button inside `eyedropper`.
 * @csspart eyedropper-live - The live region of the button inside `eyedropper`, which says its pending label.
 * @csspart eyedropper-text - The words on the button inside `eyedropper`, trimmed to their capitals and baseline.
 * @csspart feedback - The message under the picker, while `feedback` is set.
 * @csspart field - One channel's number field with its label, in `channel-fields`.
 * @csspart field-input - The number input in a channel's field.
 * @csspart field-label - The name above a channel's number input.
 * @csspart fields - The row of channel number fields, in `channel-fields`.
 * @csspart footer - The row holding the value and the tools.
 * @csspart format - The control that changes the syntax the value is written in.
 * @csspart format-button - The button inside `format`.
 * @csspart format-live - The live region of the button inside `format`, which says its pending label.
 * @csspart format-text - The words on the button inside `format`, trimmed to their capitals and baseline.
 * @csspart grid - The saturation and brightness square. Draw the mark that shows
 * where the color sits with `::part(grid)::after` in your stylesheet. The
 * square carries the two channels as `--color-picker-saturation` and
 * `--color-picker-brightness`, and this tier ships no CSS.
 * @csspart grid-brightness - The range input for the square's vertical axis.
 * @csspart grid-saturation - The range input for the square's horizontal axis.
 * @csspart sample - A chip of the current color. Pressing it copies the value.
 * @csspart swatch - One preset, an option in the `swatches` listbox.
 * @csspart swatches - The row of presets, a listbox.
 * @csspart value - The text field that holds the color. It accepts a typed or pasted color.
 *
 * @cssproperty --color-picker-brightness - The chosen brightness, 0 to 100, as a percentage.
 * @cssproperty --color-picker-hue - The chosen hue, 0 to 360, unitless.
 * @cssproperty --color-picker-saturation - The chosen saturation, 0 to 100, as a percentage.
 * @cssproperty --color-picker-swatch - The color a chip shows: the current color on the sample, and the preset's color on each preset.
 */
@customElement('helix-headless-color-picker')
export class HelixHeadlessColorPicker extends MixinControllerValue(HelixFormElement) {
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
  @property({ attribute: 'bad-input-message' })
  badInputMessage?: string

  /**
   * What the blue channel's field is called, in `channel-fields`.
   */
  @property({ attribute: 'blue-label' })
  blueLabel = 'Blue'

  /**
   * What the square's vertical ramp is called.
   *
   * **Every word the picker speaks is a property**, so a page in another
   * language hears its own rather than English between its own labels.
   */
  @property({ attribute: 'brightness-label' })
  brightnessLabel = 'Brightness'

  /**
   * Whether the picker shows a number field for each channel of the color, as
   * React Aria's ColorField does with `channel`: red, green and blue for hex
   * and rgb, hue, saturation and lightness for hsl, and the opacity with
   * `alpha`.
   *
   * For a reader who has the numbers from a brand guide, and for a keyboard,
   * where typing 128 is quicker than holding an arrow key. The fields follow
   * the syntax the format toggle sets.
   */
  @property({ attribute: 'channel-fields', type: Boolean })
  channelFields = false

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
  @property({ attribute: 'copied-label' })
  copiedLabel = 'Copied'

  /**
   * The name of the sample, which copies the value. `{value}` is replaced with
   * the color.
   */
  @property({ attribute: 'copy-label' })
  copyLabel = 'Copy {value}'

  /**
   * What the eyedropper is called.
   */
  @property({ attribute: 'eyedropper-label' })
  eyedropperLabel = 'Sample a color from the screen'

  /**
   * A message under the picker, such as what is wrong with the color.
   *
   * While set, the picker is invalid and does not submit, as a field's
   * `feedback` is, and the square and the value text are described by it.
   * Color Input shows its own message here, so a reader in the open panel
   * still sees it.
   */
  @property()
  feedback = ''

  /**
   * The syntax the value is written in: `hex`, `rgb`, or `hsl`.
   *
   * Only what is written. Everything is read whatever this says, so a picker on
   * `hex` still takes an `rgb()` handed to it and stores the hex for it.
   */
  @property({ reflect: true })
  format?: ColorFormat

  /**
   * What the syntax toggle is called, with `{format}` filled in.
   */
  @property({ attribute: 'format-label' })
  formatLabel = 'Syntax: {format}. Change it.'

  /**
   * What the green channel's field is called, in `channel-fields`.
   */
  @property({ attribute: 'green-label' })
  greenLabel = 'Green'

  /**
   * What the hue channel is called.
   */
  @property({ attribute: 'hue-label' })
  hueLabel = 'Hue'

  /**
   * Whether the current selection fails validation.
   *
   * A flag rather than a message, the split Date Picker also draws. A flat
   * picker has no room of its own for a sentence: the field that wraps one owns
   * the label, the hint and the feedback, and a second message inside the panel
   * would be the same error said twice. What is left for the picker is the one
   * thing the field cannot draw from outside, the mark on the answer itself.
   */
  @property({ reflect: true, type: Boolean })
  invalid = false

  /**
   * What the lightness channel's field is called, in `channel-fields` with
   * hsl.
   */
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
  @property({ attribute: 'opacity-label' })
  opacityLabel = 'Opacity'

  /**
   * What the row of `swatches` is called.
   */
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
   * `#00` from a half-typed value. The picker draws no message of its own, so
   * reporting it as each keystroke arrives shows nothing until the form asks;
   * Color Input shows its own message against the field the reader typed
   * into.
   */
  @property({ reflect: true, type: Boolean })
  required = false

  /**
   * What the square's horizontal ramp is called.
   */
  @property({ attribute: 'saturation-label' })
  saturationLabel = 'Saturation'

  /**
   * Colors offered under the picker, as a comma-separated list.
   */
  @property()
  swatches = ''

  /**
   * What the group holding the eyedropper and the syntax toggle is called.
   */
  @property({ attribute: 'tools-label' })
  toolsLabel = 'Color tools'

  /**
   * What the text field holding the value is called.
   */
  @property({ attribute: 'value-label' })
  valueLabel = 'Color'

  /**
   * The message shown when a color is required and none is chosen.
   *
   * **Every sentence a control raises in the browser's bubble is a property**,
   * named for the validity flag it reports, so a form in another language
   * speaks it. Absent is the control's own sentence, in English.
   */
  @property({ attribute: 'value-missing-message' })
  valueMissingMessage?: string

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
    return this.moved ?? parseColor(this.value) ?? parseColor(this.settled) ?? START
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
    return splitValues(this.swatches, ',').filter((one) => parseColor(one) !== null)
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
    const parsed = parseColor(typed)
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
   */
  private readonly handleSwatchKeydown = (event: KeyboardEvent): void => {
    const row = [
      ...(this.renderRoot.querySelectorAll<HTMLElement>('[part="swatches"] [part="swatch"]') ?? []),
    ]
    const at = row.indexOf(event.target as HTMLElement)
    const next = swatchMove(event.key, inlineStep(this, event.key), at, row.length)
    if (at < 0 || next === null) {
      return
    }
    event.preventDefault()
    this.swatchAt = next
    row[next]?.focus()
  }

  /** Walks the format on, and rewrites the value in it. */
  private readonly handleFormat = (): void => {
    /* Refused whole rather than half. Walking the syntax on is a rewrite of the
       value, so a read-only picker that let the toggle move would show `rgb`
       over a hex it was no longer allowed to restate. */
    if (this.readOnly) {
      return
    }
    this.format = FORMATS[(FORMATS.indexOf(this.format ?? 'hex') + 1) % FORMATS.length] ?? 'hex'
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
      this.settle()
      return
    }
    if (event.type === 'pointerdown') {
      capturePointer(grid, event.pointerId)
      // So the keyboard carries on from where the pointer left off.
      this.partNamed('grid-saturation')?.focus()
    } else if (!grid.hasPointerCapture(event.pointerId)) {
      return
    }
    event.preventDefault()
    const box = grid.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) {
      return
    }
    /* Saturation runs along the line, the way the two ramps under the square
       do, being native ranges: on a right-to-left page it grows toward the
       left. The pointer is physical, so it is turned here, where the handle and
       the saturation range are logical already. */
    const fromLeft = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    const across = isRtl(grid) ? 1 - fromLeft : fromLeft
    const down = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height))
    this.move({ brightness: Math.round((1 - down) * 100), saturation: Math.round(across * 100) })
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
    this.internals.setFormValue(this.value === '' ? null : this.value)
    this.reportRequired()
  }

  /**
   * Moves the square from the keyboard, both axes from either of its inputs.
   *
   * The square is two native ranges, and a native range maps every arrow to
   * its own one axis: on the saturation input, ArrowUp moved the handle
   * sideways. Here the vertical keys move brightness and the horizontal keys
   * move saturation, turned on a right-to-left page as the pointer is, which is
   * what React Aria's ColorArea does.
   */
  private readonly handleAreaKeydown = (event: KeyboardEvent): void => {
    if (this.isDisabled || this.readOnly) {
      return
    }
    const color = this.color
    const along = isRtl(this) ? -1 : 1
    const clamp = (at: number): number => Math.min(100, Math.max(0, at))
    const moves: Record<string, Partial<Color>> = {
      ArrowDown: { brightness: clamp(color.brightness - 1) },
      ArrowLeft: { saturation: clamp(color.saturation - along) },
      ArrowRight: { saturation: clamp(color.saturation + along) },
      ArrowUp: { brightness: clamp(color.brightness + 1) },
      PageDown: { brightness: clamp(color.brightness - 10) },
      PageUp: { brightness: clamp(color.brightness + 10) },
    }
    const next = moves[event.key]
    if (!next) {
      return
    }
    event.preventDefault()
    this.move(next)
    this.settle()
  }

  /** @internal `feedback` marks the picker invalid, as a field's does. */
  protected override get validityFeedback(): string {
    return this.feedback
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
    if (this.required && this.value === '') {
      this.internals.setValidity(
        { valueMissing: true },
        this.valueMissingMessage || 'Choose a color.',
        this.partNamed('grid') ?? undefined,
      )
      return
    }
    if (this.value !== '' && parseColor(this.value) === null) {
      this.internals.setValidity(
        { badInput: true },
        this.badInputMessage || 'Enter a color, like #ff0000, rgb(255 0 0) or hsl(0 100% 50%).',
        this.partNamed('value') ?? this.partNamed('grid') ?? undefined,
      )
      return
    }
    this.internals.setValidity({})
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
      ${channelFields(this.value, color, this.format ?? 'hex', this.alpha).map(
        (field) => html`<label part="field">
          <span part="field-label">${this.channelWord(field.channel)}</span>
          <input
            part="field-input"
            type="number"
            inputmode="numeric"
            min=${field.min}
            max=${field.max}
            step="1"
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
        </label>`,
      )}
    </div>`
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
        marker-label: channel-marker-label, markers: channel-markers, output: channel-output"
      data-channel=${channel}
      aria-invalid=${this.invalid ? 'true' : nothing}
      label=${label}
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
  private takeArea(axis: 'brightness' | 'saturation', event: Event): void {
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
    super.willUpdate(changed)
    this.internals.ariaInvalid = this.invalid ? 'true' : null
    /* A group only where a page's `<label for>` names the picker, so the
       name has somewhere to be read. Unlabeled, the host stays without a
       role, as it is inside Color Input. */
    const outside = [...(this.internals.labels ?? [])] as HTMLElement[]
    hostAria(this.internals, { labelledBy: outside, role: outside.length > 0 ? 'group' : '' })
    if (!this.hydrating) {
      this.sampling = 'EyeDropper' in globalThis
    }
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
      exportparts="button: eyedropper-button, live: eyedropper-live, text: eyedropper-text"
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
      exportparts="button: format-button, live: format-live, text: format-text"
                        label=${fillTemplate(this.formatLabel, { format: this.format ?? 'hex' })}
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
      @keydown=${this.handleSwatchKeydown}
    >
      ${presets.map((preset, index) => {
        const parsed = parseColor(preset)
        return html`<button
          part="swatch"
          type="button"
          role="option"
          tabindex=${index === stop ? '0' : '-1'}
          aria-label=${parsed ? colorName(parsed, this.colorWords, this.lang) : preset}
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
    const named = colorName(color, this.colorWords, this.lang)
    const both = `${this.saturationLabel} ${color.saturation}%, ${this.brightnessLabel} ${color.brightness}%, ${named}`
    const reversed = `${this.brightnessLabel} ${color.brightness}%, ${this.saturationLabel} ${color.saturation}%, ${named}`
    /* The hue ramp names the hue at full strength, which is what the ramp
       paints: the current color's own hue is gray wherever saturation is
       nothing, and a ramp read out as gray all the way along says nothing. */
    const hue = hueName(
      { alpha: 100, brightness: 100, hue: color.hue, saturation: 100 },
      this.colorWords,
      this.lang,
    )
    /* The square's two inputs are named with the picker's own name where it
       has one, as React Aria's color area names its own: "Brand, Saturation"
       says which picker on a page with two. */
    const owner = this.getAttribute('aria-label')?.trim()
    const axisName = (channel: string): string => (owner ? `${owner}, ${channel}` : channel)
    return html`<div
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
          aria-label=${axisName(this.saturationLabel)}
          aria-describedby=${this.feedback === '' ? nothing : 'feedback'}
          aria-valuetext=${both}
          aria-invalid=${this.invalid ? 'true' : nothing}
          .value=${String(color.saturation)}
          ?disabled=${this.isDisabled}
          @input=${(event: Event) => this.takeArea('saturation', event)}
          @change=${() => this.settle()}
        />
        ${
          /* Out of the Tab order: the square is one stop, and the saturation
             input above takes both pairs of arrows. Still in the tree, so a
             screen reader browsing the panel finds the vertical axis. */
          ''
        }
        <input
          part="grid-brightness"
          type="range"
          min="0"
          max="100"
          tabindex="-1"
          aria-label=${axisName(this.brightnessLabel)}
          aria-describedby=${this.feedback === '' ? nothing : 'feedback'}
          aria-valuetext=${reversed}
          aria-invalid=${this.invalid ? 'true' : nothing}
          .value=${String(color.brightness)}
          ?disabled=${this.isDisabled}
          @input=${(event: Event) => this.takeArea('brightness', event)}
          @change=${() => this.settle()}
        />
      </div>

      <div part="controls" style="--color-picker-hue: ${color.hue}; --color-picker-swatch: ${painted}">
        <button
          part="sample"
          type="button"
          aria-label=${
            this.copier.copied
              ? this.copiedLabel
              : fillTemplate(this.copyLabel, { value: this.value }).trim()
          }
          data-copied=${this.copier.copied ? '' : nothing}
          ?disabled=${this.isDisabled || this.value === ''}
          @click=${() => this.copier.copy(this.value)}
        ></button>
        <div part="channels">
          ${this.renderChannel('hue', this.hueLabel, 360, color.hue, `{value}, ${hue}`)}
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
                  new Intl.NumberFormat(this.lang || undefined, { style: 'percent' }).format(
                    color.alpha / 100,
                  ),
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
                aria-describedby=${this.feedback === '' ? nothing : 'feedback'}
                aria-invalid=${this.invalid ? 'true' : nothing}
                autocomplete=${this.autocomplete || nothing}
                spellcheck="false"
                .value=${this.value}
                ?disabled=${this.isDisabled}
                ?readonly=${this.readOnly}
                @input=${this.handleValueInput}
                @change=${(event: Event) => {
                  event.stopPropagation()
                  this.settle()
                }}
              />`
        }
        ${this.tools ? html`${this.renderTools()}` : nothing}
      </div>

      ${this.presets.length === 0 ? nothing : this.renderSwatches(painted)}
      ${this.feedback === '' ? nothing : html`<p part="feedback" id="feedback">${this.feedback}</p>`}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-color-picker': HelixHeadlessColorPicker
  }
}
