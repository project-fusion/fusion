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
import { property, state } from 'lit/decorators.js'
/* Side-effect import, because this renders `<helix-slider>` in its own shadow
   root and a custom element registers on import. The public tag rather than the
   base one: a consumer on the styled tier gets the styled slider, and one on the
   headless tier brings a slider of their own under that name. */
import '../../slider/index.js'
import { type Color, type ColorFormat, formatColor, parseColor, toCss } from '../color.js'

/** The formats the toggle walks through, in the order it walks them. */
const FORMATS: ColorFormat[] = ['hex', 'rgb', 'hsl']

/**
 * Where a panel starts when there is nothing to start from.
 *
 * Not black, which is what `<input type="color">` opens on. Black is
 * `brightness: 0`, and from there the hue ramp moves nothing and the square is
 * one flat colour: the whole panel is dead until the reader happens to raise
 * brightness first. Pure red is the nearest colour where everything answers the
 * first thing touched.
 */
const START: Color = { alpha: 100, brightness: 100, hue: 0, saturation: 100 }

/** What `EyeDropper` looks like where the browser has one. */
interface EyeDropperConstructor {
  new (): { open(): Promise<{ sRGBHex: string }> }
}

/**
 * @summary A colour, typed in any syntax or picked from a panel.
 *
 * @description
 * **The panel is a saturation and brightness square with a hue ramp under it**,
 * which is the shape of every colour picker a reader has already met. An earlier
 * version of this component was three labelled sliders instead, on the grounds
 * that a two-dimensional control has no semantics. That reasoning was right and
 * the conclusion was wrong: it treated "no semantics" as the end of the question
 * rather than as the thing to solve.
 *
 * **So the square is two real range inputs.** Saturation and brightness are each
 * an `<input type="range">`, laid over the square and made invisible, and the
 * handle is drawn from their values. The pointer gets the square; the keyboard
 * gets the arrow keys, Home, End and the page keys; a screen reader gets two
 * sliders that announce a name and a number. All of it is the platform's, and
 * nothing here implements a key handler. There is no `role="application"`, which
 * is the usual way this control is built and amounts to asking a screen reader
 * to stop helping.
 *
 * **The working model is HSB, and the value is derived from it.** The reverse
 * loses colours: black is `brightness: 0`, whose hue and saturation are both
 * undefined, so a reader who drags to the bottom of the square and back would
 * get grey where they had red. Holding the model means a colour survives a trip
 * through one that has no hue. A value arriving from outside, or typed into the
 * field, is read into the model once, which is the only moment the conversion
 * runs in that direction.
 *
 * **Every syntax is read; the one `format` names is written.** `#f00`,
 * `#ff0000`, `rgb(255 0 0)`, `rgba(255,0,0,.5)` and `hsl(0 100% 50%)` are all
 * colours, and a field that refuses one because it prefers another is arguing
 * with the person using it. Named colours are the exception, and deliberately:
 * resolving `rebeccapurple` means shipping a table of a hundred and forty or
 * asking the browser, and there is no browser during a server render.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases ColorPicker, ColorField, ColourInput
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
 * @csspart control - The text input carrying the value.
 * @csspart trigger - The control that opens the panel.
 * @csspart preview - The chip showing the colour, inside the trigger.
 * @csspart surface - The floating panel.
 * @csspart grid - The saturation and brightness square.
 * @csspart grid-handle - The mark showing where in the square the colour sits.
 * @csspart grid-saturation - The range input for the square's horizontal axis.
 * @csspart grid-brightness - The range input for its vertical axis.
 * @csspart controls - The row under the square.
 * @csspart sample - The larger chip of the current colour, in that row.
 * @csspart channels - The ramps beside it.
 * @csspart channel - One ramp.
 * @csspart footer - The row holding the syntax toggle and the presets.
 * @csspart eyedropper - The control that samples a colour from the screen.
 * @csspart format - The control that changes the syntax the value is written in.
 * @csspart swatches - The row of presets.
 * @csspart swatch - One preset.
 */
