import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { readColor } from './orb-color.js'
import { styles } from './orb-root.css.js'
import {
  blendParams,
  evenSphere,
  fibonacci,
  meshFor,
  ORB_STATES,
  type OrbParams,
  type OrbState,
  orbPoint,
  paramsFor,
  project,
  smoother,
} from './orb-shapes.js'

/** How long a change of state takes, in ms. */
const MORPH = 700

/** The frame the still orb is drawn at: far enough in to have a shape. */
const STILL_PHASE = 1.4

/** What each state is called, for a reader who cannot see it. */
const LABELS: Record<OrbState, string> = {
  done: 'Done',
  fetching: 'Fetching',
  thinking: 'Thinking',
  working: 'Working',
}

/** A dot, ready to sort and draw. */
interface Dot {
  alpha: number
  radius: number
  shade: number
  x: number
  y: number
  z: number
}

/**
 * @summary Says what an agent is doing, as a shape rather than a word.
 *
 * @description
 * A cloud of dots on a sphere, drawn to a canvas, with one shape per state:
 * `thinking` is a narrow sash with a wave running through it, `fetching` spreads
 * into a globe with a highlight sweeping pole to pole, `working` flattens and
 * tilts with its bands shearing past each other, and `done` settles into an even
 * ball.
 *
 * **None of them is a separate drawing.** Each is the same banded sphere given
 * different numbers, so changing state interpolates the numbers and every frame
 * in between is a whole shape. A loader that cuts between pictures says the
 * work restarted; one that carries a shape into the next says it moved on.
 *
 * **Nothing spins.** All the movement is inside the shape, which is what makes
 * it read as thought rather than as a thing being rotated.
 *
 * **The palette is read from the tokens**, not given as colors: a dot's ink is
 * mixed toward the ground by how far away it is, and both ends come from
 * `--orb-color` and `--orb-ground`. That is what makes depth survive a theme
 * change without the consumer restating anything.
 *
 * **It stops when nobody is looking**, off screen and in a background tab, and
 * `prefers-reduced-motion` gets one still frame rather than an empty box.
 *
 * @since 0.8.0
 * @status experimental
 * @category feedback
 * @aliases Thinking, Activity, Agent, Status
 * @documentation https://helix.fusion.dev/components/orb
 *
 * @csspart canvas - The surface the cloud is drawn into.
 *
 * @cssproperty --orb-color - Ink of the nearest dots. Defaults to `currentColor`.
 * @cssproperty --orb-ground - What the far dots are mixed toward. Defaults to the page's background.
 * @cssproperty --orb-size - Diameter. Overrides `size`.
 */
@customElement('helix-orb')
export class HelixOrb extends HelixElement {
  static override styles: CSSResultGroup = [styles]

  /**
   * Accessible name, where the state's own word is not the right one.
   *
   * Empty is the state's word, which is what most callers want and none of them
   * should have to write. A caller with something better to say says it here:
   * the name of the tool being run, or the file being read.
   */
  @property()
  label = ''

  /**
   * Diameter relative to the surrounding text.
   *
   * Reflected because the stylesheet selects on it. The mesh is chosen from the
   * rendered box rather than from this, so `--orb-size` and a consumer's own
   * `inline-size` get the same treatment as the three named steps.
   */
  @property({ reflect: true })
  size?: 'lg' | 'sm'

  /**
   * What the agent is doing.
   *
   * **A name we do not draw is drawn as `thinking` rather than as nothing.**
   * The set of things an agent can be doing grows faster than this list, and a
   * verb we have not made a shape for should cost a reader a less specific
   * indicator, not an empty box where the indicator was.
   *
   * Not reflected: no rule selects on it, because the state is drawn rather than
   * styled. A consumer writing the attribute can still select on their own
   * markup.
   */
  @property()
  state: OrbState = 'thinking'

  private canvas: HTMLCanvasElement | undefined
  private context: CanvasRenderingContext2D | null = null
  private motion: MediaQueryList | undefined
  private visible: IntersectionObserver | undefined
  private sized: ResizeObserver | undefined

  private frame = 0
  private running = false
  private onScreen = false

  /** The box the canvas was last measured at, in CSS pixels. */
  private box = 0

  /**
   * Where the cloud is now, and where it is heading.
   *
   * **`from` holds numbers rather than the name of a state**, which is what
   * makes an interruption free: changing state mid-transition snapshots the
   * blend that is on the screen at that instant and departs from it. Holding a
   * name forces a choice between the shape being left and the shape being
   * approached, and either one is a jump the reader sees.
   */
  private from: OrbParams = paramsFor('thinking')
  private morphAt = 0

