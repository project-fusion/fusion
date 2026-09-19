import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * The longest step one frame is given, in seconds.
 *
 * A tab that was throttled and comes back hands the first frame a delta of
 * several seconds. Integrated whole, an animated canvas teleports: the aura's
 * field lands wherever the pointer went while nobody was watching, and the
 * orb's wave jumps a shape. The ceiling is 20 frames a second of simulated
 * time, so a genuinely slow frame still advances and a resumed one does not
 * skip ahead.
 *
 * Exported because a host that collects several frames into one owes the same
 * ceiling on what it spends. `Aura` caps its own frame rate and would otherwise
 * hand its shader exactly the step this number refuses.
 */
export const MAX_FRAME_STEP = 0.05

/**
 * What a frame is given where the clock did not move, in seconds.
 *
 * `performance.now()` is coarsened by a browser resisting fingerprinting, and
 * two reads a frame apart then answer the same number. Advancing by nothing
 * leaves the drawing still for as long as the reader has that setting on, so a
 * frame's worth stands in.
 */
const STILL_CLOCK = 0.016

/** What a painter hands the gate, and what the gate hands back. */
export interface PaintGateOptions {
  /**
   * Whether the host has anything to draw with, asked before every frame.
   *
   * The gate knows who is looking and nothing about what the host paints with:
   * a canvas context, a linked program, a drawing buffer that has been
   * measured, a context the browser has taken. Each of those is a reason to
   * refuse a frame that no shared `running` can know, so a host with one says
   * so here rather than losing a guard.
   */
  canRun?: () => boolean

  /** One frame, with the step in seconds already clamped. */
  onFrame: (delta: number) => void

  /**
   * The reader's motion preference, on every change of it.
   *
   * The loop is already stopped when `reduced` is true and already asked to
   * play when it is false. What is left is the still frame, and that is the
   * host's: a canvas holds whatever was on it when the loop stopped, and
   * mid-drift is not the resting shape.
   */
  onMotion?: (reduced: boolean) => void

  /** The host's box changed, which is when a drawing buffer is re-measured. */
  onResize?: () => void
}

/**
 * Runs a canvas painter's frame loop, and stops it whenever nobody is looking.
 *
 * It holds the five pieces every animated canvas needs and none of which is
 * about what is drawn: an `IntersectionObserver` for whether the host is on
 * screen, `visibilitychange` for whether the tab is in front,
 * `prefers-reduced-motion` and its `change` listener for whether the reader
 * asked for less, a `ResizeObserver` for the box, and the
 * `requestAnimationFrame` loop that reports a clamped step. It says whether it
 * is running, whether the reader asked for less motion, and whether the host is
 * on screen.
 *
 * **Separable because none of it reads a pixel.** `Aura` and `Orb` are the
 * library's two canvas painters and are otherwise nothing alike, one a WebGL
 * shader over a full-screen triangle and the other a depth-sorted cloud of 2D
 * dots. Everything above is the same question in both, which is when a frame is
 * worth drawing, and the answer never mentions the drawing.
 *
 * **Every path to a frame is gated, not only the observer's.** The tab's own
 * state is asked in `play` rather than in the intersection callback, because a
 * restored context, a resize, a state change and a preference all play too, and
 * a check that lives in the observer covers exactly one of them.
 *
 * **The next frame is asked for rather than booked blind.** A loop that books
 * its own next frame unconditionally ends only where something calls `stop`,
 * which is how a detached element and a host whose context was taken both went
 * on drawing into nothing.
 *
 * **The device-pixel cap is not here.** The aura scales by
 * `Math.min(devicePixelRatio || 1, 2) * 0.85` and the orb by
 * `Math.min(2, devicePixelRatio || 1)`, and the difference between them is a
 * measured fill cost, five octaves of noise per pixel against a disc fill.
 * Those are decisions about a drawing, not the mechanism around it.
 *
 * **Nor is context loss.** The event names differ by context type,
 * `webglcontextlost` against `contextlost`, and so does the contract: a 2D
 * context comes back unless the loss is canceled and a WebGL one comes back
 * only if it is. The aura's deferred release is an argument about a browser's
 * budget of about sixteen live WebGL contexts, which is nothing a 2D canvas
 * has.
 *
 * Client only, and by contract rather than by a guard: every caller holds a
 * drawing context before it calls `watch`, and there is no context on a server
 * or on a machine that refuses one.
 */