@customElement('helix-base-input-color')
export class HelixBaseInputColor extends MixinControllerOpen(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /**
   * Whether the colour carries an alpha channel.
   *
   * Off by default, because it widens every value written, and a consumer who
   * did not ask for transparency should not have to strip a byte off each one.
   */
  @property({ reflect: true, type: Boolean })
  alpha = false

  /**
   * The syntax the value is written in: `hex`, `rgb` or `hsl`.
   *
   * Only what is written. Everything is read whatever this says, so a field on
   * `hex` still takes a pasted `rgb()` and stores the hex for it.
   */
  @property({ reflect: true })
  format: ColorFormat = 'hex'

  /** Whether the reader may change the format from the panel. */
  @property({ attribute: 'no-format', type: Boolean })
  noFormat = false

  /** What the field says before a colour is in it. */
  @property()
  placeholder = '#000000'

  /** Colours offered under the panel, as a comma-separated list. */
  @property()
  swatches = ''

  /** Accessible name for the control that opens the panel. */
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose a colour'

  /**
   * The colour the reader has moved to, or nothing while they have moved none.
   *
   * Held rather than re-read, which is the whole point: see the class
   * description. Cleared whenever a value arrives from anywhere else, so the
   * next reading comes from that value instead.
   */
  @state()
  private moved: Color | undefined

  /**
   * Whether this browser can sample a colour off the screen.
   *
   * Settled after the first render rather than at construction, because there is
   * no `window` on the server, and a button that ships in the markup and does
   * nothing in Firefox is worse than one that is never offered.
   */
  @state()
  private sampling = false

  /**
   * Whether the value on this element was produced by its own panel.
   *
   * The one bit that keeps the model from being overwritten by the value it just
   * produced. Without it, dragging to the bottom of the square writes black,
   * which reads back as hue 0 and saturation 0, and the next drag starts grey.
   */
  private owned = false

  /** The overlay, placed against the field for the reason Input Date gives. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.renderRoot?.querySelector<HTMLElement>('[part="field"]'),
    boundary: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
    offset: () => 8,
    onDismiss: () => this.requestOpen(false),
    placement: 'bottom-start',
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
  })

  private get control(): HTMLInputElement | null {
    if (typeof this.renderRoot?.querySelector !== 'function') {
      return null
    }
    return this.renderRoot.querySelector<HTMLInputElement>('[part="control"]')
  }

  /**
   * Where the panel stands: what was moved, or what the value says, or the start.
   *
   * A getter rather than state seeded in `updated`, which is what an earlier
   * version did and is wrong on the server, where `updated` never runs. Every
   * server render shipped the starting colour, so the square painted a red ramp
   * under a blue already in the field and corrected it a frame later.
   */
  private get color(): Color {
    return this.moved ?? parseColor(this.value) ?? START
  }

  /** The presets, as written, with anything that is not a colour dropped. */
  private get presets(): string[] {
    return this.swatches
      .split(',')
      .map((one) => one.trim())
      .filter((one) => parseColor(one) !== null)
  }

  /** Moves part of the model and writes the value that follows from it. */
  private readonly move = (next: Partial<Color>): void => {
    this.moved = { ...this.color, ...next }
    this.owned = true
    this.requestValue(formatColor(this.moved, this.format, this.alpha))
    this.restore()
  }

  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    this.requestValue((event.target as HTMLInputElement).value)
    this.restore()
  }

  /** Takes a preset, in this field's syntax rather than as the preset spelled it. */
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
   * Samples a colour from anywhere on the screen.
   *
   * The panel is shut for the duration and put back after. `EyeDropper` takes
   * the pointer over, and a floating panel left up during it is one the reader
   * cannot dismiss and may well be trying to sample from underneath.
   */
  private readonly handleEyeDropper = async (): Promise<void> => {
    const Dropper = (globalThis as { EyeDropper?: EyeDropperConstructor }).EyeDropper
    if (!Dropper) {
      return
    }
    this.requestOpen(false)
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
    this.requestOpen(true)
  }

  /**
   * Puts the field back where the answer differs from what was typed.
   *
   * `requestValue` announces and decides; this is the other half, which Input
   * and Input Date both need for the same reason: the native control has already
   * changed, so wherever the answer does not follow it, it has to be restored. A
   * refusal and a consumer who owns `value` and has not given a new one are the
   * same thing from here.
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
    const control = this.control
    if (!control) {
      return
    }
    /* Checked here rather than left to the input, which is `text` and has no
       idea what a colour is. `type="color"` is what was given up to own the
       panel, and it would not have helped: it has no invalid state, because it
       cannot hold one. */
    if (this.value !== '' && parseColor(this.value) === null) {
      this.internals.setValidity(
        { badInput: true },
        'Enter a colour, like #ff0000, rgb(255 0 0) or hsl(0 100% 50%).',
        control,
      )
    } else {
      this.internals.setValidity(control.validity, control.validationMessage, control)
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
      grid.setPointerCapture(event.pointerId)
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

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    // Whatever the markup arrived with, so a form knows before anything is typed.
    this.sync()
    this.sampling = 'EyeDropper' in globalThis
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value')) {
      this.sync()
      /* Let go only where the value came from somewhere else, so the getter
         reads that value instead. `owned` is cleared here rather than where it
         is set, so it covers exactly the one update the panel caused. */
      if (this.owned) {
        this.owned = false
      } else {
        this.moved = undefined
      }
    }
    /* Driven from here rather than from the toggle, because `open` is a property
       a consumer may set directly and the panel has to follow either way. The
       controller is idempotent, so arriving twice for one open costs nothing.
       Without this the surface stays `display: none`, a `popover` element being
       hidden until something shows it, and the square measures zero, which is
       the one measurement a drag cannot work without. */
    if (this.open) {
      this.panel.show()
    } else {
      this.panel.hide()
    }
  }

  /** Puts the caret in the field, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /** One of the ramps under the square. */
  private renderChannel(
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

  protected override render(): TemplateResult {
    const color = this.color
    const painted = toCss(color)
    return html`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        <input
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
        />
        <button
          part="trigger"
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
            style="--_color: ${this.value === '' ? 'transparent' : painted}"
          ></span>
          <slot name="trigger"></slot>
        </button>
      </div>

      <div
        part="surface"
        id="surface"
        popover="manual"
        style="--_hue: ${color.hue}; --_color: ${painted}"
        ?hidden=${!this.open}
      >
        <div
          part="grid"
          style="--_saturation: ${color.saturation}%; --_brightness: ${color.brightness}%"
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

        <div part="controls">
          ${
            this.sampling
              ? html`<button
                  part="eyedropper"
                  type="button"
                  aria-label="Sample a colour from the screen"
                  ?disabled=${this.isDisabled}
                  @click=${this.handleEyeDropper}
                ></button>`
              : nothing
          }
          <span part="sample"></span>
          <div part="channels">
            ${this.renderChannel('hue', 'Hue', 360, color.hue)}
            ${this.alpha ? this.renderChannel('alpha', 'Opacity', 100, color.alpha) : nothing}
          </div>
        </div>

        <!-- The syntax and the presets share a row, because neither fills one.
             Above them the ramps get the whole width, which is what they need:
             with the two controls stacked in a column beside them the hue bar
             was eighty pixels, and a hue is picked out of three hundred and
             sixty of them. -->
        <div part="footer">
          ${
            this.noFormat
              ? nothing
              : html`<button
                  part="format"
                  type="button"
                  aria-label=${`Syntax: ${this.format}. Change it.`}
                  ?disabled=${this.isDisabled}
                  @click=${this.handleFormat}
                >
                  ${this.format}
                </button>`
          }
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
        </div>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-input-color': HelixBaseInputColor
  }
}
