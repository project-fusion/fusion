import {
  customElement,
  HelixElement,
  type TokenColor,
  TokenColorController,
} from '@fusion.dev/helix-core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { tiltFor } from '../axis.js'
import { FRAGMENT, INTERACTIONS, SHAPES, VERTEX } from '../shader.js'
import { styles } from './aura-root.css.js'

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
 * aura per frame, for a cost they do not pay. So it stays, and the specs stub
 * their draws rather than paying it.
 */

/**
 * @summary A lit, drifting background, drawn from the token layer.
 *
 * @description
 * One fragment shader over a full-screen triangle, with the palette read from
 * the tokens rather than given as colors. A background written with hex values
 * is an asset that has to be re-cut when the brand moves; one written against
 * `--helix-color-primary` is a consequence of it.
 *
 * **Every shape ramps through four token stops**, and the token layer inverts
 * each: the page's background, `primary-subtle`, `primary`, then a peak. The
 * peak is the foreground on a dark page and `primary-active` on a light one,
 * because mixing a saturated hue toward near-black takes the chroma out of the
 * pixels carrying most of it. Which way the page runs is read off the ground's
 * own luminance rather than asked of the mode, which is a private token.
 *
 * **No dependency, and no scene graph.** The geometry is three vertices derived
 * from `gl_VertexID`, so there is no attribute, no buffer and no upload.
 *
 * **It stops when nobody is looking**, off screen and in a background tab, and
 * `prefers-reduced-motion` gets one still frame rather than an empty box. A
 * context the browser takes back, on a GPU reset or past its cap of about
 * sixteen, stops it too, and the gradient shows until the context returns.
 *
 * Styled only, and with behavior, which the tier split does not otherwise
 * allow: the behavior is drawing to a canvas, so there is no structure a
 * consumer could restyle and nothing for a headless twin to hold.
 *
 * @since 0.1.0
 * @status experimental
 * @category media
 * @aliases Backdrop, Background, Atmosphere, Gradient
 * @documentation https://helix.fusion.dev/components/aura
 *
 * @csspart canvas - The surface the shader draws into.
 */
