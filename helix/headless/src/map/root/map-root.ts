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
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** Which way a press or a key asked the map to go. */
type Way = 'up' | 'down' | 'start' | 'end'

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
 * @csspart controls - The group the pan and zoom buttons sit in.
 * @csspart fullscreen - The button that fills the screen.
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
      <slot name="header"></slot>
      <div part="viewport">
        <slot></slot>
      </div>
      <div part="controls" role="group" aria-label="Map controls">
        <!-- **Written out rather than generated in a loop**, because a part name
             behind an interpolation is a part the manifest cannot see: it would
             publish \`pan-\` and a consumer's \`::part(pan-up)\` would match
             nothing. The same cost \`drawIcon\` names for \`Trend\`. -->
        <button part="pan-up" aria-label=${this.named('up')} type="button" @click=${() => this.pan('up')}>
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
        </button>
        <button part="zoom-in" aria-label=${this.zoomInLabel} type="button" @click=${() => this.zoom(1)}>
          +
        </button>
        <button part="zoom-out" aria-label=${this.zoomOutLabel} type="button" @click=${() => this.zoom(-1)}>
          −
        </button>
        <button
          part="fullscreen"
          aria-label=${this.fullscreenLabel}
          aria-pressed=${this.filled ? 'true' : 'false'}
          type="button"
          @click=${this.toggleFullscreen}
        >
          ⤢
        </button>
      </div>
      <slot name="footer"></slot>
      <slot name="attribution"></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map': HelixHeadlessMap
  }
}
