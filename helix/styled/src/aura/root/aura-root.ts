import {
  customElement,
  drawsInSoftware,
  HelixElement,
  numberConverter,
  PaintGateController,
  readColor,
  words,
} from '@fusion.dev/helix-core'
import {
  AuraField,
  type AuraPalette,
  type AuraSettings,
  FRAGMENT,
  paletteOf,
  RESTING_PALETTE,
  VERTEX,
} from '@fusion.dev/helix-core/aura'
import { pause, play } from '@fusion.dev/helix-icons'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { HelixAuraFallbackEvent } from '../events/index.js'
import { styles } from './aura-root.generated.css.js'

/**
 * The widest either edge of the drawing buffer may get, in device pixels.
 *
 * Past `MAX_RENDERBUFFER_SIZE` a canvas does not draw at all, and WebGL2
 * guarantees only 2048. Desktop parts report 16384 and older integrated ones
 * report 8192, which a page-length field can pass.
 */
const MAX_CANVAS_EDGE = 4096

/**
 * The most device pixels the drawing buffer may hold, at 2048 squared.
 *
 * Every one of them runs five octaves of noise through two warps on every
 * frame, so this is the fill rate rather than the fidelity: roughly what the
 * component already cost over the two screens it was designed against.
 */
const MAX_CANVAS_PIXELS = 4_194_304

/**
 * How long the opening frame will wait for the box to stop changing, in ms.
 *
 * The field is scaled by its box, so painting a box that is still settling draws
 * the same shape at several sizes and reads as the background zooming out. The
 * wait ends one animation frame after the last change; this is only the cap, for
 * a page that never stops resizing it. Longer than any load takes to settle and
 * shorter than a reader takes to conclude the background is just a gradient.
 */
const OPENING_PATIENCE = 500

/*
 * **A context apiece, and nothing shared between them, on purpose.**
 *
 * The tempting fix for a page of auras is a module-level cache of the compiled
 * program, and WebGL rules it out: a program belongs to the context that linked
 * it. The one shape that would share is a single context drawing for every
 * aura, which copies each frame into each canvas. What a context apiece costs
 * was measured first, 15 Sep 2026, on one page of 1, 3 and 6 auras 720 pixels
 * tall, with the shader cache made cold on every run:
 *
 * - **On a GPU the browser already shares it.** Chromium on Metal, an M2 Max:
 *   the first aura links in about 90ms and its first draw takes 135ms more,
 *   while every aura after it links in under a millisecond and draws its first
 *   frame in 2. What each pays alone is translating the shader, about 8ms on
 *   the main thread. Six had all drawn 262ms after navigation, against 206ms
 *   for one.
 * - **Under SwiftShader nothing is shared.** Headless Chromium's software
 *   renderer, which the spec runner draws with, compiles the pipeline again
 *   for each context, about 450ms apiece, and the page shows no new frame for
 *   0.5s with one aura, 1.3s with three and 2.6s with six.
 *
 * That second cost is the one inherent to a context per element, and a shared
 * context would take it back by charging every reader with a GPU a copy per
 * aura per frame, for a cost they do not pay. So it stays, and the software
 * path does not draw at all: `drawsInSoftware` is what decides, and the specs
 * stub their draws rather than paying for the ones that do.
 */

