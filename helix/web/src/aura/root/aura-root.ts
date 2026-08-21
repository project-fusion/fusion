import { customElement, HelixElement, type TokenColor, TokenColorController } from '@helix-io/core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './aura-root.css.js'
import { FRAGMENT, SHAPES, VERTEX } from './aura-shader.js'

/**
 * @summary A lit, drifting background, drawn from the token layer.
 *
 * @description
 * One fragment shader over a full-screen triangle, with the palette read from
 * the tokens rather than given as colors. That is the whole reason this belongs
 * in a design system instead of in a page: a background written with hex values
 * is an asset that has to be re-cut when the brand moves, and one written
 * against `--helix-color-primary` is a consequence of it.
 *
 * **Every shape ramps through four token stops**, and the token layer inverts
 * each of them: the page's own background, `primary-subtle`, `primary`, and
 * then a peak. The peak is the foreground on a dark page and `primary-active`
 * on a light one, because mixing a saturated hue toward near-black takes the
 * chroma out of exactly the pixels carrying the most of it. Which way the page
 * runs is not asked of the mode, which is a private token: it is read off the
 * ground's own luminance, which the shader already has.
 *
 * **No dependency, and no scene graph.** The geometry is three vertices derived
 * from `gl_VertexID`, so there is no attribute, no buffer and no upload. The
 * common implementations of this reach for a 3D library to draw one quad, which
 * is a camera and a material system for four vertices that never move.
 *
 * **It stops when nobody is looking**, off screen and in a background tab, and
 * `prefers-reduced-motion` gets one still frame rather than an empty box: the
 * composition is the point and the drift is a garnish.
 *
 * **A layer over an interactive aura has to let the pointer through.** The
 * element is hit-testable only when `interactive` is set, because a background
 * that swallows clicks is worse than one that does nothing, but a scrim or an
 * overlay a consumer paints on top will absorb the move before it arrives. Any
 * decorative layer above this wants `pointer-events: none`. It has already
 * caught this repository's own bench once.
 *
 * **The fallback needs no detection.** Where WebGL is refused the canvas never
 * paints and is transparent, and the host carries a gradient of the same tokens
 * underneath. Nothing has to ask whether it worked.
 *
 * Presentation only, so there is no headless tier: the split exists to keep
 * behavior separate from styling, and there is no structure or semantics here
 * to separate. Decorative, so the host is hidden from assistive technology and
 * takes no pointer events.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Backdrop, Background, Atmosphere, Gradient
 * @documentation https://helix.fusion.dev/components/aura
 *
 * @csspart canvas - The surface the shader draws into.
 */
@customElement('helix-aura')
export class HelixAura extends HelixElement {
  static override styles: CSSResultGroup = [styles]

  /**
   * Which form the light takes. Absent is `braid`.
   *
   * Reflected because the fallback gradient selects on it, and given no default
   * for the same reason every axis here has none: a default on a reflected
   * property writes the attribute onto every host anybody renders.
   */
  @property({ reflect: true })
  shape?: 'aurora' | 'braid' | 'flow' | 'orbit' | 'rays' | 'weave'

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
   * Whether the pointer shifts and lifts the field.
   *
   * Reflected because the stylesheet selects on it: a background is not
   * hit-testable at rest, or it would swallow clicks meant for what is over it,
   * and an element that is not hit-testable never receives the `pointermove`
   * this listens for. Asking for the pointer is asking for the hit test.
   */
  @property({ reflect: true, type: Boolean })
  interactive = false

  /** How soft the falloff is, `0` tight and `1` diffuse. */
  @property({ type: Number })
  bloom = 0.5

  /** Overall brightness, as a multiplier on the field. */
  @property({ type: Number })
  gain = 1

  /** Feature size, as a multiplier on the sampled coordinates. */
  @property({ type: Number })
  scale = 1

  /** How fast it drifts, as a multiplier on time. */
  @property({ type: Number })
  speed = 1

  /** The field's rotation, in degrees. */
  @property({ type: Number })
  tilt = 14

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

  /** Where the pointer is, and where the field has got to. The gap is weight. */
  private readonly target = { reach: 0, x: 0, y: 0 }
  private readonly eased = { reach: 0, x: 0, y: 0 }