export class PaintGateController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: PaintGateOptions

  /** The booked frame, or `0`, which is also the whole of whether it runs. */
  private frame = 0

  /** When the last reported frame was, so the next one carries the gap. */
  private last = 0

  /**
   * What the intersection observer last said, kept because it says so only on
   * a change: every other path to `play` has to ask it.
   */
  private intersecting = false

  private motion: MediaQueryList | undefined
  private sized: ResizeObserver | undefined
  private visible: IntersectionObserver | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: PaintGateOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  /** Whether the host is on screen, as the intersection observer last said. */
  get onScreen(): boolean {
    return this.intersecting
  }

  /** Whether the reader asked for less motion. */
  get reduced(): boolean {
    return this.motion?.matches ?? false
  }

  /** Whether a frame is booked. */
  get running(): boolean {
    return this.frame !== 0
  }

  /**
   * Installs everything that decides whether a frame is wanted.
   *
   * Called from the host's own setup rather than from `hostConnected`, because
   * a host with nothing to draw with has nothing to gate: both painters ask for
   * a context first and return where there is none, which is a server, a
   * machine that refuses one, and a renderer the aura declines. Idempotent, so
   * a host whose setup runs on every connection calls it every time.
   */
  watch(): void {
    this.motion ??= window.matchMedia('(prefers-reduced-motion: reduce)')
    this.motion.addEventListener('change', this.handleMotion)

    this.visible ??= new IntersectionObserver(([entry]) => {
      this.intersecting = entry?.isIntersecting ?? false
      if (this.intersecting) {
        this.play()
      } else {
        this.stop()
      }
    })
    this.visible.observe(this.host)

    document.addEventListener('visibilitychange', this.handleVisibility)

    this.sized ??= new ResizeObserver(() => {
      this.options.onResize?.()
    })
    this.sized.observe(this.host)
  }

  hostDisconnected(): void {
    this.stop()
    /* **A detached host is not on screen**, and the observer that would say so
       is disconnected on the next line, so it is said here. Left standing, any
       path to `play` that no observer gates, a change of state or a context
       given back, starts a loop with nothing left to stop it. */
    this.intersecting = false
    this.visible?.disconnect()
    this.visible = undefined
    this.sized?.disconnect()
    this.sized = undefined
    this.motion?.removeEventListener('change', this.handleMotion)
    this.motion = undefined
    document.removeEventListener('visibilitychange', this.handleVisibility)
  }

  /** Starts the loop, where it is wanted and can be ended. */
  play(): void {
    if (this.frame || !this.wanted()) {
      return
    }
    this.last = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }

  /**
   * Ends the loop.
   *
   * `last` goes with it, so a loop starting again measures no step against a
   * stale stamp. What the host accumulated is the host's and is left alone.
   */
  stop(): void {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      this.frame = 0
    }
    this.last = 0
  }

  /** Whether anybody is looking, and whether the host can draw for them. */
  private wanted(): boolean {
    return (
      this.host.isConnected &&
      this.intersecting &&
      !this.reduced &&
      !document.hidden &&
      (this.options.canRun?.() ?? true)
    )
  }

  private readonly tick = (): void => {
    const now = performance.now()
    const delta = Math.min(MAX_FRAME_STEP, (now - this.last) / 1000 || STILL_CLOCK)
    this.last = now
    /* Cleared before the host draws, so a gate closed from inside that draw
       leaves no handle behind and the frame below is never booked. */
    this.frame = 0
    this.options.onFrame(delta)
    if (this.wanted()) {
      this.frame = requestAnimationFrame(this.tick)
    }
  }

  private readonly handleMotion = (): void => {
    if (this.reduced) {
      this.stop()
    }
    this.options.onMotion?.(this.reduced)
    this.play()
  }

  private readonly handleVisibility = (): void => {
    if (document.hidden) {
      this.stop()
    } else {
      this.play()
    }
  }
}
