import {
  customElement,
  FullscreenController,
  HelixElement,
  HelixMapPanEvent,
  HelixMapZoomEvent,
  hostAria,
  IdleController,
  inlineStep,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** Which way a press or a key asked the map to go. */
type Way = 'up' | 'down' | 'start' | 'end'

/** Where the controls sit, in the corner words the rest of the library uses. */
export type MapControlsPlacement = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'

/**
 * @summary A frame around somebody else's map.
 *
 * @description
 * **Helix draws no map.** There are no tiles here, no projection and no
 * network, and there should not be: a tile renderer is a library, and what a
 * design system can add to MapLibre or Leaflet is the frame. The consumer slots
 * their map and this owns the box, the name, the controls and the way out,
 * which is the shape `VideoPlaylist` uses for a player it never renders.
 *
 * **The accessibility argument is the reason this exists**, and it was measured
 * rather than assumed: a map embedded the ordinary way is a canvas with no role
 * and no name, and it has *no node at all* in the accessibility tree. A reader
 * using a screen reader does not walk past it so much as never meet it. A named
 * region with controls in it is the whole of the difference.
 *
 * **The controls are buttons, and that is a deliberate choice against arrow
 * keys.** Arrows work here too, but what a screen reader does with them is not
 * ours to decide: macOS passes them through, Windows readers hold them for
 * their own reading mode unless a page takes `role="application"`, which costs
 * the reader their normal way of reading everything else in the frame. A button
 * is findable and operable in every screen reader on every platform without
 * that bargain, so panning and zooming are buttons first and keys second.
 *
 * **Nothing here moves the map.** Both controls ask, through `helix-map-pan`
 * and `helix-map-zoom`, and the consumer answers against whatever they slotted.
 * A frame that moved the map would have to know whose map it was.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases Map frame, Map container, Geo
 * @documentation https://fusion.dev/helix/components/map
 *
 * @slot - The map, which is the consumer's own.
 * @slot attribution - Whoever the tiles belong to, which most licenses require you to say.
 * @slot footer - Chrome below the map, such as a legend or a scale.
 * @slot header - Chrome above the map, such as a title or a search field.
 *
 * @event {HelixMapPanEvent} helix-map-pan - The reader asked the map to move. Answer it against your own map.
 * @event {HelixMapZoomEvent} helix-map-zoom - The reader asked the map to zoom, by a direction rather than to a level.
 *
 * @csspart attribution - The strip the credit sits in, under the map.
 * @csspart controls - The group the pan and zoom buttons sit in.
 * @csspart footer - The strip below the map, for what a consumer slots there.
 * @csspart fullscreen - The button that fills the screen.
 * @csspart header - The strip above the map, for what a consumer slots there.
 * @csspart pan-down - The button that moves the map down.
 * @csspart pan-end - The button that moves the map the way the text ends, which is right on an English page.
 * @csspart pan-start - The button that moves the map the way the text starts, which is left on an English page.
 * @csspart pan-up - The button that moves the map up.
 * @csspart region - The named region the map is slotted into.
 * @csspart viewport - The box the map is drawn in.
 * @csspart zoom-in - The button that zooms in.
 * @csspart zoom-out - The button that zooms out.
 *
 * @cssstate fullscreen - While the frame fills the screen.
 * @cssstate idle - While the reader has been still long enough to hide the chrome.
 */
@customElement('helix-headless-map')
export class HelixHeadlessMap extends HelixElement {
  /**
   * Which of the controls this frame draws, as a list of what to keep.
   *
   * **A list rather than a switch, because the overlap is not symmetric.**
   * Every map library draws zoom controls and none of them draws pan buttons:
   * MapLibre's navigation control is zoom and a compass, Leaflet's is zoom,
   * Google's is zoom. So a consumer slotting one of those has our zoom twice
   * over and our pan pad not at all, and a single switch would make them choose
   * between a duplicate and nothing.
   *
   * `none` draws none of them, which is the right answer where the slotted map
   * already has controls a reader can find: what this family argues for is that
   * *a* findable control exists, never that it is ours. The methods stay public
   * either way, so a consumer drawing their own chrome can still drive the
   * frame.
   *
   * Absent is all three, which is this library's rule that a resting value is an
   * attribute's absence, and it is what the stylesheet asks about: the layout
   * rules are written against `[controls]:not([controls~="zoom"])` rather than
   * the bare negation, or a frame that named no list at all would be laid out as
   * though it had dropped everything.
   */
  @property({ reflect: true })
  controls?: string

  /**
   * Which corner the controls sit in.
   *
   * **Configurable because there is no safe default**, and this is a collision
   * rather than a taste: MapLibre puts its own controls at the top end, Leaflet
   * and OpenLayers at the top start, Google's zoom at the bottom end. Whichever
   * corner this took would land on somebody's, which is why every one of those
   * libraries made it a setting too.
   *
   * Logical corners rather than left and right, so a right-to-left page moves
   * them without a consumer writing a second rule.
   *
   * Absent is the top end, which is this library's rule that a resting value is
   * an attribute's absence: a default that reflected would write an attribute
   * onto every host that no server sent and nobody asked for.
   */
  @property({ attribute: 'controls-placement', reflect: true })
  controlsPlacement?: MapControlsPlacement

  /** What the control that fills the screen is called. */
  @property({ attribute: 'fullscreen-label' })
  fullscreenLabel = 'Fill the screen'

  /**
   * How long the reader may be still before the chrome hides, in milliseconds.
   *
   * Zero keeps it up, which is the default: a map's controls are how a keyboard
   * reader operates it, and chrome that hides itself by default would be this
   * component undoing its own argument. Set it for a display map nobody drives.
   */
  @property({ attribute: 'idle-delay', type: Number })
  idleDelay = 0

  /**
   * Accessible name for the map, which is the one thing a consumer must write.
   *
   * There is no sensible default. "Map" names the widget rather than the place,
   * and a reader meeting three of them on a page learns nothing from hearing the
   * same word three times.
   */
  @property()
  label = ''

  /**
   * What the controls are called, for a page not in English.
   */
  @property({ attribute: 'pan-label' })
  panLabel = 'Pan {way}'

  /**
   * How far one press moves the map, as a fraction of what is on screen.
   *
   * A fraction rather than a distance, because this frame does not know the
   * scale of what is inside it: a quarter of the viewport is the same gesture at
   * street level and at country level, and a consumer who wants metres can
   * multiply by their own.
   */
  @property({ attribute: 'pan-step', type: Number })
  panStep = 0.25

  /** What the zoom controls are called. */
  @property({ attribute: 'zoom-in-label' })
  zoomInLabel = 'Zoom in'

  /** What the zoom control that goes the other way is called. */
  @property({ attribute: 'zoom-out-label' })
  zoomOutLabel = 'Zoom out'

  /** Whether the reader has been still long enough to hide the chrome. */
  @state()
  private resting = false

  /** Whether the frame is filling the screen. */
  @state()
  private filled = false

  private readonly fullscreen = new FullscreenController(this, (full) => {
    this.filled = full
  })

  private readonly idle = new IdleController(
    this,
    () => this.idleDelay,
    (resting) => {
      this.resting = resting
    },
  )

  /** Whether a named group of controls is one this frame draws. */
  private draws(group: 'pan' | 'zoom' | 'fullscreen'): boolean {
    return this.controls === undefined ? true : this.controls.split(/\s+/).includes(group)
  }

  /** Fills the screen with the frame, or comes back. */
  toggleFullscreen(): void {
    void this.fullscreen.toggle()
  }

  /** Asks for the map to move, which the consumer answers. */
  pan(to: Way): void {
    this.dispatchEvent(new HelixMapPanEvent({ by: this.panStep, to }))
  }

  /** Asks for the map to zoom, `1` in and `-1` out. */
  zoom(by: number): void {
    this.dispatchEvent(new HelixMapZoomEvent({ by }))
  }

  /**
   * The arrow keys, which are the second way rather than the only one.
   *
   * `inlineStep` rather than a test against `ArrowLeft`, so the reader on a
   * right-to-left page gets `end` from the key that points the way their text
   * runs, which is what the pan buttons say too.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const along = inlineStep(this, event.key)
    if (along === 1) {
      event.preventDefault()
      this.pan('end')
    } else if (along === -1) {
      event.preventDefault()
      this.pan('start')
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      this.pan('up')
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.pan('down')
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      this.zoom(1)
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      this.zoom(-1)
    }
  }

  /**
   * Starts the wait, so a map nobody has touched counts as still.
   *
   * Without this the timer only ever starts on a pointer or a focus, and a frame
   * rendered on a page the reader never reaches stays awake for as long as the
   * page is open: the chrome a consumer asked to hide would hide only after
   * being used once, which is the opposite of what an idle delay is for.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.idle.stir()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The host carries the name, so a consumer's own `aria-label` is the thing
       that wins rather than fighting an attribute this wrote. */
    hostAria(this.internals, { label: this.label })
    this.toggleState('fullscreen', this.filled)
    this.toggleState('idle', this.resting)
  }

  /**
   * What one pan button is called, with the way it goes filled in.
   *
   * Left and right rather than start and end, because the label is read aloud
   * and a reader knows which way left is. The event keeps the reading-order
   * name, which is the one a right-to-left page needs.
   */
  private named(way: Way): string {
    const spoken = way === 'start' ? 'left' : way === 'end' ? 'right' : way
    return this.panLabel.replace('{way}', spoken)
  }

  /**
   * The controls, or nothing where a consumer kept none of them.
   *
   * **Written out rather than generated**, because a part name behind an
   * interpolation is a part the manifest cannot see: it would publish `pan-`
   * and a consumer's `::part(pan-up)` would match nothing. The same cost
   * `drawIcon` names for `Trend`.
   */
  private renderControls(): TemplateResult | typeof nothing {
    const pan = this.draws('pan')
    const zoom = this.draws('zoom')
    const fullscreen = this.draws('fullscreen')
    if (!pan && !zoom && !fullscreen) {
      return nothing
    }
    return html`<div part="controls" role="group" aria-label="Map controls">
      ${
        pan
          ? html`<button part="pan-up" aria-label=${this.named('up')} type="button" @click=${() => this.pan('up')}>
                ↑
              </button>
              <button part="pan-start" aria-label=${this.named('start')} type="button" @click=${() => this.pan('start')}>
                ←
              </button>
              <button part="pan-end" aria-label=${this.named('end')} type="button" @click=${() => this.pan('end')}>
                →
              </button>
              <button part="pan-down" aria-label=${this.named('down')} type="button" @click=${() => this.pan('down')}>
                ↓
              </button>`
          : nothing
      }
      ${
        zoom
          ? html`<button part="zoom-in" aria-label=${this.zoomInLabel} type="button" @click=${() => this.zoom(1)}>
                +
              </button>
              <button part="zoom-out" aria-label=${this.zoomOutLabel} type="button" @click=${() => this.zoom(-1)}>
                −
              </button>`
          : nothing
      }
      ${
        fullscreen
          ? html`<button
              part="fullscreen"
              aria-label=${this.fullscreenLabel}
              aria-pressed=${this.filled ? 'true' : 'false'}
              type="button"
              @click=${this.toggleFullscreen}
            >
              ⤢
            </button>`
          : nothing
      }
    </div>`
  }

  /**
   * The frame, with each region in a box of its own.
   *
   * **The boxes are load-bearing rather than tidiness.** A `<slot>` is
   * `display: contents`, so what lands in the grid is whatever a consumer
   * assigned rather than the slot itself: with no header slotted, the viewport
   * took the first row and the attribution took the `1fr`, and the map collapsed
   * to the height of one line of text. Which slots a consumer fills is not
   * something the layout may depend on, so each region is a box that holds its
   * row whether or not anything is in it, and an empty one is a row of no
   * height.
   */
  protected override render(): TemplateResult {
    return html`<div
      part="region"
      role="group"
      aria-label=${this.label || 'Map'}
      @focusin=${this.idle.stir}
      @keydown=${this.handleKeydown}
      @pointerleave=${this.idle.leave}
      @pointermove=${this.idle.stir}
    >
      <div part="header">
        <slot name="header"></slot>
      </div>
      <div part="viewport">
        <slot></slot>
      </div>
      ${this.renderControls()}
      <div part="footer">
        <slot name="footer"></slot>
      </div>
      <div part="attribution">
        <slot name="attribution"></slot>
      </div>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map': HelixHeadlessMap
  }
}
