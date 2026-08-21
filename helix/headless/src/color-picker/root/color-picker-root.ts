import {
  CopyController,
  capturePointer,
  customElement,
  type HelixChangeEvent,
  HelixFormElement,
  MixinControllerValue,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
/* Side-effect import, because this renders `<helix-slider>` in its own shadow
   root and a custom element registers on import. The public tag rather than the
   base one: a consumer on the styled tier gets the styled slider, and one on the
   headless tier brings a slider of their own under that name. */
import '../../button/index.js'
import '../../button-group/index.js'
import '../../icon/index.js'
import '../../slider/index.js'
import {
  type Color,
  type ColorFormat,
  formatColor,
  parseColor,
  splitColors,
  toCss,
} from '../color.js'

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
 * @summary Picks a color, from a square and two ramps.
 *
 * @description
 * **The picker itself, with no field around it.** Color Input is this element in
 * a panel behind a text field, the same way Date Input is `helix-date-picker` in a
 * panel: a form wants a field, and a settings pane or a toolbar wants the picker
 * sitting flat on the page with nothing to open. Neither should be the other one
 * with parts hidden.
 *
 * **The square is two real range inputs.** Saturation and brightness are each an
 * `<input type="range">`, laid over the square and made invisible, and the
 * handle is drawn from their values. The pointer gets the square; the keyboard
 * gets the arrow keys, Home, End and the page keys; a screen reader gets two
 * sliders that announce a name and a number. All of it is the platform's, and
 * nothing here implements a key handler. There is no `role="application"`, which
 * is the usual way this control is built and amounts to asking a screen reader
 * to stop helping.
 *
 * **The working model is HSB, and the value is derived from it.** The reverse
 * loses colors: black is `brightness: 0`, whose hue and saturation are both
 * undefined, so a reader who drags to the bottom of the square and back would
 * get gray where they had red. Holding the model means a color survives a trip
 * through one that has no hue. A value arriving from outside is read into the
 * model once, which is the only moment the conversion runs in that direction.
 *
 * **Every syntax is read; the one `format` names is written.** `#f00`,
 * `#ff0000`, `rgb(255 0 0)`, `rgba(255,0,0,.5)` and `hsl(0 100% 50%)` are all
 * colors. Named colors are the exception, and deliberately: resolving
 * `rebeccapurple` means shipping a table of a hundred and forty or asking the
 * browser, and there is no browser during a server render.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Color, ColorArea, Swatch picker
 * @documentation https://helix.fusion.dev/components/color-picker
 *
 * @event {HelixChangeEvent} helix-change - Fired when the color changes.
 * @event {HelixCopyEvent} helix-copy - Fired when the color is put on the clipboard.
 *
 * @csspart grid - The saturation and brightness square.
 * @csspart grid-handle - The mark showing where in the square the color sits.
 * @csspart grid-saturation - The range input for the square's horizontal axis.
 * @csspart grid-brightness - The range input for its vertical axis.
 * @csspart controls - The row under the square.
 * @csspart sample - The chip of the current color, which copies it when pressed.
 * @csspart channels - The ramps beside it.
 * @csspart channel - One ramp.
 * @csspart actions - The group holding the eyedropper and the syntax toggle.
 * @csspart eyedropper - The control that samples a color from the screen.
 * @csspart footer - The row holding the value and the tools.
 * @csspart value - The color as text, which can be typed or pasted.
 * @csspart format - The control that changes the syntax the value is written in.
 * @csspart swatches - The row of presets.
 * @csspart swatch - One preset.
 */
@customElement('helix-base-color-picker')
export class HelixBaseColorPicker extends MixinControllerValue(HelixFormElement) {
  /**
   * Whether the current selection fails validation.
   *
   * A flag rather than a message, which is the split Date Picker already drew and
   * these two now follow. A flat picker has no room of its own for a sentence:
   * the field that wraps one owns the label, the hint and the feedback, and a
   * second message inside the panel would be the same error said twice. What is
   * left for the picker is the one thing the field cannot draw from outside, the
   * mark on the answer itself.
   */
  @property({ reflect: true, type: Boolean })
  invalid = false

  /**
   * Whether the color carries an alpha channel.
   *
   * Off by default, because it widens every value written, and a consumer who
   * did not ask for transparency should not have to strip a byte off each one.
   */
  @property({ reflect: true, type: Boolean })
  alpha = false

  /**
   * The syntax the value is written in: `hex`, `rgb` or `hsl`.
   *
   * Only what is written. Everything is read whatever this says, so a picker on
   * `hex` still takes an `rgb()` handed to it and stores the hex for it.
   */
  @property({ reflect: true })
  format: ColorFormat = 'hex'

  /**
   * Whether to leave the value out, for a picker whose value is stated elsewhere.
   *
   * The row reads the color as text and lets it be typed or pasted, which is
   * what makes this element complete standing on a page: a square and two ramps
   * can build a color and cannot state one, and a reader who has a hex already
   * should not have to find it by dragging.
   *
   * Color Input sets this, because its field is that input. Two editable fields
   * for one value is the outcome worth avoiding: two places to type, and no
   * answer to which one is authoritative or which has the caret. The other way
   * round was considered, Color Input dropping its own field and letting this be
   * the only one, and it is worse for a form: the value cannot be read or pasted
   * without opening a panel.
   */
  @property({ attribute: 'no-value', type: Boolean })
  noValue = false

  /** Whether the reader may change the format. */
  @property({ attribute: 'no-format', type: Boolean })
  noFormat = false

  /** Whether the eyedropper is offered where the browser has one. */
  @property({ attribute: 'no-eyedropper', type: Boolean })
  noEyedropper = false

  /** Colors offered under the picker, as a comma-separated list. */
  @property()
  swatches = ''

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
   * Settled after the first render rather than at construction, because there is
   * no `window` on the server, and a button that ships in the markup and does
   * nothing in Firefox is worse than one that is never offered.
   */
  @state()
  private sampling = false

  /**
   * Whether the value on this element was produced here.
   *
   * The one bit that keeps the model from being overwritten by the value it just
   * produced. Without it, dragging to the bottom of the square writes black,
   * which reads back as hue 0 and saturation 0, and the next drag starts gray.
   */
  private owned = false

  /** Where the picker stands: what was moved, or what the value says, or the start. */
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
   * with a role and a name: an empty group labelled "Color tools" announces
   * nothing, and the footer cannot tell it is empty either, so the row kept its
   * padding with nothing in it.
   */
  private get tools(): boolean {
    return (this.sampling && !this.noEyedropper) || !this.noFormat
  }

  /** The presets, as written, with anything that is not a color dropped. */
  private get presets(): string[] {
    return splitColors(this.swatches).filter((one) => parseColor(one) !== null)
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
    const typed = (event.target as HTMLInputElement).value
    const parsed = parseColor(typed)
    if (parsed) {
      this.moved = parsed
      this.owned = true
    }
    this.requestValue(typed)
  }

  /** Moves part of the model and announces the value that follows from it. */
  private readonly move = (next: Partial<Color>): void => {
    this.moved = { ...this.color, ...next }
    this.owned = true
    this.requestValue(formatColor(this.moved, this.format, this.alpha))
  }

  /**
   * Copying the value, which is the one thing here worth taking away.
   *
   * A reader who has just built a color wants it in a stylesheet, and the
   * alternative is selecting text out of a field that may not be on screen. The
   * chip is the obvious target: it is the color, at the size of a control, and
   * it had no job at all before this.
   *
   * The controller rather than the four lines it replaces, because a copy button
   * is coming and the two share everything that is easy to get wrong: the write,
   * the confirmation, the timer that ends it, the event, and a failure that is
   * correctly silent.
   */
  private readonly copier = new CopyController(this)

  /** Takes a preset, in this picker's syntax rather than as the preset spelled it. */
  private readonly handleSwatch = (preset: string): void => {
    const parsed = parseColor(preset)
    if (parsed) {
      this.move(parsed)
    }
  }

  /** Walks the format on, and rewrites the value in it. */
  private readonly handleFormat = (): void => {
    this.format = FORMATS[(FORMATS.indexOf(this.format) + 1) % FORMATS.length] ?? 'hex'
    if (this.value !== '') {
      this.move({})
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
    const Dropper = (globalThis as { EyeDropper?: EyeDropperConstructor }).EyeDropper
    if (!Dropper) {
      return
    }
    this.dispatchEvent(new Event('helix-sample-start', { bubbles: true, composed: true }))
    try {
      const { sRGBHex } = await new Dropper().open()
      const parsed = parseColor(sRGBHex)
      if (parsed) {
        // A sample carries no alpha, so whatever was set is kept.
        this.move({ ...parsed, alpha: this.color.alpha })
      }
    } catch {
      /* Cancelling is how this is normally left, and the platform reports it as
         a rejection. There is nothing to recover from and nothing to say. */
    }
    this.dispatchEvent(new Event('helix-sample-end', { bubbles: true, composed: true }))
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
    const grid = event.currentTarget as HTMLElement
    if (event.type === 'pointerdown') {
      capturePointer(grid, event.pointerId)
      // So the keyboard carries on from where the pointer left off.
      this.renderRoot?.querySelector<HTMLElement>('[part="grid-saturation"]')?.focus()
    } else if (!grid.hasPointerCapture(event.pointerId)) {
      return
    }
    event.preventDefault()
    const box = grid.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) {
      return
    }
    const across = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    const down = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height))
    this.move({ brightness: Math.round((1 - down) * 100), saturation: Math.round(across * 100) })
  }

  protected override firstUpdated(changed: import('lit').PropertyValues): void {
    super.firstUpdated(changed)
    this.sampling = 'EyeDropper' in globalThis
  }

  protected override updated(changed: import('lit').PropertyValues): void {
    super.updated(changed)
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

  /** Puts the keyboard on the square, which is the control a reader wants. */
  override focus(options?: FocusOptions): void {
    this.renderRoot?.querySelector<HTMLElement>('[part="grid-saturation"]')?.focus(options)
  }

  /** One of the ramps under the square. */
  /* `protected` rather than `private`: the method was already the seam and a
     tier above simply could not reach it. */
  protected renderChannel(
    channel: 'alpha' | 'hue',
    label: string,
    max: number,
    value: number,
  ): TemplateResult {
    return html`<helix-slider
      part="channel"
      data-channel=${channel}
      label=${label}
      max=${max}
      min="0"
      .value=${String(value)}
      ?disabled=${this.isDisabled}
      @helix-change=${(event: Event) => {
        event.stopPropagation()
        this.move({ [channel]: Number((event as HelixChangeEvent).detail.value) })
      }}
    ></helix-slider>`
  }

  /* `ariaInvalid` on the host through `ElementInternals`, the same route
     Date Picker takes and for the reason the whole library records: a `role` or a
     state written onto the host as an attribute is one a React consumer's
     server markup never had. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaInvalid = this.invalid ? 'true' : null
  }

  /**
   * The eyedropper and the swatch tools, which are a group of buttons, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The
   * public tag rather than the base one: a consumer on the styled tier gets the
   * styled element, and one on the headless tier brings their own under that
   * name.
   */
  protected renderTools(): TemplateResult {
    return html`<helix-button-group part="actions" label="Color tools">
                ${
                  this.sampling && !this.noEyedropper
                    ? html`<helix-button
                        part="eyedropper"
                        aria-label="Sample a color from the screen"
                        ?disabled=${this.isDisabled}
                        @click=${this.handleEyeDropper}
                      >
                        <helix-icon name="eyedropper"></helix-icon>
                      </helix-button>`
                    : nothing
                }
                ${
                  this.noFormat
                    ? nothing
                    : html`<helix-button
                        part="format"
                        aria-label=${`Syntax: ${this.format}. Change it.`}
                        ?disabled=${this.isDisabled}
                        @click=${this.handleFormat}
                      >
                        ${this.format}
                      </helix-button>`
                }
              </helix-button-group>`
  }

  protected override render(): TemplateResult {
    const color = this.color
    const painted = toCss(color)
    return html`<div
        part="grid"
        style="--_hue: ${color.hue}; --_saturation: ${color.saturation}%; --_brightness: ${color.brightness}%"
        @pointerdown=${this.handleGridPointer}
        @pointermove=${this.handleGridPointer}
      >
        <span part="grid-handle" aria-hidden="true"></span>
        <input
          part="grid-saturation"
          type="range"
          min="0"
          max="100"
          aria-label="Saturation"
          .value=${String(color.saturation)}
          ?disabled=${this.isDisabled}
          @input=${(event: Event) =>
            this.move({ saturation: Number((event.target as HTMLInputElement).value) })}
        />
        <input
          part="grid-brightness"
          type="range"
          min="0"
          max="100"
          aria-label="Brightness"
          .value=${String(color.brightness)}
          ?disabled=${this.isDisabled}
          @input=${(event: Event) =>
            this.move({ brightness: Number((event.target as HTMLInputElement).value) })}
        />
      </div>

      <div part="controls" style="--_hue: ${color.hue}; --_color: ${painted}">
        <button
          part="sample"
          type="button"
          aria-label=${this.copier.copied ? 'Copied' : `Copy ${this.value || 'the color'}`}
          data-copied=${this.copier.copied ? '' : nothing}
          ?disabled=${this.isDisabled || this.value === ''}
          @click=${() => this.copier.copy(this.value)}
        ></button>
        <div part="channels">
          ${this.renderChannel('hue', 'Hue', 360, color.hue)}
          ${this.alpha ? this.renderChannel('alpha', 'Opacity', 100, color.alpha) : nothing}
        </div>
      </div>

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
                aria-label="Color"
                autocomplete="off"
                spellcheck="false"
                .value=${this.value}
                ?disabled=${this.isDisabled}
                @input=${this.handleValueInput}
              />`
        }
        ${this.tools ? html`${this.renderTools()}` : nothing}
      </div>

      ${
        this.presets.length === 0
          ? nothing
          : html`<div part="swatches" role="group" aria-label="Presets">
                ${this.presets.map((preset) => {
                  const parsed = parseColor(preset)
                  return html`<button
                    part="swatch"
                    type="button"
                    aria-label=${preset}
                    aria-pressed=${parsed !== null && toCss(parsed) === painted ? 'true' : 'false'}
                    style="--_color: ${preset}"
                    ?disabled=${this.isDisabled}
                    @click=${() => this.handleSwatch(preset)}
                  ></button>`
                })}
              </div>`
      }
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-color-picker': HelixBaseColorPicker
  }
}