/**
 * @summary A drifting background of light, drawn in your theme's colors.
 *
 * @description
 * One fragment shader draws over a full-screen triangle, and its palette comes
 * from the tokens. A background built on `--helix-color-primary` changes when
 * your brand color changes.
 *
 * Every shape ramps through four token stops, and the token layer inverts each
 * one: the page background, `primary-subtle`, `primary`, and a peak. The peak
 * is the foreground on a dark page and `primary-active` on a light one, because
 * mixing a saturated hue toward near-black removes its chroma. The component
 * reads which way the page runs from the background's luminance, because the
 * mode is a private token. On a light page the shader holds the glow at a
 * lightness of 0.45 or more and the peak at 0.33 or more, so an ink theme's
 * strands draw as a dark gray and not as black.
 *
 * The geometry is three vertices derived from `gl_VertexID`. There is no
 * dependency, scene graph, attribute, buffer, or upload.
 *
 * The shader stops drawing in these cases:
 * - The element is off screen or in a background tab.
 * - `prefers-reduced-motion` is set. The element shows one still frame.
 * - `paused` is set, from a pause control on your page or from the aura's own
 *   under `pause-control`. The element holds the frame it shows.
 * - The browser takes back the drawing context, on a GPU reset or past its
 *   limit of about sixteen contexts. The gradient shows until the context
 *   returns.
 *
 * On a renderer that draws on the CPU, such as a headless browser or a machine
 * with no usable GPU, the element shows the gradient. There the shader costs
 * about 450ms for the first frame of each element, against 2ms on a GPU.
 *
 * Aura is styled only and has behavior, which the tier split does not otherwise
 * allow. Its behavior is drawing to a canvas, so there is no structure for you
 * to restyle and nothing for a headless version to hold.
 *
 * **Content placed inside sits over the field**, in a `content` part that
 * covers the aura, so an interactive aura answers the pointer over the
 * content too. Clicks still reach the content. Style `::part(content)` to
 * place it, such as centering a hero's heading.
 *
 * **The colors are the theme's, and each has a hook**: `--aura-ground`,
 * `--aura-haze`, `--aura-glow` and `--aura-peak`, read by the shader and by the
 * fallback gradient alike, from wherever on the page you set them. A hook
 * changed while the aura draws, by a class, a style or the color mode,
 * reaches the shader on the next frame.
 *
 * **`pause-control` draws a control that stops the motion and starts it
 * again**, in the trailing corner of the field, as WCAG 2.2.2 asks of
 * anything that moves for more than five seconds. It is a toggle button named
 * by `pause-label`, which says it is pressed while the field is paused, and a
 * press sends `change`. A reader who asked for reduced motion sees no motion
 * and no control.
 *
 * Where the gradient shows in place of the shader, the aura matches
 * `:state(fallback)` and sends `helix-aura-fallback` with the reason.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Backdrop, Background, Atmosphere, Gradient
 * @documentation https://fusion.dev/helix/components/aura
 *
 * @slot - Content drawn over the field, such as a heading.
 *
 * @event {Event} change - Fired when the aura's own pause control pauses the field or starts it again.
 * @event {HelixAuraFallbackEvent} helix-aura-fallback - Fired each time the aura stops drawing its shader and shows its gradient, with the reason.
 *
 * @csspart canvas - The surface the shader draws into.
 * @csspart content - The box over the field that holds the content. It covers the aura.
 * @csspart pause - The control that pauses the field and starts it again, drawn under `pause-control`.
 * @csspart pause-mark - The glyph on the pause control: pause while the field moves, play while it is paused.
 *
 * @cssproperty --aura-fade - How far the top and bottom edges fade, as a share of the height. `0%` keeps a hard edge. Defaults to `15%`.
 * @cssproperty --aura-glow - The bright stop of the ramp. Defaults to `--helix-color-primary-subtle` on a light page and `--helix-color-primary` on a dark one.
 * @cssproperty --aura-ground - The page the field fades into. Defaults to `--helix-color-background`.
 * @cssproperty --aura-haze - The faint stop between the ground and the glow. Defaults to half of `--helix-color-primary-subtle` in the page on a light page and `--helix-color-primary-subtle` on a dark one.
 * @cssproperty --aura-pause-background-color - The pause control's ground. Defaults to `--helix-color-surface-overlay`.
 * @cssproperty --aura-peak - The hottest stop, at the center of a shape. Defaults to a third of `--helix-color-primary` in `--helix-color-primary-subtle` on a light page and `--helix-color-foreground` on a dark one.
 *
 * @cssstate drawing - The shader draws on the GPU, so the gradient under it is hidden.
 * @cssstate fallback - The aura shows its gradient: the renderer draws on the CPU, there is no WebGL, or the browser took the context back. Cleared once the shader draws again.
 */