@customElement('helix-aura')
export class HelixAura extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * How soft the falloff is, `0` tight and `1` diffuse.
   */
  @property({ type: Number })
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
  @property({ type: Number })
  drift = 0

  /**
   * Overall brightness, as a multiplier on the field.
   */
  @property({ type: Number })
  gain = 1

  /**
   * What the pointer does, where the shape's own answer is not wanted.
   *
   * Absent is `native`, which is each shape answering in the terms it is made
   * of: braid leans, rays are occluded, threads pinch, particles scatter. The
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
   * How far the pointer reaches into the field, `0` upward.
   *
   * Multiplied into the presence the pointer already fades in and out with, so
   * it scales the whole response rather than any one part of it, whichever
   * interaction is in play.
   */
  @property({ type: Number })
  reach = 1

  /**
   * Feature size, as a multiplier on the sampled coordinates.
   */
  @property({ type: Number })
  scale = 1

  /**
   * How fast it drifts, as a multiplier on time.
   */
  @property({ type: Number })
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
  @property({ type: Number })
  terminus?: number

  /**
   * The field's rotation, in degrees.
   */
  @property({ type: Number })
  tilt = 14

  /**
   * How much the members of a population differ from one another, `0` a set
   * that is uniform and `1` the resting amount. Clamped to that range: these
   * are interpolations, so a larger number extrapolates rather than
   * exaggerating, and a streak whose length has passed through zero is drawn
   * as a bar across the whole frame.
   *
   * Read by the shapes made of many similar things, whether those are counted
   * or continuous: `streaks`, whose lanes draw a speed, a length, a width, a
   * spacing and a weight apiece; `particles`, whose motes draw a size, a
   * brightness and a wander; and `rays` and `aurora`, whose fan, bundles and
   * folds widen or even out. `braid`, `waves` and `flow` have a
   * single subject and nothing to vary, and `threads` is even on purpose, so on
   * those four this is inert.
   */
  @property({ type: Number })
  variance = 1

  /**
   * Which form the light takes. Absent is `braid`.
   *
   * Reflected because the fallback gradient selects on it, and given no default
   * for the same reason every axis here has none: a default on a reflected
   * property writes the attribute onto every host anybody renders.
   *
   * **`variant` and not `shape`.** `shape` is an axis about geometry, `circle`
   * against `square`, `arc` against `ring`, and it is registered as one.
   * Aurora, braid and caustics are not geometries; they are eleven names for a
   * look, which is what `variant` is for by the rule the registry already
   * states.
   */
  @property({ reflect: true })
  variant?:
    | 'aurora'
    | 'braid'
    | 'caustics'
    | 'flow'
    | 'fracture'
    | 'lattice'
    | 'particles'
    | 'rays'
    | 'streaks'
    | 'threads'
    | 'waves'

  /** Repaints when the palette moves, which no re-render would do on its own. */
  private readonly tokens = new TokenColorController(this, () => {
    this.readPalette()
    this.paintOnce()
  })

  /**
   * The four ramp stops, resolved.
   *
   * **Cached, because reading them is not free and they do not move.** Each
   * read sets a style, calls `getComputedStyle`, fills a pixel and reads it
   * back: a style recalc and a canvas readback apiece. Doing that inside
   * `paint` meant four of each on every frame, forever, to fetch values that
   * change only when the color mode does. The controller already says when
   * that happens, so this is filled from there and from the first paint.
   */
  private palette: { glow: TokenColor; ground: TokenColor; haze: TokenColor; peak: TokenColor } = {
    glow: [0.29, 0.61, 1],
    ground: [0, 0, 0],
    haze: [0.02, 0.15, 0.34],
    peak: [1, 1, 1],
  }

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

  private frame = 0
  private elapsed = 0
  private last = 0
  private width = 0
  private height = 0

  /**
   * Where the pointer has been, as flat triples of x, y and age.
   *
   * A ring rather than a queue: the oldest slot is overwritten, so nothing is
   * allocated and the cost is the same on the first second and the thousandth.
   */
  private readonly trail = new Float32Array(8 * 3).fill(1)
  private trailNext = 0

  /**
   * The same marks, oldest first, which is what the shader is given.
   *
   * The ring's own order is not time order, and the wake is drawn as a polyline
   * through consecutive entries: a segment across the wrap joined the newest
   * mark to the oldest and drew a bright bar clean through the middle of the
   * field. Unrolled once per frame, which is eight copies.
   */
  private readonly ordered = new Float32Array(9 * 3).fill(1)

  /**
   * The live end of the stroke, outside the ring.
   *
   * **In the ring it destroyed a mark every time it committed.** The head was
   * the slot at `trailNext`, so advancing wrote over whatever was oldest, and
   * the tail of the stroke lost a point instantly rather than fading. Held
   * apart, committing appends where the head already is: the polyline goes from
   * ending at P to ending at P, P, which is the same shape, and nothing jumps.
   */
  private readonly head = { x: 1, y: 1 }

  /**
   * Where the pointer is, and where the field has got to. The gap is weight.
   *
   * `presence`, not `reach`: the eased value is how far the pointer has faded
   * in, and `reach` is the consumer's amplitude. The two multiply.
   */
  private readonly target = { presence: 0, x: 0, y: 0 }
  private readonly eased = { presence: 0, x: 0, y: 0 }

  private motion: MediaQueryList | undefined
  private visible: IntersectionObserver | undefined

  /**
   * What the intersection observer last said, kept because it says so only on
   * a change: every other path to `play` has to ask it.
   */
  private onScreen = false

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

  /** Watches the element's own size, so no frame has to ask for it. */
  private sized: ResizeObserver | undefined

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
    return html`<canvas part="canvas" aria-hidden="true"></canvas>`
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
   * `disconnectedCallback` deletes the program, drops the context and
   * disconnects both observers, and runs every time the element moves. Setup
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
      return
    }
    this.canvas?.addEventListener('webglcontextlost', this.handleLost)
    this.canvas?.addEventListener('webglcontextrestored', this.handleRestored)

    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.addEventListener('pointermove', this.handlePointer)
    this.addEventListener('pointerleave', this.handleLeave)

    this.visible = new IntersectionObserver(([entry]) => {
      this.onScreen = entry?.isIntersecting ?? false
      if (this.onScreen) {
        this.play()
      } else {
        this.stop()
      }
    })
    this.visible.observe(this)

    document.addEventListener('visibilitychange', this.handleVisibility)
    /* Scroll moves the box without resizing it, and the cached origin is what
       the pointer is measured against. Passive, because nothing here cancels. */
    window.addEventListener('scroll', this.handleScroll, { capture: true, passive: true })

    this.sized = new ResizeObserver(() => {
      /* **A resize repaints unconditionally rather than asking.**
         `measure` clears the drawing buffer whenever it resizes it, because
         assigning `canvas.width` is a reset and not a hint. `paintOnce` declines
         while the loop holds a frame handle, which is right for a property
         change the loop is about to draw anyway and wrong here: the canvas is
         already transparent by the time it declines, so the fallback gradient
         underneath showed through until the next tick landed. One frame, on
         every reflow that changed the box. */
      if (!this.measure()) {
        this.paintOnce()
        return
      }
      if (this.opened) {
        this.paint()
        this.play()
        return
      }
      this.open()
    })
    this.sized.observe(this)

    this.readPalette()
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

  protected override updated(): void {
    /* A property change has to reach the screen even when the loop is stopped,
       which is every reader who asked for no motion. The canvas holds its last
       frame and no re-render repaints it. */
    this.paintOnce()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.stop()
    /* **The opening frame as well, which `stop` does not own**, and cannot:
       `stop` is also what going off screen calls, and an aura that lost its
       opening there would never open. Left booked here, it drew into a
       detached canvas whenever it ran before the release, and then started a
       loop after `stop` had already run: `tick` books its own next frame, so
       nothing ever ended it, and it went on ticking after the context was gone.
       `openBy` goes with it, so a return waits for its own box to settle. */
    if (this.opening) {
      cancelAnimationFrame(this.opening)
      this.opening = 0
      this.openBy = 0
    }
    this.visible?.disconnect()
    this.visible = undefined
    this.onScreen = false
    /* Before the release below, which loses the context itself and must not be
       answered by asking for it back. */
    this.canvas?.removeEventListener('webglcontextlost', this.handleLost)
    this.canvas?.removeEventListener('webglcontextrestored', this.handleRestored)
    this.removeEventListener('pointermove', this.handlePointer)
    this.removeEventListener('pointerleave', this.handleLeave)
    document.removeEventListener('visibilitychange', this.handleVisibility)
    window.removeEventListener('scroll', this.handleScroll, { capture: true })
    this.sized?.disconnect()
    this.sized = undefined
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
   * screen. `tick` books its own next frame, so the loop went on at 30 frames a
   * second against a context that draws nothing, and nothing made the program
   * again once the context came back: the aura never recovered.
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
    this.stop()
    if (this.opening) {
      cancelAnimationFrame(this.opening)
      this.opening = 0
    }
    this.program = null
    this.canvas?.toggleAttribute('hidden', true)
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
      this.play()
    } else if (this.width) {
      this.open()
    }
  }

  /**
   * Resolves the ramp. Called when the palette moves, not when a frame draws.
   *
   * Light pages peak on a deep brand blue and dark ones on the foreground, and
   * the ground is what says which: mixing a saturated hue toward near-black
   * takes the chroma out of exactly the pixels carrying the most of it. Read
   * from the ground's own luminance rather than asked of the color mode, which
   * is a private token this tier may not reach for.
   */
  private readPalette(): void {
    const ground = this.tokens.read('--helix-color-background', [0, 0, 0])
    const light = ground[0] * 0.2126 + ground[1] * 0.7152 + ground[2] * 0.0722 > 0.5
    this.palette = {
      glow: this.tokens.read('--helix-color-primary', [0.29, 0.61, 1]),
      ground,
      haze: this.tokens.read('--helix-color-primary-subtle', [0.02, 0.15, 0.34]),
      peak: light
        ? this.tokens.read('--helix-color-primary-active', [0.1, 0.2, 0.55])
        : this.tokens.read('--helix-color-foreground', [1, 1, 1]),
    }
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
   * layout read, and doing it in `tick` meant a forced synchronous layout on
   * every single frame to learn a number that changes when the box changes and
   * at no other time. A `ResizeObserver` is told when that is.
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
       rather than at each caller because `play` is started from the
       intersection observer and from `visibilitychange` as well as from setup,
       and one of those running early is the whole fault. */
    if (!gl || !this.program || !this.width) {
      return
    }
    const { glow, ground, haze, peak } = this.palette
    gl.uniform3fv(uniforms.uGround ?? null, ground)
    gl.uniform3fv(uniforms.uHaze ?? null, haze)
    gl.uniform3fv(uniforms.uGlow ?? null, glow)
    gl.uniform3fv(uniforms.uPeak ?? null, peak)

    gl.uniform1f(uniforms.uTime ?? null, this.elapsed)
    gl.uniform1i(uniforms.uShape ?? null, SHAPES.indexOf(this.variant ?? 'braid'))
    /* Each axis wanders on its own period. The seeds are deliberately not
       simple ratios of each other: two axes on periods that divide would come
       back into phase and give the whole field a beat. */
    gl.uniform1f(uniforms.uTilt ?? null, this.drifted(this.bearing, 14, 0.037))
    gl.uniform1f(uniforms.uScale ?? null, this.drifted(this.scale, 0.32, 0.061))
    gl.uniform1f(uniforms.uBloom ?? null, this.drifted(this.bloom, 0.22, 0.029))
    gl.uniform1f(uniforms.uGain ?? null, this.drifted(this.gain, 0.3, 0.053))
    gl.uniform1f(uniforms.uVariance ?? null, this.variance)
    /* Unrolled oldest first, with the live head appended last. `trailNext` is
       the next slot to be written and so the oldest again, now that the head no
       longer lives in the ring. */
    for (let i = 0; i < 8; i++) {
      const from = ((this.trailNext + i) % 8) * 3
      const to = i * 3
      this.ordered[to] = this.trail[from] ?? 1
      this.ordered[to + 1] = this.trail[from + 1] ?? 1
      this.ordered[to + 2] = this.trail[from + 2] ?? 1
    }
    this.ordered[24] = this.head.x
    this.ordered[25] = this.head.y
    this.ordered[26] = 0

    gl.uniform3fv(uniforms.uTrail ?? null, this.ordered)
    gl.uniform2f(uniforms.uPointer ?? null, this.eased.x, this.eased.y)
    gl.uniform1f(uniforms.uReach ?? null, this.eased.presence * Math.max(0, this.reach))
    gl.uniform1i(
      uniforms.uInteraction ?? null,
      Math.max(0, INTERACTIONS.indexOf(this.interaction ?? 'native')),
    )
    gl.drawArrays(gl.TRIANGLES, 0, 3)
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
      this.play()
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
    if (this.frame || !this.opened || !this.isConnected) {
      return
    }
    this.paint()
  }

  /**
   * The shortest gap between two painted frames, for a field nobody points at.
   *
   * **A drifting field does not need the display's rate and a pointer does.**
   * `tick` advances on `(now - this.last) / 1000`, so motion is wall-clock: at
   * half the frames the field moves the same distance in the same time, sampled
   * more coarsely. `delta` is already clamped at 0.05, which is a floor of 20
   * frames a second, and 30 sits inside that with room. A cap at 15 would land
   * on the clamp and the field would genuinely drag, which is the failure that
   * would be misdiagnosed as choppiness.
   *
   * **`interactive` is the exception and it is the whole exception.** The
   * element eases `presence` toward the pointer on a 50ms rise constant, so at
   * 33ms a frame the entire response is one or two samples and the follow reads
   * as a lag rather than a lightness. Every field on the landing page leaves
   * `interactive` unset; the only one that sets it is the lab on
   * `/helix/aura`, where it is a toggle a reader chose. So the cap applies where
   * nothing is being followed and lifts where something is.
   *
   * **The cost scales with the count.** Three fields run on the landing page,
   * one per transparent run, and with the frame limiter off they drew 2,654
   * times in three seconds against 1,276 for one: each instance draws once per
   * callback. Capping the two that nobody points at is most of that back.
   */
  private static readonly CAPPED = 1000 / 30

  private readonly tick = (now: number): void => {
    if (!this.last) {
      this.last = now
    }
    /* Skipped rather than rescheduled on a timer: `requestAnimationFrame` is
       what pauses in a background tab and what matches the display, and a
       `setTimeout` loop would give up both to save the same work. */
    if (!this.interactive && now - this.last < HelixAura.CAPPED) {
      this.frame = requestAnimationFrame(this.tick)
      return
    }
    /* Clamped: a tab returning from the background delivers one enormous delta,
       and the field would teleport to wherever the pointer had gone. */
    const delta = Math.min((now - this.last) / 1000, 0.05)
    this.last = now
    /* Accumulated rather than measured from a start stamp. A stamp reset on
       every pause means a reader who switched tabs and came back finds the
       field snapped to its opening frame, which is the one thing a background
       must never do. */
    this.elapsed += delta * Math.max(0, this.drifted(this.speed, 0.4, 0.043))

    /* Two time constants, because position and presence are two different jobs
       and one number serves both badly.

       **Position tracks.** A parallax that lags is not weighty, it is late: at
       85 milliseconds it took about two tenths of a second to close nine tenths
       of the gap, which is well inside what a reader perceives as the page
       being slow rather than the field being heavy.

       **Presence does not.** `reach` is the effect fading in as the pointer
       arrives and out as it leaves, and that wants to be gradual: snapped on,
       the whole field flinches the instant a cursor crosses the edge.

       **The position constant scales with the gap, because one constant cannot
       do both jobs.** A fixed 28 milliseconds leaves a moving pointer a
       distance v * t behind it for as long as it keeps moving: about 56 pixels
       at a 2000 pixel per second flick and twice that at twice the speed, which
       is what reads as the field being unable to keep up. Lowering it for
       everyone would give the jitter of a resting hand straight back to the
       shader, which is the only thing the smoothing was ever there for. Jitter
       is small and a flick is large, so the size of the gap is the signal that
       tells them apart: at rest this eases over about 25 milliseconds, a gap of
       one shape unit closes over nine, and two over five.

       Frame-rate independent, written as a time constant rather than a
       per-frame factor: a factor ties the feel to the refresh rate, so a 120Hz
       display would chase twice as eagerly as a 60Hz one. */
    const drift = Math.hypot(this.target.x - this.eased.x, this.target.y - this.eased.y)
    const follow = 1 - Math.exp(-delta / (0.028 / (1 + drift * 2.4)))
    if (!this.interactive) {
      this.target.presence = 0
    }
    this.eased.x += (this.target.x - this.eased.x) * follow
    this.eased.y += (this.target.y - this.eased.y) * follow

    /* Presence rises fast and falls slowly, which is not symmetry for its own
       sake. A single constant meant the effect took about four tenths of a
       second to reach full strength every time a pointer entered, and that
       ramp is indistinguishable from lag: a reader moves in, nothing much
       happens, and by the time it does they have decided the page is slow.
       Rising in 115 milliseconds it answers immediately; falling over half a
       second it lets go without the field flinching as the cursor crosses out. */
    const rising = this.target.presence > this.eased.presence
    const fade = 1 - Math.exp(-delta / (rising ? 0.05 : 0.22))
    this.eased.presence += (this.target.presence - this.eased.presence) * fade
    this.age(delta)
    this.advanceWake()

    this.paint()
    this.frame = requestAnimationFrame(this.tick)
  }

  /**
   * Starts the loop, where it is wanted and can be ended.
   *
   * **Never while detached.** `tick` books its own next frame, so the only
   * thing that ends the loop is `stop`, and a disconnection is the last time
   * `stop` is called. Everything that plays is canceled or disconnected there,
   * and this holds for whatever callback was already on its way.
   *
   * **Nor off screen, whoever asks.** The observer is the one caller that
   * knows, and a tab coming back, a resize and a restored context all play
   * too. An aura 2600 pixels below the fold booked no frame at rest and one on
   * every frame after its tab came back, until it had been scrolled in and out
   * again. Nor on a lost context, which draws nothing.
   */
  private play(): void {
    if (
      this.frame ||
      !this.isConnected ||
      !this.onScreen ||
      this.motion?.matches ||
      document.hidden ||
      !this.gl ||
      this.gl.isContextLost() ||
      !this.width ||
      !this.opened
    ) {
      return
    }
    this.frame = requestAnimationFrame(this.tick)
  }

  private stop(): void {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      this.frame = 0
    }
    /* `last` alone is cleared, so the next frame measures no delta against a
       stale stamp. `elapsed` is deliberately kept. */
    this.last = 0
  }

  /**
   * The angle actually drawn, which is `terminus` resolved against the box.
   *
   * A getter rather than a stored value because the box changes and this has no
   * business knowing when: it is read once per frame from numbers already
   * there.
   *
   * The solve is `tiltFor` in `axis.ts` rather than an expression here, so
   * it is callable and `aura-root.dom.spec.ts` runs it against a model of the
   * shader in both directions.
   */
  private get bearing(): number {
    if (this.terminus === undefined) {
      return this.tilt
    }
    const { height, width } = this.box
    return tiltFor(this.terminus, width / Math.max(height, 1))
  }

  /*
   * One axis, wandering around its set value.
   *
   * Two sines at an irrational ratio rather than one, so a single axis has no
   * period of its own either. Bounded by construction: the weights sum to one,
   * so the value never leaves `base` plus or minus `span`.
   */
  private drifted(base: number, span: number, seed: number): number {
    if (!this.drift) {
      return base
    }
    const t = this.elapsed
    const wave = Math.sin(t * seed) * 0.6 + Math.sin(t * seed * 1.618 + 2.1) * 0.4
    return base + span * this.drift * wave
  }

  /** Ages the wake, and drops a fresh mark where the pointer has moved far. */
  private age(delta: number): void {
    /* Two seconds to fade. Long enough that a wake outlives the gesture that
       made it, which is the whole effect, and short enough that a page left
       alone settles rather than keeping a drawing nobody made. */
    for (let i = 2; i < this.trail.length; i += 3) {
      const next = (this.trail[i] ?? 1) + delta / 2
      this.trail[i] = next > 1 ? 1 : next
    }
  }

  private readonly handlePointer = (event: PointerEvent): void => {
    if (this.motion?.matches) {
      return
    }
    const { height, left, top, width } = this.box
    const aspect = width / height
    this.target.x = ((event.clientX - left) / width - 0.5) * 2 * aspect
    this.target.y = -((event.clientY - top) / height - 0.5) * 2
    this.target.presence = this.interactive ? 1 : 0
  }

  /**
   * Keeps the head of the wake on the cursor, and commits it as it travels.
   *
   * **The head is provisional, never a committed mark**, and holding it in the
   * ring is two faults at once. Marks are spaced by distance so eight slots
   * cover a gesture rather than the last few milliseconds of one, but if
   * committing is also the only time the stroke grows, its leading end sits up
   * to a full gate behind the pointer and catches up in jumps of exactly that
   * size. Latent, and jagged, for one reason.
   *
   * So the slot at `trailNext` is rewritten every frame to wherever the field
   * has actually eased to, which is where the cursor looks like it is, so the
   * stroke always reaches the pointer. Crossing the gate does not move the head,
   * it just stops the previous position from being overwritten, and a new
   * provisional head starts from there. The wake grows continuously and is still
   * only ever eight points.
   *
   * Measured against `eased` rather than `target`, or the stroke would reach a
   * place the field has not arrived at yet and lead its own parallax.
   */
  private advanceWake(): void {
    if (!this.interactive) {
      return
    }
    this.head.x = this.eased.x
    this.head.y = this.eased.y

    const last = ((this.trailNext + 7) % 8) * 3
    const dx = this.head.x - (this.trail[last] ?? 0)
    const dy = this.head.y - (this.trail[last + 1] ?? 0)
    if (dx * dx + dy * dy < 0.014) {
      return
    }

    const at = this.trailNext * 3
    this.trail[at] = this.head.x
    this.trail[at + 1] = this.head.y
    this.trail[at + 2] = 0
    this.trailNext = (this.trailNext + 1) % 8

    /* Every other mark ages a slot's worth on each commit, on top of aging
       with time.

       Time alone is not enough, because what has to be spent by the moment the
       ring reuses a slot is a function of *distance traveled*, not of seconds:
       marks commit every gate length, so a brisk gesture laps the ring long
       before a two second fade has taken the oldest down, and overwriting a
       mark that is still bright is a pop at the tail.

       A seventh, not an eighth. A mark is written at nought and is skipped on
       its own commit, so it collects exactly seven increments before its slot
       comes round again. Measured at an eighth, every overwritten slot stood at
       0.875: faint, and not gone, and a faint point vanishing is still a pop. */
    for (let i = 2; i < this.trail.length; i += 3) {
      if (i === at + 2) {
        continue
      }
      const next = (this.trail[i] ?? 1) + 1 / 7
      this.trail[i] = next > 1 ? 1 : next
    }
  }

  private readonly handleLeave = (): void => {
    this.target.presence = 0
  }

  private readonly handleVisibility = (): void => {
    if (document.hidden) {
      this.stop()
    } else {
      this.play()
    }
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
