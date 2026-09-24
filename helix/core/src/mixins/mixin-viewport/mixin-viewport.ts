import { html, type LitElement, nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { FullscreenController } from '../../controllers/fullscreen-controller/fullscreen-controller.js'
import { IdleController } from '../../controllers/idle-controller/idle-controller.js'
import type { ViewportPanDetail, ViewportZoomDetail } from '../../events/events.js'
import { inlineStep } from '../../utils/inline-step/inline-step.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/** Which way a press or a key asked the surface to go. */
export type ViewportWay = 'up' | 'down' | 'start' | 'end'

/** Where the controls sit, in the corner words the rest of the library uses. */
export type ViewportControlsPlacement = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'

/**
 * The API a pan-and-zoom surface has, as TypeScript sees it.
 */
export declare class ViewportElement {
  /** Which of the controls the surface draws, as a list of what to keep. */
  controls?: string

  /** Which corner the controls sit in. */
  controlsPlacement?: ViewportControlsPlacement

  /** What the control that fills the screen is called. */
  fullscreenLabel: string

  /** How long the reader may be still before the chrome hides, in milliseconds. */
  idleDelay: number

  /** What one pan control is called, with `{way}` filled in. */
  panLabel: string

  /** How far one press moves the view, as a fraction of what is on screen. */
  panStep: number

  /** What the control that zooms in is called. */
  zoomInLabel: string

  /** What the control that zooms out is called. */
  zoomOutLabel: string

  /** Asks for the view to move, which the consumer answers. */
  pan(to: ViewportWay): void

  /** Asks for the view to zoom, `1` in and `-1` out. */
  zoom(by: number): void

  /** Fills the screen with the surface, or comes back. */
  toggleFullscreen(): void

  /** Whether the reader has been still long enough to hide the chrome. */
  protected resting: boolean

  /** Whether the surface is filling the screen. */
  protected filled: boolean

  /** How long the reader has been still, which the family's own frame stirs. */
  protected readonly idle: IdleController

  /** Into the screen and back, for a family that offers its own way in. */
  protected readonly fullscreen: FullscreenController

  /** The key relay, bound by the family's own frame. */
  protected handleKeydown: (event: KeyboardEvent) => void

  /** What the group of controls is called, for a family that is not a map. */
  protected get controlsLabel(): string

  /** The pan event, built and not dispatched, for a family that names its own. */
  protected panEvent(detail: ViewportPanDetail): Event

  /** The zoom event, built and not dispatched, for a family that names its own. */
  protected zoomEvent(detail: ViewportZoomDetail): Event

  /** The controls, or nothing where the surface keeps none of them. */
  protected renderControls(): TemplateResult | typeof nothing
}

/**
 * Grafts a pan-and-zoom surface: its controls, its keys, and the way out.
 *
 * **Nothing here is geographic, which is why it is here.** `Map` was written
 * first and its frame turned out to be a surface a reader can move, fill the
 * screen with, and stop touching: a canvas of notes and a graph of nodes want
 * the same four hundred lines, and the only thing that made them Map's was
 * being written there. Extracted before the second consumer rather than after,
 * which is the opposite of what [#383](queue.md) had to conclude about a
 * controller promoted ahead of one.
 *
 * **Nothing here moves anything, either.** Both controls ask, through an event
 * a family names, and the answer is the consumer's: the surface a reader is
 * looking at belongs to them, whether it is a tile renderer, a canvas or a
 * force layout. A mixin that moved the view would have to know what the view
 * was.
 *
 * **The controls are buttons, and that is a decision against arrow keys.** They
 * work too, but what a screen reader does with them is not ours to decide:
 * macOS passes them through, Windows readers hold them for their own reading
 * mode unless a page takes `role="application"`, which costs the reader their
 * normal way of reading everything else. A button is findable and operable in
 * every screen reader on every platform without that bargain.
 *
 * **What stays in the family is `render()`, its slots and its part
 * documentation**, because a part named through an interpolation is one the
 * manifest cannot see: a loop over the four pan buttons would publish `pan-`
 * and a consumer's `::part(pan-up)` would match nothing.
 */
export const MixinViewport = <T extends Constructor<LitElement>>(Base: T) => {
  class Viewport extends Base {
    /**
     * Which of the controls this surface draws, as a list of what to keep.
     *
     * **A list rather than a switch, because the overlap is not symmetric.** A
     * surface a consumer brings often has zoom controls of its own and almost
     * never has pan buttons, so a single switch would make them choose between
     * a duplicate and nothing.
     *
     * `none` draws none of them, which is the right answer where what was
     * slotted already has controls a reader can find: what this argues for is
     * that *a* findable control exists, never that it is ours. The methods stay
     * public either way, so a consumer drawing their own chrome can still drive
     * the surface.
     *
     * Absent is all three, which is this library's rule that a resting value is
     * an attribute's absence, and it is what the stylesheet asks about: the
     * layout rules are written against `[controls]:not([controls~="zoom"])`
     * rather than the bare negation, or a surface that named no list at all
     * would be laid out as though it had dropped everything.
     */
    @property({ reflect: true })
    controls?: string

    /**
     * Which corner the controls sit in.
     *
     * **Configurable because there is no safe default**, which is a collision
     * rather than a taste: whatever a consumer slots may put its own controls
     * in any corner, and every library that draws some made this a setting for
     * the same reason.
     *
     * Logical corners rather than left and right, so a right-to-left page moves
     * them without a consumer writing a second rule. Absent is the top end, a
     * resting value being an attribute's absence: a default that reflected
     * would write an attribute onto every host that no server sent.
     */
    @property({ attribute: 'controls-placement', reflect: true })
    controlsPlacement?: ViewportControlsPlacement

    /** What the control that fills the screen is called. */
    @property({ attribute: 'fullscreen-label' })
    fullscreenLabel = 'Fill the screen'

    /**
     * How long the reader may be still before the chrome hides, in milliseconds.
     *
     * Zero keeps it up, which is the default: these controls are how a keyboard
     * reader operates the surface, and chrome that hid itself by default would
     * be the component undoing its own argument. Set it for a display nobody
     * drives.
     */
    @property({ attribute: 'idle-delay', type: Number })
    idleDelay = 0

    /**
     * What one pan control is called, with `{way}` filled in.
     */
    @property({ attribute: 'pan-label' })
    panLabel = 'Pan {way}'

    /**
     * How far one press moves the view, as a fraction of what is on screen.
     *
     * A fraction rather than a distance, because this surface does not know the
     * scale of what is inside it: a quarter of the viewport is the same gesture
     * at any zoom, and a consumer who wants their own units multiplies by them.
     */
    @property({ attribute: 'pan-step', type: Number })
    panStep = 0.25

    /** What the control that zooms in is called. */
    @property({ attribute: 'zoom-in-label' })
    zoomInLabel = 'Zoom in'

    /** What the control that zooms out is called. */
    @property({ attribute: 'zoom-out-label' })
    zoomOutLabel = 'Zoom out'

    /** Whether the reader has been still long enough to hide the chrome. */
    @state()
    protected resting = false

    /** Whether the surface is filling the screen. */
    @state()
    protected filled = false

    protected readonly fullscreen = new FullscreenController(this, (full) => {
      this.filled = full
    })

    protected readonly idle = new IdleController(
      this,
      () => this.idleDelay,
      (resting) => {
        this.resting = resting
      },
    )

    /**
     * What the group of controls is called.
     *
     * A getter rather than a string in the template, so a family that is not a
     * map does not announce one. Not a property: what this group is called is a
     * fact about the family rather than a choice a consumer makes per instance,
     * and the labels a consumer does set are the ones on the controls
     * themselves.
     */
    protected get controlsLabel(): string {
      return 'View controls'
    }

    /**
     * The pan event, which the family names and this one does not.
     *
     * **No default, and the analyzer is why as much as the taste is.** A mixin
     * that built a `helix-map-pan` would put it in the manifest of every family
     * that composed the surface, since a mixin's code is resolved into its
     * users: a canvas would be documented as dispatching a map's event, and a
     * consumer reading the reference page would believe it. So the surface
     * carries no event name at all, and a family that forgets to name one hears
     * about it the first time a reader presses an arrow.
     */
    protected panEvent(_detail: ViewportPanDetail): Event {
      throw new Error(
        `<${this.localName}> composes MixinViewport and must implement panEvent(), the surface naming no event of its own.`,
      )
    }

    /** The zoom event, which the family names, for the same reason. */
    protected zoomEvent(_detail: ViewportZoomDetail): Event {
      throw new Error(
        `<${this.localName}> composes MixinViewport and must implement zoomEvent(), the surface naming no event of its own.`,
      )
    }

    /** Asks for the view to move, which the consumer answers. */
    pan(to: ViewportWay): void {
      this.dispatchEvent(this.panEvent({ by: this.panStep, to }))
    }

    /** Asks for the view to zoom, `1` in and `-1` out. */
    zoom(by: number): void {
      this.dispatchEvent(this.zoomEvent({ by }))
    }

    /** Fills the screen with the surface, or comes back. */
    toggleFullscreen(): void {
      void this.fullscreen.toggle()
    }

    /** Whether a named group of controls is one this surface draws. */
    private draws(group: 'pan' | 'zoom' | 'fullscreen'): boolean {
      return this.controls === undefined ? true : this.controls.split(/\s+/).includes(group)
    }

    /**
     * What one pan control is called, with the way it goes filled in.
     *
     * Left and right rather than start and end, because the label is read aloud
     * and a reader knows which way left is. The event keeps the reading-order
     * name, which is the one a right-to-left page needs.
     */
    private named(way: ViewportWay): string {
      const spoken = way === 'start' ? 'left' : way === 'end' ? 'right' : way
      return this.panLabel.replace('{way}', spoken)
    }

    /**
     * Starts the wait, so a surface nobody has touched counts as still.
     *
     * Without this the timer only ever starts on a pointer or a focus, and a
     * surface on a page the reader never reaches stays awake for as long as the
     * page is open: the chrome a consumer asked to hide would hide only after
     * being used once, which is the opposite of what an idle delay is for.
     */
    protected override firstUpdated(changed: Parameters<LitElement['firstUpdated']>[0]): void {
      super.firstUpdated(changed)
      this.idle.stir()
    }

    /**
     * The arrow keys, which are the second way rather than the only one.
     *
     * `inlineStep` rather than a test against `ArrowLeft`, so the reader on a
     * right-to-left page moves the way their text runs, which is what the pan
     * controls say too.
     *
     * **Only from the surface's own frame, and that is the difference between
     * one move and two.** What a consumer slots may answer the arrow keys
     * itself, and a press relayed from inside it moves their view once on its
     * own and once more on the event this would send. The rule is the region
     * and the controls rather than the whole shadow root, because a family with
     * its own focusable content in there, a list of notes beside a canvas,
     * would otherwise pan the surface out from under a reader arrowing through
     * it.
     */
    protected readonly handleKeydown = (event: KeyboardEvent): void => {
      const target = event.target as Element | null
      const own = target?.closest('[part="region"], [part~="controls"]')
      if (!own || !this.renderRoot.contains(own)) {
        return
      }
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
     * The controls, or nothing where a consumer kept none of them.
     *
     * **Written out rather than generated**, because a part name behind an
     * interpolation is a part the manifest cannot see: a loop would publish
     * `pan-` and a consumer's `::part(pan-up)` would match nothing.
     */
    protected renderControls(): TemplateResult | typeof nothing {
      const pan = this.draws('pan')
      const zoom = this.draws('zoom')
      const fullscreen = this.draws('fullscreen')
      if (!pan && !zoom && !fullscreen) {
        return nothing
      }
      return html`<div part="controls" role="group" aria-label=${this.controlsLabel}>
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
  }

  return Viewport as unknown as Constructor<ViewportElement> & T
}