@customElement('helix-aura')
export class HelixAura extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * The key this family's words are registered under:
   * `registerWords('de', { 'helix-aura': { pauseLabel: 'Bewegung anhalten' } })`.
   */
  static words = 'helix-aura'

  /**
   * How soft the falloff is, `0` tight and `1` diffuse.
   */
  @property({ converter: numberConverter('bloom', 0.5) })
  bloom = 0.5

  /**
   * How far the settings wander on their own, `0` still and `1` restless.
   *
   * **One property rather than a range on each of the five.** A range per axis
   * is five more things to author and four more chances to write a pair that
   * fights another; the reason to want any of it is the same reason in every
   * case, which is that a fixed field is legibly a loop. So this is an amount,
   * and each axis is given its own span and its own period.
   *
   * The periods are irrational multiples of each other, so no two axes come
   * back into phase and the field has no cycle a reader can count. That is the
   * difference between a background that breathes and one that is obviously on
   * a timer.
   */
  @property({ converter: numberConverter('drift', 0) })
  drift = 0

  /**
   * Overall brightness, as a multiplier on the field.
   */
  @property({ converter: numberConverter('gain', 1) })
  gain = 1

  /**
   * What the pointer does to the field. Set it to override the default for the
   * `pattern`.
   *
   * Absent is `native`, which is each shape answering in the terms it is made
   * of: braid leans, rays are occluded, threads pinch, particles scatter, a
   * constellation gathers. The
   * named options are generic, and are a deliberate step down in meaning. A
   * response made of the same material as the shape says something about that
   * shape; a lamp following the cursor says the same nothing on every one.
   *
   * They exist because a consumer may want the quieter, more conventional
   * answer, and because `none` is a real requirement. Not because any of them
   * is the better default.
   */
  @property()
  interaction?: 'light' | 'none' | 'ripple' | 'shadow'

  /**
   * Whether the pointer shifts and lifts the field.
   *
   * Reflected because the stylesheet selects on it: a background is not
   * hit-testable at rest, or it would swallow clicks meant for what is over it,
   * and an element that is not hit-testable never receives the `pointermove`
   * this listens for. Asking for the pointer is asking for the hit test.
   */
  @property({ reflect: true, type: Boolean })
  interactive = false

  /**
   * The form the light takes. When it is not set, the form is `braid`.
   *
   * Reflected because the fallback gradient selects on it, and given no default
   * for the same reason every axis here has none: a default on a reflected
   * property writes the attribute onto every host anybody renders.
   *
   * **`pattern` and not `shape`.** `shape` is an axis about geometry, `circle`
   * against `square`, `arc` against `ring`, and it is registered as one.
   * Aurora, braid and caustics are not geometries; they are twelve names for a
   * look, which is what `pattern` is for by the rule the registry already
   * states.
   */
  @property({ reflect: true })
  pattern?:
    | 'aurora'
    | 'braid'
    | 'caustics'
    | 'constellation'
    | 'flow'
    | 'fracture'
    | 'lattice'
    | 'particles'
    | 'rays'
    | 'streaks'
    | 'threads'
    | 'waves'

  /**
   * Whether the aura draws its own control that pauses the field and starts it
   * again, in its trailing corner. Absent draws none, for a page with a pause
   * control of its own.
   */
  @property({ attribute: 'pause-control', type: Boolean })
  pauseControl = false

  /**
   * Whether the field holds still on the frame it shows.
   *
   * Set it from a pause control on your page, so a reader can stop the motion,
   * as WCAG 2.2.2 asks of anything that moves for more than five seconds. A
   * change to another property still repaints the frame. Clearing it starts
   * the field from where it stopped.
   */
  @property({ type: Boolean })
  paused = false

  /**
   * The pause control's name, read by screen readers. The control is a toggle
   * and says it is pressed while the field is paused, so the name stays the
   * same.
   */
  @words
  @property({ attribute: 'pause-label' })
  pauseLabel = 'Pause the motion'

  /**
   * How far the pointer reaches into the field, `0` upward.
   *
   * Multiplied into the presence the pointer already fades in and out with, so
   * it scales the whole response rather than any one part of it, whichever
   * interaction is in play.
   */
  @property({ converter: numberConverter('reach', 1) })
  reach = 1

  /**
   * Feature size, as a multiplier on the sampled coordinates.
   */
  @property({ converter: numberConverter('scale', 1) })
  scale = 1

  /**
   * How fast it drifts, as a multiplier on time.
   */
  @property({ converter: numberConverter('speed', 1) })
  speed = 1

  /**
   * Where the axis crosses the top edge, as a fraction of the width.
   *
   * **An angle does not say what a consumer means, and this does.** The axis
   * runs `x = y * tan(tilt)`, so the same `tilt` puts the exit somewhere else
   * the moment the box changes shape. Measured on the landing page hero, which
   * was tuned to 23 degrees against a box two screens tall: at a 1152 pixel
   * window that lands the exit at 979, between the navigation and the actions,
   * and at a 720 pixel window it lands at 611, a third of the way further left.
   * Nothing is wrong with either number and neither is what anybody asked for.
   *
   * Given as a fraction rather than a length so it survives the same change:
   * `0` is the left edge, `0.5` the middle and `1` the right edge, at every
   * size. Absent leaves `tilt` in charge, so an angle is still sayable where
   * the angle really is the point, which is what an aura in a square tile
   * wants.
   *
   * Derived from the box the resize observer already keeps, so it costs no
   * layout read per frame, and the drift is applied to the result rather than
   * to the angle behind it: the field still wanders, around a bearing that
   * holds the exit where it was put.
   */
  @property({ converter: numberConverter('terminus', undefined) })
  terminus?: number

  /**
   * The field's rotation, in degrees.
   */
  @property({ converter: numberConverter('tilt', 14, 'degrees') })
  tilt = 14

  /**
   * How much the members of a population differ from one another, from `0`,
   * where they are uniform, to `1`, the default amount. Values are clamped to
   * that range, because they interpolate: a larger number would extrapolate,
   * and a streak whose length passed through zero would be drawn as a bar
   * across the whole frame.
   *
   * Read by seven of the twelve shapes, the ones made of many similar things,
   * whether those are counted or continuous: `streaks`, whose lanes draw a
   * speed, a length, a width, a spacing and a weight apiece; `particles` and
   * `constellation`, whose motes and stars draw a size, a brightness and a
   * wander; `rays` and `aurora`, whose
   * fan, bundles and folds widen or even out; `caustics`, whose three depths of
   * fold close on one scale and one weight while the pool over them flattens to
   * an even wash; and `fracture`, whose sites come home to their own cell
   * centers, leaving equal territories and no border more contested than
   * another.
   *
   * Inert on the other five, and every one of them a refusal. `braid`, `waves`
   * and `flow` have a single subject and nothing to vary. `threads` and
   * `lattice` are even on purpose, a scatter of strands and a regular structure
   * each being what it is because its members do not differ: `threads` gives
   * its seven one amplitude, one thickness, one weight and one frequency on
   * the argument that alike is what makes a weave read as woven, and a lattice
   * whose cells differed would be a scatter with straight lines in it.
   */
  @property({ converter: numberConverter('variance', 1) })
  variance = 1

  /**
   * The four ramp stops, resolved.
   *
   * **Read on every frame drawn, and converted only when they moved.** A hook
   * can change anywhere above the aura at any time: a class on a section, a
   * style written by script, a scoped theme, the color mode. Each frame reads
   * the five colors the canvas carries off its live computed style, which is
   * a string compare while nothing changed, and `paletteOf` converts them only
   * when the text differs. Converting on every frame was the cost: a style
   * recalc and a canvas readback per stop, forever, for values that rarely
   * move.
   *
   * A stopped loop draws no frame to read in, so a change of any of the five
   * also runs a short transition on the canvas, and its end paints one frame.
   * That covers a reader who asked for no motion.
   */
  /* The default theme's dark page, ink on black, until the first read. */
  private palette: AuraPalette = { ...RESTING_PALETTE }

  /** The canvas's live computed style, and the five colors it last carried. */
  private carried: { canvas: HTMLCanvasElement; style: CSSStyleDeclaration; text: string } | null =
    null

  /** Why the gradient shows, while it does, or `undefined` while the shader draws. */
  private fallback: HelixAuraFallbackEvent['detail']['reason'] | undefined

  /** Why the last `build` drew nothing, for the fallback it leads to. */
  private refused: HelixAuraFallbackEvent['detail']['reason'] = 'unavailable'

  private canvas: HTMLCanvasElement | null = null
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> = {}

  /** The pending context release, or `0`. Canceled by a reconnection. */
  private release = 0

  /** What every context is asked for, here rather than at two call sites. */
  private static readonly CONTEXT: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
    stencil: false,
  }

  private width = 0
  private height = 0

  /**
   * The field's clock, its drift, and where the pointer is and has been, as
   * core's `AuraField` keeps them, so a phone's aura runs on the same numbers.
   */
  private readonly field = new AuraField()

  /**
   * Whether anybody is looking, and the loop that draws for them.
   *
   * **Four reasons to refuse a frame that the gate cannot know**: a context it
   * was never given, one the browser has taken, a drawing buffer no measurement
   * has sized, and an opening frame still owed. The first two draw nothing at
   * all and the last two draw at the wrong scale, which `measure` and `opened`
   * each have their own note about.
   */
  private readonly gate = new PaintGateController(this, {
    canRun: () =>
      !this.paused && !!this.gl && !this.gl.isContextLost() && this.width > 0 && this.opened,
    onFrame: (delta) => {
      this.advance(delta)
    },
    onMotion: (reduced) => {
      /* The still frame is drawn rather than assumed, because the canvas holds
         whatever was on it when the loop stopped and mid-drift is not the
         opening shape. `Orb` does the same, on the same two arms. */
      if (reduced) {
        this.paintOnce()
      }
    },
    onResize: () => {
      this.resized()
    },
  })

  /**
   * The element's box, cached.
   *
   * **Never read per event.** `getBoundingClientRect` forces a synchronous
   * layout, and a pointer emits events far faster than the display refreshes: a
   * 1000Hz mouse flushed layout a thousand times a second to compute a number
   * that only changes when the page reflows. Refreshed from the resize observer
   * and from scroll, both of which are exactly when it can go stale, and never
   * from the handler that reads it.
   */
  private box = { height: 1, left: 0, top: 0, width: 1 }

  /**
   * Whether the field has drawn its opening frame yet.
   *
   * **The box changes shape while a page is arriving, and this shader is scaled
   * by the box.** `p.y` spans [-1, 1] over the element's height, so a feature's
   * size in pixels is proportional to how tall the box happens to be when the
   * frame is drawn. A page that upgrades its custom elements, loads its fonts
   * and settles its images passes through several heights on the way to its
   * final one, and painting each of them draws the same field at several
   * scales: it opens coarse and tightens, which reads as the background zooming
   * out on load rather than as a background.
   *
   * Refusing the degenerate 0 by 0 box leaves the ordinary case: a first real
   * box that is simply not the last one.
   *
   * So the opening frame waits for the box to stop moving. Nothing paints until
   * a measurement has stood unchanged for one animation frame, which is the
   * cheapest definition of settled that is not a guess, and the host's own
   * gradient covers the wait. After that a resize repaints immediately, because
   * by then a change is the window moving rather than the page arriving.
   */
  private opened = false

  /** The pending opening frame, canceled and rescheduled by each new box. */
  private opening = 0

  /**
   * When to stop waiting and draw anyway.
   *
   * A page that resizes the field every frame forever would otherwise never get
   * an opening frame at all. Half a second is far longer than a load takes to
   * settle and far shorter than a reader waits before deciding the background is
   * simply a gradient.
   */
  private openBy = 0

  protected override render(): TemplateResult {
    /* `aria-hidden` on the canvas rather than on the host, because a consumer
       may want to label the region this sits behind and a hidden host would
       take that with it. The canvas itself never has anything to announce. */
    return html`<canvas part="canvas" aria-hidden="true"></canvas>
      <div part="content"><slot></slot></div>${this.renderPause()}`
  }

  /** The aura's own pause control, under `pause-control`. */
  private renderPause(): TemplateResult | typeof nothing {
    if (!this.pauseControl) {
      return nothing
    }
    const glyph = this.paused ? play : pause
    return html`<button
      part="pause"
      type="button"
      aria-label=${this.pauseLabel}
      aria-pressed=${this.paused ? 'true' : 'false'}
      @click=${this.togglePause}
    ><svg aria-hidden="true" data-glyph fill="currentColor" part="pause-mark" viewBox=${glyph.viewBox}>${unsafeSVG(glyph.content)}</svg></button>`
  }

  private readonly togglePause = (): void => {
    this.paused = !this.paused
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  protected override firstUpdated(changed: PropertyValues): void {
    /* The base class's first, which is what records the settled state a frame
       from now. Without it `whenSettled` never resolves and the transition
       guard never lifts, so a consumer's transition on the host never runs. */
    super.firstUpdated(changed)
    this.start()
  }

  /* Everything the canvas needs, in one place both lifecycles can reach.
   *
   * `firstUpdated` runs once for the life of the element, while
   * `disconnectedCallback` deletes the program, drops the context and takes
   * the gate down with them, and runs every time the element moves. Setup
   * that lives only in `firstUpdated` therefore leaves an aura reordered by a
   * framework with `this.gl` null and nothing to rebuild it: a live component
   * painting nothing, for the rest of the page's life, with no error anywhere.
   *
   * Guarded at the call site on `hasUpdated`, because the first connection
   * happens before the first render and there is no canvas yet. */
  private start(): void {
    /* **Connected, and not only rendered.** Lit runs the first update in the
       microtask after the first connection whether or not the element is still
       there, so one inserted and removed in the same task reaches
       `firstUpdated` detached. Started there, it made a context and installed
       listeners that no disconnection was left to take down. */
    if (!this.isConnected) {
      return
    }
    /* Client only, and by contract. There is no canvas on a server, so the
       shader is an enhancement over markup that already renders a gradient. */
    if (!this.renderRoot.querySelector('canvas')) {
      return
    }
    /* A reconnection that outran its own release has everything already: the
       context is live and the program is linked, so the reorder costs the
       listeners and the observers and no GL work at all.

       **A context the browser took is waited for rather than replaced.**
       `handleLost` asked for it back, and a fresh canvas here would take a
       second context while the first is still owed, which past the cap costs
       some other aura its own. One taken while the element was away was never
       asked for, so nothing will return it, and it goes the way of a context
       this element spent itself. */
    if (this.program && this.gl?.isContextLost()) {
      this.program = null
      this.gl = null
    }
    if (!this.program && !this.gl?.isContextLost() && !this.build()) {
      this.fallBack(this.refused)
      return
    }
    this.canvas?.addEventListener('webglcontextlost', this.handleLost)
    this.canvas?.addEventListener('webglcontextrestored', this.handleRestored)
    this.canvas?.addEventListener('transitionend', this.handleRestyle)

    this.addEventListener('pointermove', this.handlePointer)
    this.addEventListener('pointerleave', this.handleLeave)

    this.gate.watch()

    /* Scroll moves the box without resizing it, and the cached origin is what
       the pointer is measured against. Passive, because nothing here cancels. */
    window.addEventListener('scroll', this.handleScroll, { capture: true, passive: true })

    /* The second half is a return before the first frame. The removal canceled
       the opening, and a move comes back to a box the same size, so `measure`
       reports nothing to do while the opening is still owed. */
    if (this.measure() || (this.width && !this.opened)) {
      this.open()
    }
  }

  /**
   * The context and the program, from whatever canvas can still give one.
   *
   * **A canvas whose context was force-lost never yields a working one again.**
   * `getContext` hands back the very same dead object, which reports
   * `isContextLost()` and answers `null` to every `getShaderParameter`, so
   * `link` fails, `start` returns before installing a single observer, and the
   * element sits connected and permanently blind, holding whatever buffer it
   * last painted. Measured on the landing page, where one remove-and-reinsert
   * was enough: the frozen frame was the 2x2 the first `measure` took before
   * layout, stretched across two screens as a gray smear that reads as a broken
   * gradient rather than as a dead component. The only sound in the console was
   * `getShaderInfoLog` answering `null`, twice per element.
   *
   * A spent canvas is therefore replaced rather than re-asked. `restoreContext`
   * is the other way and is not reachable from here: it needs the `webglcontextlost`
   * event default-prevented and the extension held from before the loss, and it
   * restores asynchronously, so `start` would have to become a state machine to
   * use it. A fresh canvas is synchronous and cannot half-succeed.
   *
   * That is a context this element released. One the browser takes is not
   * spent: `handleLost` asks for it back, and `start` waits for it rather than
   * coming here.
   */
  private build(): boolean {
    let canvas = this.renderRoot.querySelector('canvas')
    if (!canvas) {
      return false
    }
    /* The shader is not worth its price on a CPU, and the fallback already
       covers it. Nothing else changes: no context is made, so `start` returns
       here exactly as it does for a reader with no WebGL at all. */
    if (drawsInSoftware(HelixAura.CONTEXT)) {
      this.refused = 'software'
      return false
    }
    this.refused = 'unavailable'

    /* `antialias` off, because nothing here has a geometric edge to alias:
       every boundary is a gradient the shader computes. Multisampling would
       allocate a second screen-sized buffer to average pixels already smooth.
       `preserveDrawingBuffer` off too, which costs the ability to sample the
       canvas from a test and saves a full-screen copy on every frame. */
    let gl = canvas.getContext('webgl2', HelixAura.CONTEXT)
    if (gl?.isContextLost()) {
      /* Swapped under Lit, which is safe because the template is static: the
         strings never change, so no re-render ever touches this node again. */
      const fresh = document.createElement('canvas')
      fresh.setAttribute('part', 'canvas')
      fresh.setAttribute('aria-hidden', 'true')
      canvas.replaceWith(fresh)
      canvas = fresh
      /* Cleared, so `measure` sizes the new buffer rather than comparing it
         against the spent one's dimensions and returning early. */
      this.width = 0
      this.height = 0
      gl = canvas.getContext('webgl2', HelixAura.CONTEXT)
    }

    this.canvas = canvas
    this.gl = gl
    if (!gl || gl.isContextLost()) {
      return false
    }
    return this.prepare()
  }

  /**
   * The program and where its uniforms live, on the context already held.
   *
   * Apart from `build` because a restored context comes here alone. It is the
   * same object the browser took, with every program and location it had made
   * gone, and `build` would replace a canvas that had been lost again before
   * this ran rather than wait for it a second time.
   */
  private prepare(): boolean {
    const gl = this.gl
    if (!gl) {
      return false
    }
    this.program = this.link(VERTEX, FRAGMENT)
    if (!this.program) {
      return false
    }
    this.canvas?.toggleAttribute('hidden', false)
    this.fallback = undefined
    this.toggleState('fallback', false)
    this.toggleState('drawing', true)
    gl.useProgram(this.program)
    for (const name of [
      'uBloom',
      'uGain',
      'uGlow',
      'uGround',
      'uHaze',
      'uInk',
      'uInteraction',
      'uPeak',
      'uPointer',
      'uReach',
      'uResolution',
      'uScale',
      'uShape',
      'uTilt',
      'uTime',
      'uTrail',
      'uVariance',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name)
    }
    return true
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* A move is a removal followed by an insertion, so the release scheduled a
       moment ago was never about this element going away. Canceled here, which
       is what makes a framework reorder cost no GL work at all. */
    if (this.release) {
      clearTimeout(this.release)
      this.release = 0
    }
    if (this.hasUpdated) {
      this.start()
    }
  }

  protected override updated(changed: PropertyValues): void {
    /* Paused stops the loop where it is, and the canvas keeps that frame. */
    if (changed.has('paused')) {
      if (this.paused) {
        this.gate.stop()
      } else {
        this.gate.play()
      }
    }
    /* A property change has to reach the screen even when the loop is stopped,
       which is every reader who asked for no motion. The canvas holds its last
       frame and no re-render repaints it. */
    this.paintOnce()
  }

  override disconnectedCallback(): void {
    /* The gate goes down in here, which is what stops the loop and forgets
       that the aura was ever on screen. */
    super.disconnectedCallback()
    /* **The opening frame as well, which the gate does not own**, and cannot:
       the gate also stops on going off screen, and an aura that lost its
       opening there would never open. Left booked here, it drew into a
       detached canvas whenever it ran before the release, and then started a
       loop nothing was left to end, after the context was gone. `openBy` goes
       with it, so a return waits for its own box to settle. */
    if (this.opening) {
      cancelAnimationFrame(this.opening)
      this.opening = 0
      this.openBy = 0
    }
    /* Before the release below, which loses the context itself and must not be
       answered by asking for it back. */
    this.canvas?.removeEventListener('webglcontextlost', this.handleLost)
    this.canvas?.removeEventListener('webglcontextrestored', this.handleRestored)
    this.canvas?.removeEventListener('transitionend', this.handleRestyle)
    this.removeEventListener('pointermove', this.handlePointer)
    this.removeEventListener('pointerleave', this.handleLeave)
    window.removeEventListener('scroll', this.handleScroll, { capture: true })
    /* **Deferred by a task, and canceled by a reconnection.**
     *
     * The DOM has no signal for a move: a framework reordering its children
     * removes the node and inserts it again, and the element is told only that
     * it was disconnected. Releasing the context there punished every reorder
     * for a departure that never happened, and the landing page reorders three
     * auras on the way in. An insertion in the same task cancels this, so a
     * move is free and a real removal still pays a task later.
     *
     * A task rather than a microtask, because what has to fit inside the window
     * is a framework's whole commit rather than one call. */
    this.release = window.setTimeout(this.drop, 0)
  }

  /**
   * Gives the context back, once nothing has claimed the element again.
   *
   * **The context is not released by dropping the reference.** A browser caps
   * live WebGL contexts at about sixteen and drops the oldest when a
   * seventeenth is asked for, so a page that mounts and unmounts auras kills
   * the ones still on screen: the symptom is an aura elsewhere going blank,
   * which looks like a fault in that element and is this one. The context
   * belongs to the canvas, and the canvas is held by the shadow root until the
   * element is collected, which is a moment nothing here controls and which is
   * far too late for a cap of sixteen. `WEBGL_lose_context` is the only way.
   *
   * **It spends the canvas**, which is what `build` is written around: the
   * canvas can never serve a context again and a returning element takes a
   * fresh one.
   */
  private readonly drop = (): void => {
    this.release = 0
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext()
    this.program = null
    this.gl = null
  }

  /**
   * Stops for a context the browser has taken, and asks for it back.
   *
   * **Taken on a GPU reset, and past the cap** of about sixteen, where the
   * browser drops the oldest context for the newest while its aura is still on
   * screen. Unstopped, the loop runs at 30 frames a second against a context
   * that draws nothing, and nothing makes the program again once the context
   * comes back: the aura never recovers.
   *
   * **The canvas is hidden until then, because a lost one is not reliably
   * transparent.** Measured 15 Sep 2026: headless Chromium painted a plain
   * canvas white with a broken-image glyph in its corner, force-lost and on a
   * crashed GPU process alike, while this one came out clear there and on
   * Metal, and the landing page once held a spent one's last frame (`build`
   * has it). Hidden, it shows what a machine with no WebGL is shown, the host's
   * gradient, whatever the engine does with a lost canvas.
   *
   * `preventDefault` is the asking: a browser restores only a context whose
   * loss was canceled.
   */
  private readonly handleLost = (event: Event): void => {
    event.preventDefault()
    this.gate.stop()
    if (this.opening) {
      cancelAnimationFrame(this.opening)
      this.opening = 0
    }
    this.program = null
    this.canvas?.toggleAttribute('hidden', true)
    this.toggleState('drawing', false)
    this.fallBack('lost')
  }

  /**
   * Shows the gradient, and says so once for each time it starts to.
   *
   * The state is what a stylesheet reads, and the event is what a script
   * logs, such as to count how many readers see the gradient. Sent again only
   * after the shader has drawn in between, so a context that is lost while
   * the gradient already shows is not said twice.
   */
  private fallBack(reason: HelixAuraFallbackEvent['detail']['reason']): void {
    if (this.fallback !== undefined) {
      return
    }
    this.fallback = reason
    this.toggleState('fallback', true)
    this.toggleState('drawing', false)
    this.dispatchEvent(new HelixAuraFallbackEvent({ reason }))
  }

  /**
   * Draws again on the context the browser gave back.
   *
   * Everything made on it went with the loss, so the program is linked again
   * and the buffer measured as though it were new, which is what gives the new
   * program its resolution.
   */
  private readonly handleRestored = (): void => {
    if (!this.prepare()) {
      return
    }
    this.width = 0
    this.height = 0
    this.measure()
    if (this.opened) {
      this.paint()
      this.gate.play()
    } else if (this.width) {
      this.open()
    }
  }

  /**
   * Resolves the ramp, converting only when the colors the canvas carries
   * moved since the last read.
   *
   * From the canvas's own computed style, which carries each stop on a color
   * property: the `--aura-*` hook where a page set one, and the token
   * otherwise. `paletteOf` says which property is which, and how the peak is
   * chosen for a light page or a dark one.
   */
  private readPalette(): void {
    const canvas = this.canvas
    if (!canvas) {
      return
    }
    if (this.carried?.canvas !== canvas) {
      this.carried = { canvas, style: getComputedStyle(canvas), text: '' }
    }
    const { style } = this.carried
    const text = `${style.color} ${style.textDecorationColor} ${style.outlineColor} ${style.columnRuleColor} ${style.caretColor}`
    if (text !== this.carried.text) {
      this.carried.text = text
      this.palette = paletteOf(style, readColor)
    }
  }

  /** One frame for a stopped loop, once a color the canvas carries has moved. */
  private readonly handleRestyle = (): void => {
    this.paintOnce()
  }

  private link(vertex: string, fragment: string): WebGLProgram | null {
    const gl = this.gl
    if (!gl) {
      return null
    }
    const compile = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type)
      if (!shader) {
        return null
      }
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }
    const vs = compile(gl.VERTEX_SHADER, vertex)
    const fs = compile(gl.FRAGMENT_SHADER, fragment)
    const program = vs && fs ? gl.createProgram() : null
    if (!vs || !fs || !program) {
      return null
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return program
  }

  /**
   * Re-reads the box and resizes the drawing buffer to match.
   *
   * **Called from the observer, never from the frame.** `clientWidth` is a
   * layout read, and doing it per frame meant a forced synchronous layout on
   * every single frame to learn a number that changes when the box changes and
   * at no other time. The gate's `ResizeObserver` is told when that is.
   *
   * Returns whether the drawing buffer was resized, which is the same question
   * as whether it was cleared, and so whether the caller owes it a frame.
   */
  private measure(): boolean {
    /* Read through `this` rather than destructured, which is not a style
       preference: `noUnusedPrivateClassMembers` does not count a destructured
       read, so a `const { canvas } = this` here is the field's only use and the
       rule offers to delete the field. `TokenColorController` carries the same
       false positive under a suppression; this one costs a word instead. */
    const canvas = this.canvas
    const gl = this.gl
    if (!canvas || !gl) {
      return false
    }
    const rect = this.getBoundingClientRect()

    /* **An empty rect is layout that has not happened, not a box a pixel
       across.** These two were `Math.max(rect.width, 1)`, which never reports a
       bad measurement and instead manufactures a plausible one. Before first
       layout the rect is 0 by 0, so the clamp produced a 1 by 1 box, and every
       line below faithfully computed a drawing buffer for it: two pixels by
       two. The shader then painted four pixels and the compositor stretched
       them over the whole page.

       That is the settle. The field opened as one enormous soft blob, held it
       until a real box arrived, and snapped to its true feature size, which
       reads as the background scaling down. Instrumented on a reload it logged
       `boxH: 1, bufH: 2` at 216ms with `readyState: "complete"`.

       Declining is the whole fix. There is nothing worth drawing yet and the
       observer below is already waiting to say when there is; the host's own
       gradient covers the gap, which is what it is for. */
    if (rect.width < 1 || rect.height < 1) {
      return false
    }

    this.box = {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    }

    /* Capped at two, and a little under native beneath that. Every pixel runs
       five octaves of noise through two warps, and a 6K display at its full
       ratio is four times the work for a gradient nobody can resolve. Not as
       far under as it was: a parallax shift resolves on the buffer's own grid,
       so an aggressive scale makes the field step as it slides. */
    let dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.85

    /* **Then capped again against the box, because a ratio is not a budget.**
       The number above answers "how fine per CSS pixel" and says nothing about
       how many there are, which is fine while a field is a screen or two and
       stops being fine the moment one is asked to light a whole page. Measured
       on the landing page at 1280 by 6330: 2176 by 10761, or 23.4 million
       pixels of five-octave noise every frame, against the 5.3 million the same
       component costs over two screens.

       Two separate ceilings, because they fail differently.

       An edge past `MAX_RENDERBUFFER_SIZE` does not render slowly, it does not
       render. WebGL2 guarantees only 2048, and while desktops report 16384 the
       8192 that older integrated parts report is under that same 10761: the
       aura would have been missing outright rather than expensive, and only on
       the machines least able to say so. 4096 clears the guarantee twice over
       and is far more than a field with no edge in it can show.

       The pixel budget is the fill rate, and 2048 squared is close to what the
       component already cost at the size it was designed for, so a page-length
       field now costs about what a hero-sized one did rather than four of them.

       Both are applied to `dpr` rather than to the dimensions, so width and
       height come down together. The shader corrects for aspect off
       `uResolution`, and scaling one axis alone would stretch the shape. */
    const edge = Math.max(this.box.width, this.box.height) * dpr
    if (edge > MAX_CANVAS_EDGE) {
      dpr *= MAX_CANVAS_EDGE / edge
    }
    const pixels = this.box.width * this.box.height * dpr * dpr
    if (pixels > MAX_CANVAS_PIXELS) {
      dpr *= Math.sqrt(MAX_CANVAS_PIXELS / pixels)
    }

    const width = Math.round(this.box.width * dpr)
    const height = Math.round(this.box.height * dpr)
    if (width === this.width && height === this.height) {
      return false
    }
    this.width = width
    this.height = height
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
    gl.uniform2f(this.uniforms.uResolution ?? null, width, height)
    return true
  }

  private paint(): void {
    const { gl, uniforms } = this
    /* `width` is zero until a measurement succeeded, and a paint before that is
       a paint into the degenerate buffer described on `measure`. Guarded here
       rather than at each caller because the gate plays from its own observers
       as well as from setup, and one of those running early is the whole
       fault. */
    if (!gl || !this.program || !this.width) {
      return
    }
    this.readPalette()
    const { glow, ground, haze, peak } = this.palette
    gl.uniform3fv(uniforms.uGround ?? null, ground)
    gl.uniform3fv(uniforms.uHaze ?? null, haze)
    gl.uniform3fv(uniforms.uGlow ?? null, glow)
    gl.uniform3fv(uniforms.uPeak ?? null, peak)

    const frame = this.field.uniforms(this.settings, this.palette)
    gl.uniform1f(uniforms.uTime ?? null, frame.uTime)
    gl.uniform1i(uniforms.uShape ?? null, frame.uShape)
    gl.uniform1f(uniforms.uTilt ?? null, frame.uTilt)
    gl.uniform1f(uniforms.uScale ?? null, frame.uScale)
    gl.uniform1f(uniforms.uBloom ?? null, frame.uBloom)
    gl.uniform1f(uniforms.uGain ?? null, frame.uGain)
    gl.uniform1f(uniforms.uVariance ?? null, frame.uVariance)
    gl.uniform3fv(uniforms.uTrail ?? null, frame.uTrail)
    gl.uniform2f(uniforms.uPointer ?? null, frame.uPointer[0], frame.uPointer[1])
    gl.uniform1f(uniforms.uReach ?? null, frame.uReach)
    gl.uniform1i(uniforms.uInteraction ?? null, frame.uInteraction)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /**
   * The box changed, which is the one moment the buffer is re-measured.
   *
   * **A resize repaints unconditionally rather than asking.** `measure` clears
   * the drawing buffer whenever it resizes it, because assigning `canvas.width`
   * is a reset and not a hint. `paintOnce` declines while the loop holds a
   * frame, which is right for a property change the loop is about to draw
   * anyway and wrong here: the canvas is already transparent by the time it
   * declines, so the fallback gradient underneath showed through until the next
   * frame landed. One frame, on every reflow that changed the box.
   */
  private resized(): void {
    if (!this.measure()) {
      this.paintOnce()
      return
    }
    if (this.opened) {
      this.paint()
      this.gate.play()
      return
    }
    this.open()
  }

  /**
   * The opening frame, one animation frame after the box last changed.
   *
   * Each new measurement cancels the pending frame and books another, so a run
   * of resizes collapses to a single paint at the end of it rather than one per
   * step. `openBy` stops that from being unbounded.
   */
  private open(): void {
    if (this.opening) {
      cancelAnimationFrame(this.opening)
      this.opening = 0
    }
    if (this.openBy === 0) {
      this.openBy = performance.now() + OPENING_PATIENCE
    }
    const draw = (): void => {
      this.opening = 0
      this.opened = true
      this.paint()
      this.gate.play()
    }
    if (performance.now() >= this.openBy) {
      draw()
      return
    }
    this.opening = requestAnimationFrame(draw)
  }

  /** One frame, now, for a change that has to show while the loop is stopped. */
  private paintOnce(): void {
    /* **Not before the opening frame**, which is the whole of what `opened`
       promises. `updated` runs straight after `firstUpdated`, so without this
       the first box measured was painted at once: the frame the settle exists
       to hold back, drawn a frame early. Nor detached, where nobody sees it. */
    if (this.gate.running || !this.opened || !this.isConnected) {
      return
    }
    this.paint()
  }

  /** What a frame of the field reads of this element and its box. */
  private get settings(): AuraSettings {
    return {
      bloom: this.bloom,
      drift: this.drift,
      gain: this.gain,
      height: this.box.height,
      interaction: this.interaction,
      interactive: this.interactive,
      pattern: this.pattern,
      reach: this.reach,
      scale: this.scale,
      speed: this.speed,
      terminus: this.terminus,
      tilt: this.tilt,
      variance: this.variance,
      width: this.box.width,
    }
  }

  private advance(delta: number): void {
    if (this.field.advance(delta, this.settings)) {
      this.paint()
    }
  }

  private readonly handlePointer = (event: PointerEvent): void => {
    if (this.gate.reduced) {
      return
    }
    const { height, left, top, width } = this.box
    this.field.point((event.clientX - left) / width, (event.clientY - top) / height, this.settings)
  }

  private readonly handleLeave = (): void => {
    this.field.leave()
  }

  private readonly handleScroll = (): void => {
    /* Only the origin can have moved, and only what the pointer is measured
       against needs it, so this refreshes the cache and draws nothing. */
    const rect = this.getBoundingClientRect()
    this.box = { ...this.box, left: rect.left, top: rect.top }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-aura': HelixAura
  }
}
