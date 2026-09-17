import {
  CopyController,
  capturePointer,
  customElement,
  drawIcon,
  HelixFormElement,
  HelixSampleEndEvent,
  HelixSampleStartEvent,
  MixinControllerValue,
} from '@fusion.dev/helix-core'
import { eyedropper } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
/* Relative, so this registers the base slider and the styled file's identical
   import registers the styled one. `tier` picks which the template asks for. */
import '../../button/index.js'
import '../../button-group/index.js'
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
 * **The picker itself, with no field around it.** Color Input is this element
 * in a panel behind a text field; a settings pane or a toolbar wants the picker
 * flat on the page with nothing to open.
 *
 * **The square is two real range inputs.** Saturation and brightness are each
 * an `<input type="range">`, laid over the square and made invisible, and the
 * handle is drawn from their values. The keyboard, the announcements and the
 * touch targets are the platform's, and there is no `role="application"`.
 *
 * **The working model is HSB, and the value is derived from it.** The reverse
 * loses colors: black is `brightness: 0`, whose hue and saturation are both
 * undefined, so dragging to the bottom of the square and back would give gray
 * where there had been red. A value arriving from outside is read into the
 * model once.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Color, ColorArea, Swatch picker
 * @documentation https://fusion.dev/helix/components/color-picker
 *
 * @slot eyedropper-icon - The glyph on the screen-sampling control, usually a dropper.
 *
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the color changes. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixCopyEvent} helix-copy - Fired when the color is put on the clipboard.
 * @event {HelixSampleEndEvent} helix-sample-end - The eyedropper has closed, whether or not a color was taken.
 * @event {HelixSampleStartEvent} helix-sample-start - The eyedropper is opening, so anything covering the page should get out of the way.
 * @event {Event} input - Announced once the value has moved.
 *
 * @csspart actions - The group holding the eyedropper and the syntax toggle.
 * @csspart channel - One ramp.
 * @csspart channel-control - The range input.
 * @csspart channel-feedback - What is wrong with it.
 * @csspart channel-field - The row: the control and its readout.
 * @csspart channel-hint - Help under the track, while nothing is wrong.
 * @csspart channel-label - The question, over the track.
 * @csspart channel-marker - One mark.
 * @csspart channel-marker-label - The value a mark stands at, when `marker-labels` is set.
 * @csspart channel-markers - The row of marks along the track.
 * @csspart channel-output - The current value, shown beside it.
 * @csspart channels - The ramps beside it.
 * @csspart controls - The row under the square.
 * @csspart eyedropper - The control that samples a color from the screen.
 * @csspart eyedropper-button - The inner control.
 * @csspart footer - The row holding the value and the tools.
 * @csspart format - The control that changes the syntax the value is written in.
 * @csspart format-button - The inner control.
 * @csspart grid - The saturation and brightness square.
 * @csspart grid-brightness - The range input for its vertical axis.
 * @csspart grid-handle - The mark showing where in the square the color sits.
 * @csspart grid-saturation - The range input for the square's horizontal axis.
 * @csspart sample - The chip of the current color, which copies it when pressed.
 * @csspart swatch - One preset.
 * @csspart swatches - The row of presets.
 * @csspart value - The color as text, which can be typed or pasted.
 *
 * @cssproperty --color-picker-brightness - The chosen brightness, 0 to 100, as a percentage.
 * @cssproperty --color-picker-hue - The chosen hue, 0 to 360, unitless.
 * @cssproperty --color-picker-saturation - The chosen saturation, 0 to 100, as a percentage.
 * @cssproperty --color-picker-swatch - A color to paint: the current one on the sample, a preset's on each preset.
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
   * The syntax the value is written in: `hex`, `rgb` or `hsl`.
   *
   * Only what is written. Everything is read whatever this says, so a picker on
   * `hex` still takes an `rgb()` handed to it and stores the hex for it.
   */
  @property({ reflect: true })
  format?: ColorFormat

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
   * Whether the eyedropper is offered where the browser has one.
   */
  @property({ attribute: 'no-eyedropper', type: Boolean })
  noEyedropper = false

  /**
   * Whether the reader may change the format.
   */
  @property({ attribute: 'no-format', type: Boolean })
  noFormat = false

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
   * answer to which one is authoritative or which has the caret. Do not close it
   * the other way round, with Color Input dropping its own field: the value
   * would then be unreadable and unpasteable without opening a panel.
   */
  @property({ attribute: 'no-value', type: Boolean })
  noValue = false

  /**
   * Colors offered under the picker, as a comma-separated list.
   */
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
   * Settled before each render rather than at construction, because a server
   * has no `EyeDropper` and a button that ships in the markup and does nothing
   * in Firefox is worse than one that is never offered. Not while hydrating a
   * server's markup, which was rendered without it.
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
   * with a role and a name: an empty group labeled "Color tools" announces
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
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
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
    this.requestValue(formatColor(this.moved, this.format ?? 'hex', this.alpha))
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
    if (parsed) {
      this.move(parsed)
    }
  }

  /** Walks the format on, and rewrites the value in it. */
  private readonly handleFormat = (): void => {
    this.format = FORMATS[(FORMATS.indexOf(this.format ?? 'hex') + 1) % FORMATS.length] ?? 'hex'
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
    this.dispatchEvent(new HelixSampleStartEvent())
    try {
      const { sRGBHex } = await new Dropper().open()
      const parsed = parseColor(sRGBHex)
      if (parsed) {
        // A sample carries no alpha, so whatever was set is kept.
        this.move({ ...parsed, alpha: this.color.alpha })
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
    const grid = event.currentTarget as HTMLElement
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
    const across = getComputedStyle(grid).direction === 'rtl' ? 1 - fromLeft : fromLeft
    const down = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height))
    this.move({ brightness: Math.round((1 - down) * 100), saturation: Math.round(across * 100) })
  }

  protected override firstUpdated(changed: import('lit').PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
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
    this.partNamed('grid-saturation')?.focus(options)
  }

  /**
   * One of the ramps under the square.
   *
   * `protected` rather than `private`, the method being the seam a tier above
   * renders its own ramp through.
   */
  protected renderChannel(
    channel: 'alpha' | 'hue',
    label: string,
    max: number,
    value: number,
  ): TemplateResult {
    return html`<${this.tag('slider')}
      part="channel"
      exportparts="control: channel-control, feedback: channel-feedback, field: channel-field,
        hint: channel-hint, label: channel-label, marker: channel-marker,
        marker-label: channel-marker-label, markers: channel-markers, output: channel-output"
      data-channel=${channel}
      label=${label}
      max=${max}
      min="0"
      .value=${String(value)}
      ?disabled=${this.isDisabled}
      @input=${(event: Event) => this.takeChannel(channel, event)}
      @change=${(event: Event) => this.takeChannel(channel, event)}
    ></${this.tag('slider')}>`
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
    const { value } = event.target as HTMLInputElement
    this.move({ [axis]: Number(value) })
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
   * **Read off the target rather than out of a detail.** Do not bind
   * `helix-input` and `helix-change` and take the proposed value out of the
   * event: those are requests, announcing what the slider is *about* to do,
   * before anything has moved and while a listener may still refuse it. The
   * native pair fires after the slider applied, so the value is on the element
   * and cannot disagree with it.
   *
   * Idempotent, so taking both costs nothing: the same value applied twice is
   * the same color.
   */
  private takeChannel(channel: 'alpha' | 'hue', event: Event): void {
    event.stopPropagation()
    const { value } = event.target as unknown as { value: number }
    this.move({ [channel]: Number(value) })
  }

  /* `ariaInvalid` on the host through `ElementInternals`, the same route
     Date Picker takes and for the reason the whole library records: a `role` or a
     state written onto the host as an attribute is one a React consumer's
     server markup never had. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaInvalid = this.invalid ? 'true' : null
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
    return html`<${this.tag('button-group')} part="actions" label="Color tools">
                ${
                  this.sampling && !this.noEyedropper
                    ? html`<${this.tag('button')}
                        part="eyedropper"
      exportparts="button: eyedropper-button"
                        aria-label="Sample a color from the screen"
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
      exportparts="button: format-button"
                        aria-label=${`Syntax: ${this.format ?? 'hex'}. Change it.`}
                        ?disabled=${this.isDisabled}
                        @click=${this.handleFormat}
                      >
                        ${this.format ?? 'hex'}
                      </${this.tag('button')}>`
                }
              </${this.tag('button-group')}>`
  }

  protected override render(): TemplateResult {
    const color = this.color
    const painted = toCss(color)
    return html`<div
        part="grid"
        style="--color-picker-hue: ${color.hue}; --color-picker-saturation: ${color.saturation}%; --color-picker-brightness: ${color.brightness}%"
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
          @input=${(event: Event) => this.takeArea('saturation', event)}
        />
        <input
          part="grid-brightness"
          type="range"
          min="0"
          max="100"
          aria-label="Brightness"
          .value=${String(color.brightness)}
          ?disabled=${this.isDisabled}
          @input=${(event: Event) => this.takeArea('brightness', event)}
        />
      </div>

      <div part="controls" style="--color-picker-hue: ${color.hue}; --color-picker-swatch: ${painted}">
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
                autocomplete=${this.autocomplete || nothing}
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
                    style="--color-picker-swatch: ${preset}"
                    ?disabled=${this.isDisabled}
                    @click=${() => this.handleSwatch(preset)}
                  ></button>`
                })}
              </div>`
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-color-picker': HelixHeadlessColorPicker
  }
}