  private motion: MediaQueryList | undefined
  private visible: IntersectionObserver | undefined

  /**
   * The element's box, cached.
   *
   * **Read per event, this was the ragged half.** `getBoundingClientRect` forces
   * a synchronous layout, and a pointer emits events far faster than the
   * display refreshes: a 1000Hz mouse flushed layout a thousand times a second
   * to compute a number that only changes when the page reflows. Refreshed from
   * the resize observer and from scroll, both of which are exactly when it can
   * go stale, and never from the handler that reads it.
   */
  private box = { height: 1, left: 0, top: 0, width: 1 }

  /** Watches the element's own size, so no frame has to ask for it. */
  private sized: ResizeObserver | undefined

  protected override render(): TemplateResult {
    /* `aria-hidden` on the canvas rather than on the host, because a consumer
       may want to label the region this sits behind and a hidden host would
       take that with it. The canvas itself never has anything to announce. */
    return html`<canvas part="canvas" aria-hidden="true"></canvas>`
  }

  protected override firstUpdated(): void {
    /* Client only, and by contract. There is no canvas on a server, so the
       shader is an enhancement over markup that already renders a gradient. */
    this.canvas = this.renderRoot.querySelector('canvas')
    if (!this.canvas) {
      return
    }

    /* `antialias` off, because nothing here has a geometric edge to alias:
       every boundary is a gradient the shader computes. Multisampling would
       allocate a second screen-sized buffer to average pixels already smooth.
       `preserveDrawingBuffer` off too, which costs the ability to sample the
       canvas from a test and saves a full-screen copy on every frame. */
    this.gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
      stencil: false,
    })
    if (!this.gl) {
      return
    }

    this.program = this.link(VERTEX, FRAGMENT)
    if (!this.program) {
      return
    }
    this.gl.useProgram(this.program)
    for (const name of [
      'uBloom',
      'uGain',
      'uGlow',
      'uGround',
      'uHaze',
      'uInk',
      'uPeak',
      'uPointer',
      'uReach',
      'uResolution',
      'uScale',
      'uShape',
      'uTilt',
      'uTime',
      'uTrail',
    ]) {
      this.uniforms[name] = this.gl.getUniformLocation(this.program, name)
    }

    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.addEventListener('pointermove', this.handlePointer)
    this.addEventListener('pointerleave', this.handleLeave)

    this.visible = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
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
      this.measure()
      this.paintOnce()
    })
    this.sized.observe(this)

    this.measure()
    this.readPalette()
    this.paintOnce()
    this.play()
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
    this.visible?.disconnect()
    this.visible = undefined
    this.removeEventListener('pointermove', this.handlePointer)
    this.removeEventListener('pointerleave', this.handleLeave)
    document.removeEventListener('visibilitychange', this.handleVisibility)
    window.removeEventListener('scroll', this.handleScroll, { capture: true })
    this.sized?.disconnect()
    this.sized = undefined
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }
    this.program = null
    this.gl = null
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
   */
  private measure(): void {
    const { canvas, gl } = this
    if (!canvas || !gl) {
      return
    }
    const rect = this.getBoundingClientRect()
    this.box = {
      height: Math.max(rect.height, 1),
      left: rect.left,
      top: rect.top,
      width: Math.max(rect.width, 1),
    }

    /* Capped at two, and a little under native beneath that. Every pixel runs
       five octaves of noise through two warps, and a 6K display at its full
       ratio is four times the work for a gradient nobody can resolve. Not as
       far under as it was: a parallax shift resolves on the buffer's own grid,
       so an aggressive scale makes the field step as it slides. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.85
    const width = Math.round(this.box.width * dpr)
    const height = Math.round(this.box.height * dpr)
    if (width === this.width && height === this.height) {
      return
    }
    this.width = width
    this.height = height
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
    gl.uniform2f(this.uniforms.uResolution ?? null, width, height)
  }

  private paint(): void {
    const { gl, uniforms } = this
    if (!gl || !this.program) {
      return
    }
    const { glow, ground, haze, peak } = this.palette
    gl.uniform3fv(uniforms.uGround ?? null, ground)
    gl.uniform3fv(uniforms.uHaze ?? null, haze)
    gl.uniform3fv(uniforms.uGlow ?? null, glow)
    gl.uniform3fv(uniforms.uPeak ?? null, peak)

    gl.uniform1f(uniforms.uTime ?? null, this.elapsed)
    gl.uniform1i(uniforms.uShape ?? null, SHAPES.indexOf(this.shape ?? 'braid'))
    /* Each axis wanders on its own period. The seeds are deliberately not
       simple ratios of each other: two axes on periods that divide would come
       back into phase and give the whole field a beat. */
    gl.uniform1f(uniforms.uTilt ?? null, this.drifted(this.tilt, 14, 0.037))
    gl.uniform1f(uniforms.uScale ?? null, this.drifted(this.scale, 0.32, 0.061))
    gl.uniform1f(uniforms.uBloom ?? null, this.drifted(this.bloom, 0.22, 0.029))
    gl.uniform1f(uniforms.uGain ?? null, this.drifted(this.gain, 0.3, 0.053))
    gl.uniform3fv(uniforms.uTrail ?? null, this.trail)
    gl.uniform2f(uniforms.uPointer ?? null, this.eased.x, this.eased.y)
    gl.uniform1f(uniforms.uReach ?? null, this.eased.reach)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** One frame, now, for a change that has to show while the loop is stopped. */
  private paintOnce(): void {
    if (this.frame) {
      return
    }
    this.paint()
  }

  private readonly tick = (now: number): void => {
    if (!this.last) {
      this.last = now
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

    /* Two time constants, because position and presence are two different
       jobs and one number was serving both badly.
       
       **Position tracks.** A parallax that lags is not weighty, it is late: at
       85 milliseconds it took about two tenths of a second to close nine tenths
       of the gap, which is well inside what a reader perceives as the page
       being slow rather than the field being heavy. 28 milliseconds puts it at
       the edge of perception while still absorbing the jitter a raw pointer
       carries, which is the only thing the easing was ever for.
       
       **Presence does not.** `reach` is the effect fading in as the pointer
       arrives and out as it leaves, and that wants to be gradual: snapped on,
       the whole field flinches the instant a cursor crosses the edge.
       
       Frame-rate independent, written as a time constant rather than a
       per-frame factor: a factor ties the feel to the refresh rate, so a 120Hz
       display would chase twice as eagerly as a 60Hz one. */
    const follow = 1 - Math.exp(-delta / 0.028)
    const fade = 1 - Math.exp(-delta / 0.16)
    if (!this.interactive) {
      this.target.reach = 0
    }
    this.eased.x += (this.target.x - this.eased.x) * follow
    this.eased.y += (this.target.y - this.eased.y) * follow
    this.eased.reach += (this.target.reach - this.eased.reach) * fade
    this.age(delta)

    this.paint()
    this.frame = requestAnimationFrame(this.tick)
  }

  private play(): void {
    if (this.frame || this.motion?.matches || document.hidden || !this.gl) {
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
    this.target.reach = this.interactive ? 1 : 0

    /* Marks are spaced by distance, not by a clock.
     *
     * A pointer emits far more events than eight slots hold, so something has
     * to thin them, and time was the wrong axis twice over. A fast gesture laid
     * marks a third of a frame apart and the wake stepped, while a slow one
     * stacked all eight inside a thumbnail. And the countdown was decremented
     * from the frame loop, so with the loop stopped it never expired: measured
     * at 200 events, exactly one mark was ever dropped.
     *
     * By distance the spacing is even at every speed, which is what a wake
     * looks like, and it depends on nothing but the pointer. */
    if (!this.interactive) {
      return
    }
    const last = ((this.trailNext + 7) % 8) * 3
    const dx = this.target.x - (this.trail[last] ?? 0)
    const dy = this.target.y - (this.trail[last + 1] ?? 0)
    if (dx * dx + dy * dy < 0.014) {
      return
    }
    const at = this.trailNext * 3
    this.trail[at] = this.target.x
    this.trail[at + 1] = this.target.y
    this.trail[at + 2] = 0
    this.trailNext = (this.trailNext + 1) % 8
  }

  private readonly handleLeave = (): void => {
    this.target.reach = 0
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
