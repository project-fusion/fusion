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

/**
 * The channels the panel moves: degrees, and three percentages.
 *
 * Alpha as a percentage rather than the fraction it is in the hex, so all four
 * are whole numbers on a slider whose step is one. A range from zero to one
 * steps to zero or one and nothing between, which is a checkbox with a track.
 */
interface Channels {
  alpha: number
  hue: number
  lightness: number
  saturation: number
}

/**
 * Where a panel starts when there is nothing to start from.
 *
 * Not black, which is what `<input type="color">` opens on. Black is
 * `saturation: 0, lightness: 0`, and from there the hue slider moves nothing and
 * the saturation slider moves nothing: two of the three controls are dead until
 * the reader happens to raise lightness first. Pure red is the nearest colour
 * where every slider does something the moment it is touched.
 */
const START: Channels = { alpha: 100, hue: 0, lightness: 50, saturation: 100 }

/** `#rgb`, `#rgba`, `#rrggbb` and `#rrggbbaa`, or `null` for anything else. */
const parseHex = (
  value: string,
): { alpha: number; blue: number; green: number; red: number } | null => {
  const text = value.trim().replace(/^#/, '')
  const short = text.length === 3 || text.length === 4
  const long = text.length === 6 || text.length === 8
  if ((!short && !long) || !/^[\da-f]+$/i.test(text)) {
    return null
  }
  const width = short ? 1 : 2
  const channel = (index: number): number => {
    const piece = text.slice(index * width, index * width + width)
    return Number.parseInt(short ? piece + piece : piece, 16)
  }
  return {
    alpha: text.length === 4 || text.length === 8 ? channel(3) / 255 : 1,
    blue: channel(2),
    green: channel(1),
    red: channel(0),
  }
}

/** Hex to the channels, or `null` where it is not a colour. */
const toChannels = (value: string): Channels | null => {
  const rgb = parseHex(value)
  if (!rgb) {
    return null
  }
  const red = rgb.red / 255
  const green = rgb.green / 255
  const blue = rgb.blue / 255
  const high = Math.max(red, green, blue)
  const low = Math.min(red, green, blue)
  const span = high - low
  const lightness = (high + low) / 2
  let hue = 0
  if (span !== 0) {
    if (high === red) {
      hue = (green - blue) / span + (green < blue ? 6 : 0)
    } else if (high === green) {
      hue = (blue - red) / span + 2
    } else {
      hue = (red - green) / span + 4
    }
    hue *= 60
  }
  return {
    alpha: Math.round(rgb.alpha * 100),
    hue: Math.round(hue),
    lightness: Math.round(lightness * 100),
    /* Guarded on the span rather than on the lightness, though the divisor is
       zero at both ends of the latter: a colour with no span is grey, and a grey
       has no saturation to compute, so the one guard covers both. */
    saturation: span === 0 ? 0 : Math.round((span / (1 - Math.abs(2 * lightness - 1))) * 100),
  }
}

/** The channels back to hex, with the alpha byte only where it is asked for. */
const toHex = (channels: Channels, withAlpha: boolean): string => {
  const hue = (((channels.hue % 360) + 360) % 360) / 60
  const saturation = channels.saturation / 100
  const lightness = channels.lightness / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const middle = chroma * (1 - Math.abs((hue % 2) - 1))
  const base = lightness - chroma / 2
  const sextants: [number, number, number][] = [
    [chroma, middle, 0],
    [middle, chroma, 0],
    [0, chroma, middle],
    [0, middle, chroma],
    [middle, 0, chroma],
    [chroma, 0, middle],
  ]
  /* Destructured rather than indexed three times, so the sextant is looked up
     once and the three come out as numbers: an index into an array is
     `number | undefined` here, and the fallback has to be a tuple to say
     otherwise. Six sextants and a modulo six, so the fallback never runs. */
  const [red, green, blue] = sextants[Math.floor(hue) % 6] ?? [0, 0, 0]
  const byte = (one: number): string =>
    Math.round((one + base) * 255)
      .toString(16)
      .padStart(2, '0')
  const hex = `#${byte(red)}${byte(green)}${byte(blue)}`
  if (!withAlpha) {
    return hex
  }
  /* Its own arithmetic rather than `byte`, which folds in the lightness base the
     three colour channels are measured from. Alpha is not measured from
     anything. */
  const opacity = Math.round((channels.alpha / 100) * 255)
    .toString(16)
    .padStart(2, '0')
  return hex + opacity
}

/**
 * @summary A colour, typed as hex or moved on its channels.
 *
 * @description
 * **The channels are `helix-slider`, not four bespoke tracks.** A real
 * `<input type="range">` brings the drag, the arrow keys, Home and End, the page
 * keys, and a hit area the platform sizes for a finger. Every one of those is a
 * thing a hand-built track gets wrong, and the last is the one nobody notices.
 *
 * **There is no saturation-and-lightness square, and that is a deliberate loss.**
 * The square is the convention, and it is faster for a sighted reader with a
 * mouse. It is also a two-dimensional control with no semantics: `role="slider"`
 * describes one axis, and the alternatives are to invent a widget a screen
 * reader has never met or to ship a control a keyboard cannot reach. Three
 * labelled sliders are slower and operable by everyone, which is the trade taken
 * here. A square could be added later as a second way to reach the same
 * channels; it cannot be added as the only way.
 *
 * **The channels are the state, and the hex is derived from them.** The reverse
 * loses colours: hex to channels and back is exact, but the channels of black
 * are `hue: 0, saturation: 0`, so a reader who drags lightness to zero and back
 * gets grey where they had red. Holding the channels means the hue survives a
 * trip through a colour that has none. A value arriving from outside, or typed
 * into the field, is read into the channels once, which is the only moment the
 * conversion runs in that direction.
 *
 * **The value is hex, always**: `#rrggbb`, or `#rrggbbaa` where `alpha` is set.
 * That is what a form submits and what `<input type="color">` speaks, so a
 * server that already understands one understands this. What the field *shows*
 * is the same string, for the reason Input Date gives about its dates: half-typed
 * input does not survive a round trip through a formatter.
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
 * @csspart control - The text input carrying the hex.
 * @csspart trigger - The control that opens the panel.
 * @csspart preview - The chip showing the colour, inside the trigger.
 * @csspart surface - The floating panel.
 * @csspart channels - The column of sliders.
 * @csspart channel - One slider.
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
   * Off by default, because it widens the value from `#rrggbb` to `#rrggbbaa`
   * and a consumer who did not ask for transparency should not have to strip a
   * byte off every value they store.
   */
  @property({ reflect: true, type: Boolean })
  alpha = false

  /** What the field says before a colour is in it. */
  @property()
  placeholder = '#000000'

  /** Colours offered under the sliders, as a comma-separated hex list. */
  @property()
  swatches = ''

  /** Accessible name for the control that opens the panel. */
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose a colour'

  /**
   * The channels the reader has moved, or nothing while none have been.
   *
   * Held rather than re-read, which is the whole point: see the class
   * description. Cleared whenever a value arrives from somewhere other than
   * these sliders, so the next reading comes from that value instead.
   */
  @state()
  private moved: Channels | undefined

  /**
   * Whether the value on this element was produced by its own sliders.
   *
   * The one bit that keeps the channels from being overwritten by the hex they
   * just produced. Without it, moving lightness to zero writes `#000000`, which
   * reads back as `hue: 0, saturation: 0`, and the next drag starts from grey.
   */
  private owned = false

  /** The overlay, placed against the field for the reason Input Date gives. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.renderRoot?.querySelector<HTMLElement>('[part="field"]'),
    boundary: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
    offset: () => 4,
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
   * Where the sliders stand: what was moved, or what the value says, or the start.
   *
   * A getter rather than state seeded in `updated`, which is what this was and
   * is wrong on the server. `updated` never runs there, so every server render
   * shipped the starting channels: `#3366ff` is hue 220, and the markup said
   * hue 0, which paints the saturation and lightness tracks red under a blue
   * that is already in the field. Caught by the SSR spec, and invisible in a
   * browser, where the first client render corrects it a frame later.
   */
  private get channels(): Channels {
    return this.moved ?? toChannels(this.value) ?? START
  }

  /** The presets, as written, with anything that is not a colour dropped. */
  private get presets(): string[] {
    return this.swatches
      .split(',')
      .map((one) => one.trim())
      .filter((one) => parseHex(one) !== null)
  }

  /** The colour the preview and the sliders paint, ready for CSS. */
  private get shown(): string {
    return parseHex(this.value) ? this.value : 'transparent'
  }

  /** Moves one channel and writes the hex that follows from it. */
  private readonly moveChannel = (name: keyof Channels, next: number): void => {
    this.moved = { ...this.channels, [name]: next }
    this.owned = true
    this.requestValue(toHex(this.channels, this.alpha))
    this.restore()
  }

  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    this.requestValue((event.target as HTMLInputElement).value)
    this.restore()
  }

  private readonly handleSwatch = (color: string): void => {
    this.requestValue(color)
    this.restore()
    this.requestOpen(false)
    this.updateComplete.then(() => this.control?.focus())
  }

  /**
   * Puts the field back where the answer differs from what was typed.
   *
   * `requestValue` announces and decides; this is the other half, which Input and
   * Input Date both need for the same reason: the native control has already
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
    if (this.value !== '' && parseHex(this.value) === null) {
      this.internals.setValidity({ badInput: true }, 'Enter a colour as #rrggbb.', control)
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

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    // Whatever the markup arrived with, so a form knows before anything is typed.
    this.sync()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value')) {
      this.sync()
      /* Let go only where the value came from somewhere else, so the getter
         reads that value instead. `owned` is cleared here rather than in
         `moveChannel`, so it covers exactly the one update the sliders caused
         and no other. */
      if (this.owned) {
        this.owned = false
      } else {
        this.moved = undefined
      }
    }
    /* Driven from here rather than from the toggle, because `open` is a property
       a consumer may set directly and the panel has to follow either way. The
       controller is idempotent, so arriving twice for the same open costs
       nothing. Without this the surface stays `display: none`, a `popover`
       element being hidden until something shows it, and the sliders inside
       measure zero and cannot be dragged. */
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

  /** One labelled slider, since four of these differ only in their numbers. */
  private renderChannel(
    name: keyof Channels,
    label: string,
    max: number,
    value: number,
  ): TemplateResult {
    return html`<helix-slider
      part="channel"
      data-channel=${name}
      label=${label}
      max=${max}
      min="0"
      .value=${String(value)}
      ?disabled=${this.isDisabled}
      @helix-change=${(event: Event) => {
        event.stopPropagation()
        this.moveChannel(name, Number((event as HelixChangeEvent).detail.value))
      }}
    ></helix-slider>`
  }

  protected override render(): TemplateResult {
    const { alpha, hue, lightness, saturation } = this.channels
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
          <span part="preview" style="--_color: ${this.shown}"></span>
          <slot name="trigger"></slot>
        </button>
      </div>

      <div part="surface" id="surface" popover="manual" ?hidden=${!this.open}>
        <!-- The numbers, written out for the tier above to build its ramps from.
             Data rather than styling, the same arrangement Slider uses for
             \`--_slider-fraction\`: a saturation track has to run from grey to the
             hue currently chosen, and only this element knows what that is. -->
        <div
          part="channels"
          style="--_hue: ${hue}; --_saturation: ${saturation}%; --_lightness: ${lightness}%; --_color: ${this.shown}"
        >
          ${this.renderChannel('hue', 'Hue', 360, hue)}
          ${this.renderChannel('saturation', 'Saturation', 100, saturation)}
          ${this.renderChannel('lightness', 'Lightness', 100, lightness)}
          ${this.alpha ? this.renderChannel('alpha', 'Opacity', 100, alpha) : nothing}
        </div>
        ${
          this.presets.length === 0
            ? nothing
            : html`<div part="swatches" role="group" aria-label="Presets">
                ${this.presets.map(
                  (color) =>
                    html`<button
                      part="swatch"
                      type="button"
                      aria-label=${color}
                      aria-pressed=${
                        this.value.toLowerCase() === color.toLowerCase() ? 'true' : 'false'
                      }
                      style="--_color: ${color}"
                      @click=${() => this.handleSwatch(color)}
                    ></button>`,
                )}
              </div>`
        }
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-input-color': HelixBaseInputColor
  }
}
