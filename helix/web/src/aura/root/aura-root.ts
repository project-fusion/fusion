import { customElement, HelixElement, TokenColorController } from '@helix-io/core'
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
  shape?: 'aurora' | 'braid' | 'orbit' | 'rays' | 'weave'

  /** Whether the pointer shifts and lifts the field. */
  @property({ type: Boolean })
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
  private readonly tokens = new TokenColorController(this, () => this.paintOnce())

  private canvas: HTMLCanvasElement | null = null
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> = {}

  private frame = 0
  private elapsed = 0
  private last = 0
  private width = 0
  private height = 0

  /** Where the pointer is, and where the field has got to. The gap is weight. */
  private readonly target = { reach: 0, x: 0, y: 0 }
  private readonly eased = { reach: 0, x: 0, y: 0 }

  private motion: MediaQueryList | undefined
  private visible: IntersectionObserver | undefined

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
      'uSpeed',
      'uTilt',
      'uTime',
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
    window.addEventListener('resize', this.handleResize)

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
    window.removeEventListener('resize', this.handleResize)
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }
    this.program = null
    this.gl = null
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

  private resize(): void {
    const { canvas, gl } = this
    if (!canvas || !gl) {
      return
    }
    /* Capped at two and scaled beneath it. Every pixel runs four octaves of
       noise, and a 6K display at its native ratio is four times the work for a
       gradient nobody can resolve. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.66
    const width = Math.round(canvas.clientWidth * dpr)
    const height = Math.round(canvas.clientHeight * dpr)
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
    const ground = this.tokens.read('--helix-color-background', [0, 0, 0])
    /* Light pages peak on a deep brand blue and dark ones on the foreground,
       and the ground is what says which. Read here rather than asked of the
       mode, which is a private token this tier may not reach for. */
    const light = ground[0] * 0.2126 + ground[1] * 0.7152 + ground[2] * 0.0722 > 0.5

    gl.uniform3fv(uniforms.uGround ?? null, ground)
    gl.uniform3fv(
      uniforms.uHaze ?? null,
      this.tokens.read('--helix-color-primary-subtle', [0.02, 0.15, 0.34]),
    )
    gl.uniform3fv(
      uniforms.uGlow ?? null,
      this.tokens.read('--helix-color-primary', [0.29, 0.61, 1]),
    )
    gl.uniform3fv(
      uniforms.uPeak ?? null,
      light
        ? this.tokens.read('--helix-color-primary-active', [0.1, 0.2, 0.55])
        : this.tokens.read('--helix-color-foreground', [1, 1, 1]),
    )

    gl.uniform1f(uniforms.uTime ?? null, this.elapsed)
    gl.uniform1i(uniforms.uShape ?? null, SHAPES.indexOf(this.shape ?? 'braid'))
    gl.uniform1f(uniforms.uTilt ?? null, this.tilt)
    gl.uniform1f(uniforms.uSpeed ?? null, this.speed)
    gl.uniform1f(uniforms.uScale ?? null, this.scale)
    gl.uniform1f(uniforms.uBloom ?? null, this.bloom)
    gl.uniform1f(uniforms.uGain ?? null, this.gain)
    gl.uniform2f(uniforms.uPointer ?? null, this.eased.x, this.eased.y)
    gl.uniform1f(uniforms.uReach ?? null, this.eased.reach)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** One frame, now, for a change that has to show while the loop is stopped. */
  private paintOnce(): void {
    if (this.frame) {
      return
    }
    this.resize()
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
    this.elapsed += delta

    /* Frame-rate independent easing. A fixed factor per frame ties the feel to
       the refresh rate, so a 120Hz display would chase twice as eagerly. */
    const k = 1 - (1 - 0.12) ** (delta * 60)
    if (!this.interactive) {
      this.target.reach = 0
    }
    this.eased.x += (this.target.x - this.eased.x) * k
    this.eased.y += (this.target.y - this.eased.y) * k
    this.eased.reach += (this.target.reach - this.eased.reach) * k

    this.resize()
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

  private readonly handlePointer = (event: PointerEvent): void => {
    if (this.motion?.matches) {
      return
    }
    const box = this.getBoundingClientRect()
    const aspect = box.width / Math.max(box.height, 1)
    this.target.x = ((event.clientX - box.left) / box.width - 0.5) * 2 * aspect
    this.target.y = -((event.clientY - box.top) / box.height - 0.5) * 2
    this.target.reach = this.interactive ? 1 : 0
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

  private readonly handleResize = (): void => {
    this.paintOnce()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-aura': HelixAura
  }
}