  /**
   * The state's clock, accumulated rather than derived.
   *
   * **`elapsed * rate` looks equivalent and is not.** `rate` is one of the
   * numbers a transition interpolates, and multiplying a running clock by a
   * changing rate throws the phase forward by the elapsed time times the
   * change. A minute in, a rate moving from 2.1 to 2.4 skips the wave thirty
   * seconds ahead, and the orb lurches on every state change. Integrating the
   * rate has no such term.
   */
  private phase = STILL_PHASE
  private last = 0

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const state = (ORB_STATES as readonly string[]).includes(this.state)
      ? (this.state as OrbState)
      : 'thinking'
    /* `progressbar` while there is work outstanding, and a plain image once
       there is not: a finished orb that still announced itself as a progress
       bar would leave a screen reader waiting for a bar that never fills. */
    hostAria(this.internals, {
      label: this.label || LABELS[state],
      role: state === 'done' ? 'img' : 'progressbar',
    })
    this.internals.ariaBusy = state === 'done' ? 'false' : 'true'

    if (changed.has('state') && changed.get('state') !== undefined) {
      this.turn()
    }
  }

  protected override render(): TemplateResult {
    /* `aria-hidden` on the canvas rather than the host: the host carries the
       name and the role through `ElementInternals`, and the canvas has nothing
       of its own to announce. */
    return html`<canvas part="canvas" aria-hidden="true"></canvas>`
  }

  protected override firstUpdated(): void {
    this.start()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Guarded on `hasUpdated`, because the first connection happens before the
       first render and there is no canvas yet. */
    if (this.hasUpdated) {
      this.start()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.stop()
    this.visible?.disconnect()
    this.visible = undefined
    this.sized?.disconnect()
    this.sized = undefined
    this.motion?.removeEventListener('change', this.handleMotion)
    this.motion = undefined
    document.removeEventListener('visibilitychange', this.handleVisibility)
  }

  /* Everything the canvas needs, in one place both lifecycles can reach.
   *
   * `firstUpdated` runs once for the life of the element, while
   * `disconnectedCallback` drops the observers and runs every time the element
   * moves. Setup that lived only in `firstUpdated` would leave an orb reordered
   * by a framework with no observers and nothing to rebuild them: a live
   * component painting one frame forever, with no error anywhere. */
  private start(): void {
    const canvas = this.renderRoot.querySelector('canvas')
    /* Client only, and by contract. There is no canvas on a server, and a
       machine that refuses a 2D context gets an empty box rather than a
       thrown error. */
    if (!canvas) {
      return
    }
    this.canvas = canvas
    this.context ??= canvas.getContext('2d')
    if (!this.context) {
      return
    }

    this.motion ??= window.matchMedia('(prefers-reduced-motion: reduce)')
    this.motion.addEventListener('change', this.handleMotion)

    this.visible ??= new IntersectionObserver(([entry]) => {
      this.onScreen = entry?.isIntersecting ?? false
      if (this.onScreen && document.visibilityState !== 'hidden') {
        this.play()
      } else {
        this.stop()
      }
    })
    this.visible.observe(this)

    document.addEventListener('visibilitychange', this.handleVisibility)

    this.sized ??= new ResizeObserver(() => {
      this.measure()
      this.paint(0)
    })
    this.sized.observe(this)

    this.measure()
    this.paint(0)
  }

  /**
   * Matches the drawing buffer to the box, and reports whether it changed.
   *
   * Capped at two device pixels: past that the dot count is unchanged and the
   * fill cost doubles again for a mesh already drawn sub-pixel.
   */
  private measure(): boolean {
    const canvas = this.canvas
    if (!canvas) {
      return false
    }
    const size = Math.round(this.getBoundingClientRect().width)
    if (size <= 0 || size === this.box) {
      return false
    }
    this.box = size
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    this.context?.setTransform(dpr, 0, 0, dpr, 0, 0)
    return true
  }

  /** Begins a transition from whatever is on the screen right now. */
  private turn(): void {
    this.from = this.paramsNow()
    this.morphAt = performance.now()
    if (!this.running) {
      this.paint(0)
      this.play()
    }
  }

  /** How far through a transition, `1` when there is not one. */
  private get progress(): number {
    return this.morphAt === 0 ? 1 : Math.min(1, (performance.now() - this.morphAt) / MORPH)
  }

  private paramsNow(): OrbParams {
    const to = paramsFor(this.state)
    const k = this.progress
    return k >= 1 ? to : blendParams(this.from, to, smoother(k))
  }

  private play(): void {
    if (this.running || this.motion?.matches || !this.onScreen) {
      return
    }
    this.running = true
    this.last = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }

  private stop(): void {
    this.running = false
    cancelAnimationFrame(this.frame)
  }

  private readonly tick = (): void => {
    if (!this.running) {
      return
    }
    const now = performance.now()
    /* Clamped, because a tab that was throttled and came back hands the first
       frame a delta of several seconds, and the wave would jump. */
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016)
    this.last = now
    this.paint(dt)
    /* A settled orb still draws: every state has movement of its own, and only
       `prefers-reduced-motion` and leaving the screen stop it. */
    this.frame = requestAnimationFrame(this.tick)
  }

  private readonly handleVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      this.stop()
    } else {
      this.play()
    }
  }

  private readonly handleMotion = (): void => {
    if (this.motion?.matches) {
      this.stop()
      this.phase = STILL_PHASE
      this.morphAt = 0
      this.paint(0)
    } else {
      this.play()
    }
  }

  /**
   * One frame.
   *
   * Painter's algorithm: every dot is sorted by depth and drawn back to front,
   * because a near dot has to cover a far one for the cloud to read as a solid
   * rather than as a smear.
   */
  private paint(dt: number): void {
    const ctx = this.context
    const size = this.box
    if (!ctx || size <= 0) {
      return
    }
    const still = this.motion?.matches ?? false
    const params = still ? paramsFor(this.state) : this.paramsNow()
    this.phase += dt * params.rate

    /* Read off the canvas rather than the host: the stylesheet resolves both
       ends of the ramp onto color-typed properties there, for the reason its
       comment gives. */
    const painted = getComputedStyle(ctx.canvas)
    const ink = readColor(painted.color)
    const ground = readColor(painted.textDecorationColor)

    const mesh = meshFor(size)
    const even = evenSphere(mesh.lanes, mesh.segs)
    const scan = Math.sin(this.phase * 0.85) * 0.93
    /* One swell at the midpoint, so a change of state is felt as well as seen. */
    const shell = still ? 1 : 1 + 0.1 * Math.sin(Math.PI * this.progress)
    const dots: Dot[] = []

    for (let i = 0; i < mesh.ghostCount; i++) {
      const [x, y, z] = fibonacci(i, mesh.ghostCount)
      const [px, py, pz] = project(size, x, y, z)
      dots.push({
        alpha: mesh.ghostAlpha + mesh.ghostAlphaSpan * ((pz + 1) / 2),
        radius: mesh.ghostRadius * mesh.radiusScale,
        shade: mesh.ghostShade,
        x: px,
        y: py,
        z: pz,
      })
    }

    let index = 0
    for (let band = 0; band < mesh.lanes; band++) {
      const u = mesh.lanes < 2 ? 0.5 : band / (mesh.lanes - 1)
      const edge = params.edge * Math.abs(u - 0.5) * 2
      for (let s = 0; s < mesh.segs; s++, index++) {
        const [x, y, z] = orbPoint(u, s / mesh.segs, this.phase, params, index, even)
        const [px, py, pz] = project(size, x * shell, y * shell, z * shell)
        const depth = (pz + 1) / 2
        const boost =
          params.scan * Math.exp(-((y - scan) ** 2) / 0.012) +
          params.jitter * (0.1 + 0.1 * Math.sin(this.phase * 0.6))
        dots.push({
          alpha: mesh.aMin + (1 - mesh.aMin) * depth,
          radius:
            (mesh.radiusBase + mesh.radiusDepth * depth) *
            (1 - 0.25 * edge) *
            (1 + 0.55 * boost) *
            mesh.radiusScale,
          shade: mesh.shadeFar - mesh.shadeSpan * depth + 0.18 * edge - 0.34 * boost,
          x: px,
          y: py,
          z: pz,
        })
      }
    }

    dots.sort((a, b) => a.z - b.z)
    ctx.clearRect(0, 0, size, size)
    for (const dot of dots) {
      if (dot.alpha < 0.02) {
        continue
      }
      const t = Math.min(1, Math.max(0, dot.shade))
      ctx.fillStyle = `rgba(${Math.round(ink[0] + (ground[0] - ink[0]) * t)},${Math.round(
        ink[1] + (ground[1] - ink[1]) * t,
      )},${Math.round(ink[2] + (ground[2] - ink[2]) * t)},${dot.alpha})`
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, Math.max(0.3, dot.radius), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/**
 * The numbers out of a resolved color.
 *
 * The engine reports color-typed properties as `rgb()` or `color()`, so the
 * digits are already there to be read. Deliberately forgiving all the same: a
 * value this cannot parse costs the orb its depth rather than its existence,
 * and a test environment with no layout engine is exactly such a value.
 */
declare global {
  interface HTMLElementTagNameMap {
    'helix-orb': HelixOrb
  }
}
