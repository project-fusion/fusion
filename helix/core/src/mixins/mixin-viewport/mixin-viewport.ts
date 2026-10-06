import { html, type LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { FullscreenController } from '../../controllers/fullscreen-controller/fullscreen-controller.js'
import { IdleController } from '../../controllers/idle-controller/idle-controller.js'
import type { ViewportPanDetail, ViewportZoomDetail } from '../../events/events.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { fillTemplate } from '../../utils/fill-template/fill-template.js'
import { inlineStep } from '../../utils/inline-step/inline-step.js'
import { isRtl } from '../../utils/is-rtl/is-rtl.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/** Which way a press or a key asked the surface to go. */
export type ViewportWay = 'up' | 'down' | 'start' | 'end'

/** Where the controls sit, in the corner words the rest of the library uses. */
export type ViewportControlsPlacement = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'

/** Which gestures a surface takes from the page. */
export type ViewportGestures = 'activate' | 'always' | 'cooperative'

/**
 * Which gestures the thing drawing the surface takes right now: all of them,
 * the cooperative set, or none, while an `activate` surface waits to be pressed.
 */
export type ViewportGestureMode = 'cooperative' | 'free' | 'off'

/** The words a surface says about its gestures, where the page does not say them. */
export interface ViewportGestureLabels {
  /** The hint while an `activate` surface waits to be pressed. */
  activate: string
  /** The hint when one finger swipes over a `cooperative` surface. */
  twoFinger: string
  /** The line while an `activate` surface has the gestures. */
  using: string
  /** The hint when the wheel scrolls past a `cooperative` surface, with `{key}`. */
  wheel: string
}

/** How long a hint shows over the surface, in milliseconds: long enough to read twice. */
const HINT_SHOWS = 1600

/**
 * The API a pan-and-zoom surface has, as TypeScript sees it.
 */
export declare class ViewportElement {
  /** Which controls to show, as a list such as `pan zoom fullscreen`, or `none`. A family adds words of its own. */
  controls?: string

  /** Which corner the controls sit in. */
  controlsPlacement?: ViewportControlsPlacement

  /** The fullscreen button's label. */
  fullscreenLabel: string

  /** Which gestures the surface takes from the page. Unset is the family's own. */
  gestures?: ViewportGestures

  /** The hint while a surface with `gestures="activate"` waits to be pressed. */
  activateHintLabel?: string

  /** The hint when one finger swipes over a surface with `gestures="cooperative"`. */
  twoFingerHintLabel?: string

  /** The line while a surface with `gestures="activate"` has the gestures. */
  usingLabel?: string

  /** The hint when the wheel scrolls past a surface with `gestures="cooperative"`, with `{key}`. */
  wheelHintLabel?: string

  /** @internal Which gestures the thing drawing the surface takes right now. */
  get gestureMode(): ViewportGestureMode

  /** What the surface says about its gestures where the page does not say it, which each family says for itself. */
  protected get restingGestureLabels(): ViewportGestureLabels

  /** Whether an `activate` surface has been pressed, and has the gestures. */
  protected gesturesTaken: boolean

  /** Whether a gesture that started with this event is the surface's to answer. */
  protected gestureAllowed(event: Event): boolean

  /** Says that `gestureMode` changed, for a family that tells a renderer. */
  protected gesturesChanged(): void

  /** The pointer leaving the frame, bound by the family's own region. */
  protected handlePointerLeave: (event: PointerEvent) => void

  /** The hint and the line in use, drawn inside the family's viewport. */
  protected renderGestures(): TemplateResult

  /** How long, in milliseconds, before the header and footer hide when the user is inactive. `0` keeps them visible. */
  idleDelay: number

  /** The pan down button's label. */
  panDownLabel: string

  /** The pan left button's label. */
  panLeftLabel: string

  /** The pan right button's label. */
  panRightLabel: string

  /** How far one press pans the view, as a fraction of its size. */
  panStep: number

  /** The pan up button's label. */
  panUpLabel: string

  /** The zoom in button's label. */
  zoomInLabel: string

  /** The zoom out button's label. */
  zoomOutLabel: string

  /** Pans the view one step in a direction. */
  pan(to: ViewportWay): void

  /** Zooms the view one step: `1` zooms in and `-1` zooms out. */
  zoom(by: number): void

  /** Turns fullscreen on or off. */
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

  /** The name of the group of controls, read by screen readers. */
  controlsLabel: string | undefined

  /** What the group of controls is called where the page does not say, which each family says for itself. */
  protected get restingControlsLabel(): string

  /** The pan event, built and not dispatched, for a family that names its own. */
  protected panEvent(detail: ViewportPanDetail): Event

  /** The zoom event, built and not dispatched, for a family that names its own. */
  protected zoomEvent(detail: ViewportZoomDetail): Event

  /** The controls, or nothing where the surface keeps none of them. */
  protected renderControls(): TemplateResult | typeof nothing

  /** The drawn group of controls, where there is one, for a family that measures it. */
  protected get controlsElement(): Element | null

  /** Which controls the surface draws while `controls` is absent. */
  protected get restingControls(): string

  /** Whether `controls`, or the resting controls, names a group. */
  protected drawsControls(group: string): boolean

  /** More buttons for the group of controls, after zoom, for a family that adds its own. */
  protected renderMoreControls(): TemplateResult | typeof nothing

  /** Answers a key the family adds, and says whether it did. */
  protected handleMoreKeys(event: KeyboardEvent): boolean

  /** What one pan control is called, for a family that draws its own. */
  protected panLabel(way: ViewportWay): string
  /** The side of the screen a reading-order way is on: `up`, `down`, `left` or `right`. */
  protected sideOf(way: ViewportWay): string

  /** The arrow drawn on one pan control, for a family that draws its own. */
  protected panGlyph(way: ViewportWay): string
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
export const MixinViewport = <T extends Constructor<HelixElement>>(Base: T) => {
  class Viewport extends Base {
    /**
     * The hint shown when a surface waiting to be pressed is scrolled or
     * swiped over, with `gestures="activate"`. Absent is the family's own.
     */
    @property({ attribute: 'activate-hint-label' })
    activateHintLabel?: string

    /**
     * Which controls to show, as a list such as `pan zoom fullscreen`, or
     * `none`. A family can add words of its own.
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
     * Absent is whatever the family rests at, which is this library's rule that
     * a resting value is an attribute's absence: zoom, the compass and
     * fullscreen for a map, whose pan buttons a page asks for, and zoom and
     * fullscreen for a board, which a reader drags and whose pad took a third
     * of the frame. The
     * stylesheet lays the cluster out by which buttons are in it rather than by
     * this attribute, so the two defaults need no rule each.
     */
    @property({ reflect: true })
    controls?: string

    /**
     * The name of the group of controls, read by screen readers.
     *
     * Absent is the family's own name for it, "Map controls" or "Board
     * controls", which names what the controls drive rather than the
     * mechanism. Written here to say it in another language, which every other
     * string this surface speaks already allowed and this one did not.
     */
    @property({ attribute: 'controls-label' })
    controlsLabel?: string

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

    /** The fullscreen button's label. */
    @property({ attribute: 'fullscreen-label' })
    fullscreenLabel = 'Fill the screen'

    /**
     * Which gestures the surface takes from the page.
     *
     * - `always`: the surface takes the wheel and one finger, for a surface
     *   that is the page, such as a full-screen view. A map rests here.
     * - Unset is the family's own: `always` for a map, and for a board, a
     *   drag and a pinch, with the plain wheel left to the page until the
     *   board fills the screen.
     * - `cooperative`: the wheel and one finger scroll the page, and the
     *   surface takes Ctrl or ⌘ with the wheel, and two fingers. The frame
     *   says so when a gesture passes to the page. Best for a surface embedded
     *   in a page.
     * - `activate`: the surface takes nothing until it is pressed, and gives it
     *   back on Escape, when the pointer leaves it, or on a press elsewhere.
     *
     * The keyboard and the frame's buttons work in every mode.
     *
     * **Unreflected and without a default**, because a default that reflected
     * would write an attribute onto every host that no server sent, and the
     * hydration that followed would disagree with it.
     */
    @property()
    gestures?: ViewportGestures

    /**
     * How long, in milliseconds, before the header and footer hide when the user is inactive. `0` keeps them visible.
     *
     * Zero keeps it up, which is the default: these controls are how a keyboard
     * reader operates the surface, and chrome that hid itself by default would
     * be the component undoing its own argument. Set it for a display nobody
     * drives.
     */
    @property({ attribute: 'idle-delay', type: Number })
    idleDelay = 0

    /**
     * The pan down button's label.
     *
     * **A label for each way rather than one with the way filled in**, which is
     * what this was: `Pan {way}` filled in with `left`, so a page that said it
     * in French read out "Déplacer left". The word for a direction is as much
     * the translator's as the word for panning, and a language can put it
     * anywhere in the phrase.
     */
    @property({ attribute: 'pan-down-label' })
    panDownLabel = 'Pan down'

    /** The pan left button's label. */
    @property({ attribute: 'pan-left-label' })
    panLeftLabel = 'Pan left'

    /** The pan right button's label. */
    @property({ attribute: 'pan-right-label' })
    panRightLabel = 'Pan right'

    /**
     * How far one press pans the view, as a fraction of its size.
     *
     * A fraction rather than a distance, because this surface does not know the
     * scale of what is inside it: a quarter of the viewport is the same gesture
     * at any zoom, and a consumer who wants their own units multiplies by them.
     */
    @property({ attribute: 'pan-step', type: Number })
    panStep = 0.25

    /** The pan up button's label. */
    @property({ attribute: 'pan-up-label' })
    panUpLabel = 'Pan up'

    /**
     * The hint shown when one finger swipes over a surface with
     * `gestures="cooperative"`. Absent is the family's own.
     */
    @property({ attribute: 'two-finger-hint-label' })
    twoFingerHintLabel?: string

    /**
     * The line shown while a surface with `gestures="activate"` has the
     * gestures. Absent is the family's own.
     */
    @property({ attribute: 'using-label' })
    usingLabel?: string

    /**
     * The hint shown when the wheel scrolls past a surface with
     * `gestures="cooperative"`, with `{key}`, which is ⌘ on a Mac and Ctrl
     * elsewhere. Absent is the family's own.
     */
    @property({ attribute: 'wheel-hint-label' })
    wheelHintLabel?: string

    /** The zoom in button's label. */
    @property({ attribute: 'zoom-in-label' })
    zoomInLabel = 'Zoom in'

    /** Whether the reader has been still long enough to hide the chrome. */
    @state()
    protected resting = false

    /** Whether the surface is filling the screen. */
    @state()
    protected filled = false

    /** Whether an `activate` surface has been pressed, and has the gestures. */
    @state()
    protected gesturesTaken = false

    /** The hint over the surface while one shows, put there by a gesture it let pass. */
    @state()
    private hint = ''

    /** When the hint goes. */
    private hinting: ReturnType<typeof setTimeout> | undefined

    /**
     * Where the gesture was, in the viewport's box, which the hint is shown
     * at: where the reader is looking, and on the surface wherever a page laid
     * its own content over the rest of it.
     */
    @state()
    private hintAt: { x: number; y: number } | undefined

    /** The press that took the gestures, which is not also the first gesture. */
    private takenBy: Event | undefined

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

    /** The zoom out button's label. */
    @property({ attribute: 'zoom-out-label' })
    zoomOutLabel = 'Zoom out'

    /**
     * What the group of controls is called where the page does not say.
     *
     * A getter a family overrides rather than a default on the property, the
     * way `restingControls` is: a default would reflect nothing and still be
     * one value for every family composing this.
     */
    protected get restingControlsLabel(): string {
      return 'View controls'
    }

    /**
     * What the surface says about its gestures where the page does not say
     * it, which a family overrides to name what it is: "Press the map to use
     * it" reads better than a word that fits every surface.
     */
    protected get restingGestureLabels(): ViewportGestureLabels {
      return {
        activate: 'Press to use it',
        twoFinger: 'Use two fingers to move it',
        using: 'In use. Press Escape to scroll the page again.',
        wheel: 'Use {key} and scroll to zoom',
      }
    }

    /**
     * @internal Which gestures the thing drawing the surface takes: all of
     * them, the cooperative set, or none, while an `activate` surface waits to
     * be pressed. A connector reads it and tells the renderer.
     */
    get gestureMode(): ViewportGestureMode {
      if (this.gestures === 'cooperative') {
        return 'cooperative'
      }
      return this.gestures === 'activate' && !this.gesturesTaken ? 'off' : 'free'
    }

    /**
     * Whether a gesture that started with this event is the surface's to
     * answer, for a family that answers gestures itself. Never while an
     * `activate` surface waits, and never on the press that ended the wait:
     * that press hands over the gestures and moves nothing.
     */
    protected gestureAllowed(event: Event): boolean {
      return this.gestureMode !== 'off' && event !== this.takenBy
    }

    /**
     * Says that `gestureMode` changed. Nothing here; a family whose renderer
     * is told through a connector says it with its own event.
     */
    protected gesturesChanged(): void {}

    /** Shows a hint over the surface for a moment, where the gesture was. */
    private showHint(words: string, at?: { clientX: number; clientY: number }): void {
      const box = this.renderRoot?.querySelector?.('[part="viewport"]')?.getBoundingClientRect()
      this.hintAt =
        at && box && box.width > 0 && box.height > 0
          ? { x: (at.clientX - box.left) / box.width, y: (at.clientY - box.top) / box.height }
          : undefined
      this.hint = words
      clearTimeout(this.hinting)
      this.hinting = setTimeout(() => {
        this.hint = ''
      }, HINT_SHOWS)
    }

    /**
     * A wheel the surface let pass to the page, which is said: a reader
     * scrolling the page past a surface that did not zoom is told why, and how
     * to zoom it. **Ctrl or ⌘ with the wheel is the surface's**, and is what a
     * trackpad's pinch arrives as.
     */
    private readonly handleGestureWheel = (event: WheelEvent): void => {
      if (this.gestures === 'cooperative' && !(event.ctrlKey || event.metaKey)) {
        const mac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
        const words = this.wheelHintLabel ?? this.restingGestureLabels.wheel
        this.showHint(fillTemplate(words, { key: mac ? '⌘' : 'Ctrl' }), event)
      } else if (this.gestures === 'activate' && !this.gesturesTaken) {
        this.showHint(this.activateHintLabel ?? this.restingGestureLabels.activate, event)
      }
    }

    /** One finger moving over the surface, which scrolls the page, and is said. */
    private readonly handleGestureTouch = (event: TouchEvent): void => {
      const finger = event.touches[0]
      if (event.touches.length !== 1) {
        return
      }
      if (this.gestures === 'cooperative') {
        this.showHint(this.twoFingerHintLabel ?? this.restingGestureLabels.twoFinger, finger)
      } else if (this.gestures === 'activate' && !this.gesturesTaken) {
        this.showHint(this.activateHintLabel ?? this.restingGestureLabels.activate, finger)
      }
    }

    /** A press on the surface itself, which hands a waiting surface the gestures. */
    private readonly handleTake = (event: PointerEvent): void => {
      const viewport = this.renderRoot?.querySelector?.('[part="viewport"]')
      if (this.gestures !== 'activate' || this.gesturesTaken || !viewport) {
        return
      }
      /* On the surface: its viewport, or what the page put in it, which is the
         frame's own children in no named slot, the renderer's box among them. */
      const path = event.composedPath()
      const on =
        path.includes(viewport) ||
        path.some((one) => one instanceof Element && one.parentElement === this && one.slot === '')
      if (on) {
        this.takenBy = event
        this.gesturesTaken = true
        this.hint = ''
      }
    }

    /** Escape, which gives the page its scroll back. */
    private readonly handleGiveBackKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && this.gesturesTaken) {
        this.gesturesTaken = false
      }
    }

    /** A press anywhere else on the page, which gives it its scroll back. */
    private readonly handleGiveBackOutside = (event: PointerEvent): void => {
      if (!event.composedPath().includes(this)) {
        this.gesturesTaken = false
      }
    }

    /** The window losing focus, as a reader switching away does. */
    private readonly handleGiveBackBlur = (): void => {
      this.gesturesTaken = false
    }

    /**
     * The pointer leaving the frame, which the family binds on its region.
     * **Heard on the frame and not the drawing**, which a pointer resting on
     * something raised over it has left. **A mouse or a pen and never a
     * finger**, whose `pointerleave` is the finger lifting: a tap took the
     * surface and gave it back in one.
     */
    protected readonly handlePointerLeave = (event: PointerEvent): void => {
      this.idle.leave()
      if (event.pointerType !== 'touch') {
        this.gesturesTaken = false
      }
    }

    override connectedCallback(): void {
      super.connectedCallback()
      this.addEventListener('keydown', this.handleGiveBackKey)
      this.addEventListener('pointerdown', this.handleTake)
      this.addEventListener('touchmove', this.handleGestureTouch, { passive: true })
      this.addEventListener('wheel', this.handleGestureWheel, { passive: true })
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback()
      this.removeEventListener('keydown', this.handleGiveBackKey)
      this.removeEventListener('pointerdown', this.handleTake)
      this.removeEventListener('touchmove', this.handleGestureTouch)
      this.removeEventListener('wheel', this.handleGestureWheel)
      clearTimeout(this.hinting)
      this.gesturesTaken = false
      document.removeEventListener('pointerdown', this.handleGiveBackOutside)
      window.removeEventListener('blur', this.handleGiveBackBlur)
    }

    /**
     * The states a stylesheet reads the gestures by: `using` while an
     * `activate` surface has them, and `sharing` while the page keeps one
     * finger and the plain wheel, which is where a surface that answers
     * touches itself lets the page scroll.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.toggleState('using', this.gesturesTaken)
      this.toggleState(
        'sharing',
        this.gestures === 'cooperative' || (this.gestures === 'activate' && !this.gesturesTaken),
      )
    }

    /**
     * Which gestures the renderer takes, which the family's connector hears
     * from `gesturesChanged`; and while a waiting surface has them, the page
     * listened to for their return.
     */
    protected override updated(changed: PropertyValues): void {
      super.updated(changed)
      if (!changed.has('gestures') && !changed.has('gesturesTaken')) {
        return
      }
      if (this.gestures !== 'activate' && this.gesturesTaken) {
        this.gesturesTaken = false
      }
      if (this.gesturesTaken) {
        document.addEventListener('pointerdown', this.handleGiveBackOutside)
        window.addEventListener('blur', this.handleGiveBackBlur)
      } else {
        document.removeEventListener('pointerdown', this.handleGiveBackOutside)
        window.removeEventListener('blur', this.handleGiveBackBlur)
      }
      this.gesturesChanged()
    }

    /**
     * The hint over the surface and the line while it is in use, which the
     * family draws inside its viewport, over what was slotted. The parts are
     * written out, as the controls' are, so the manifest sees them.
     */
    protected renderGestures(): TemplateResult {
      const at = this.hintAt
      return html`<div
          part="gesture-hint"
          aria-hidden="true"
          ?hidden=${this.hint === ''}
          style=${at ? `--_viewport-hint-x: ${(at.x * 100).toFixed(2)}%; --_viewport-hint-y: ${(at.y * 100).toFixed(2)}%` : nothing}
        >${this.hint}</div>
        <div part="gesture-status" aria-hidden="true" ?hidden=${!this.gesturesTaken}>${this.usingLabel ?? this.restingGestureLabels.using}</div>`
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

    /** Pans the view one step in a direction. */
    pan(to: ViewportWay): void {
      this.dispatchEvent(this.panEvent({ by: this.panStep, to }))
    }

    /** Zooms the view one step: `1` zooms in and `-1` zooms out. */
    zoom(by: number): void {
      this.dispatchEvent(this.zoomEvent({ by }))
    }

    /** Turns fullscreen on or off. */
    toggleFullscreen(): void {
      void this.fullscreen.toggle()
    }

    /**
     * Which controls the surface draws while `controls` is absent.
     *
     * All three here, and a family overrides it where its reader has a better
     * way to do one of them already.
     */
    protected get restingControls(): string {
      return 'pan zoom fullscreen'
    }

    /** Whether `controls`, or the resting controls, names a group. */
    protected drawsControls(group: string): boolean {
      return (this.controls ?? this.restingControls).split(/\s+/).includes(group)
    }

    /** More buttons for the group of controls, after zoom. None here; a family adds its own. */
    protected renderMoreControls(): TemplateResult | typeof nothing {
      return nothing
    }

    /** Answers a key the family adds, and says whether it did. None here. */
    protected handleMoreKeys(_event: KeyboardEvent): boolean {
      return false
    }

    /**
     * The side of the screen a reading-order way is on, left or right.
     *
     * **Start is left only where the text runs that way.** The pad's grid is
     * laid out in reading order, so on a right-to-left page the start button
     * sits on the right, and it said "left" and pointed left from there.
     */
    protected sideOf(way: ViewportWay): string {
      if (way !== 'start' && way !== 'end') {
        return way
      }
      return (way === 'start') !== this.rightToLeft ? 'left' : 'right'
    }

    /**
     * Whether the page runs right to left, as far as this render may say.
     *
     * **Not while hydrating.** A server cannot measure direction, so it drew
     * the left-to-right pad; Lit hydrates by keeping what the server drew and
     * recording the client's value unwritten, so a right-to-left answer in the
     * hydrating render would never reach the page. It answers once hydration
     * is over, and `firstUpdated` asks for that render.
     */
    private get rightToLeft(): boolean {
      const element = this as unknown as { hydrating?: boolean }
      return !element.hydrating && isRtl(this)
    }

    /**
     * What one pan control is called, with the way it goes filled in.
     *
     * Left and right rather than start and end, because the label is read aloud
     * and a reader knows which way left is. The event keeps the reading-order
     * name, which is the one a right-to-left page needs.
     */
    protected panLabel(way: ViewportWay): string {
      const side = this.sideOf(way)
      return side === 'up'
        ? this.panUpLabel
        : side === 'down'
          ? this.panDownLabel
          : side === 'left'
            ? this.panLeftLabel
            : this.panRightLabel
    }

    /** The arrow drawn on a pan control, pointing the way it goes on screen. */
    protected panGlyph(way: ViewportWay): string {
      return { down: '↓', left: '←', right: '→', up: '↑' }[this.sideOf(way)] ?? ''
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
      /* The render hydration put off, for a right-to-left page whose pad the
         server drew the other way round. */
      const element = this as unknown as { serverRendered?: boolean }
      if (element.serverRendered && isRtl(this)) {
        this.requestUpdate()
      }
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
      /* The region itself, not whatever the family drew inside it. A canvas
         draws its connections there and walks them with the same keys, so a
         press on one panned the board as well as moving on. */
      if (target !== own && !own.matches('[part~="controls"]')) {
        return
      }
      /* **A modifier is someone else's shortcut.** Control or Command with Plus
         is the browser's page zoom, which a reader with low vision relies on,
         and Alt with an arrow is Back and Forward: taken here, a press on the
         map zoomed the map and the page stayed small. Shift is this surface's
         own, which a family reads in `handleMoreKeys`. */
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }
      if (this.handleMoreKeys(event)) {
        event.preventDefault()
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
     * The group of controls as drawn, or nothing where none are.
     *
     * **Here, because this is what renders it.** A family that measures the
     * cluster, as a board does to keep its fit clear of the buttons, would
     * otherwise look up a part its own template never writes, and a lookup
     * like that is one a later edit to this template breaks without a word.
     */
    protected get controlsElement(): Element | null {
      return this.renderRoot?.querySelector('[part="controls"]') ?? null
    }

    /**
     * The controls, or nothing where a consumer kept none of them.
     *
     * **Written out rather than generated**, because a part name behind an
     * interpolation is a part the manifest cannot see: a loop would publish
     * `pan-` and a consumer's `::part(pan-up)` would match nothing.
     *
     * **Each glyph is the fallback of a slot named for its button**, the names
     * `Map` gave its own (`pan-up-icon`, `zoom-in-icon`, `fullscreen-icon`), so
     * a page with an icon set of its own swaps a glyph without drawing the
     * controls again. Text rather than markup, so no family has a fallback the
     * tier above cannot reach.
     */
    protected renderControls(): TemplateResult | typeof nothing {
      const pan = this.drawsControls('pan')
      const zoom = this.drawsControls('zoom')
      const fullscreen = this.drawsControls('fullscreen')
      const more = this.renderMoreControls()
      if (!pan && !zoom && !fullscreen && more === nothing) {
        return nothing
      }
      return html`<div part="controls" role="group" aria-label=${this.controlsLabel ?? this.restingControlsLabel}>
        ${
          pan
            ? html`<button part="pan-up" aria-label=${this.panLabel('up')} type="button" @click=${() => this.pan('up')}>
                  <slot name="pan-up-icon">${this.panGlyph('up')}</slot>
                </button>
                <button part="pan-start" aria-label=${this.panLabel('start')} type="button" @click=${() => this.pan('start')}>
                  <slot name="pan-start-icon">${this.panGlyph('start')}</slot>
                </button>
                <button part="pan-end" aria-label=${this.panLabel('end')} type="button" @click=${() => this.pan('end')}>
                  <slot name="pan-end-icon">${this.panGlyph('end')}</slot>
                </button>
                <button part="pan-down" aria-label=${this.panLabel('down')} type="button" @click=${() => this.pan('down')}>
                  <slot name="pan-down-icon">${this.panGlyph('down')}</slot>
                </button>`
            : nothing
        }
        ${
          zoom
            ? html`<button part="zoom-in" aria-label=${this.zoomInLabel} type="button" @click=${() => this.zoom(1)}>
                  <slot name="zoom-in-icon">+</slot>
                </button>
                <button part="zoom-out" aria-label=${this.zoomOutLabel} type="button" @click=${() => this.zoom(-1)}>
                  <slot name="zoom-out-icon">−</slot>
                </button>`
            : nothing
        }
        ${more}
        ${
          fullscreen
            ? html`<button
                part="fullscreen"
                aria-label=${this.fullscreenLabel}
                aria-pressed=${this.filled ? 'true' : 'false'}
                type="button"
                @click=${this.toggleFullscreen}
              >
                <slot name="fullscreen-icon">⤢</slot>
              </button>`
            : nothing
        }
      </div>`
    }
  }

  return Viewport as unknown as Constructor<ViewportElement> & T
}
