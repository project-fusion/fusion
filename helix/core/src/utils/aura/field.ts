/**
 * The aura's field, as numbers: the clock it runs on, the drift that wanders
 * each setting, where the pointer is and has been, and the uniforms one frame
 * of the shader takes. The web element hands them to WebGL, and a phone hands
 * the same numbers to its GPU drawing, so both draw one field.
 */
import { tiltFor } from './axis.js'
import type { AuraPalette } from './palette.js'
import { INTERACTIONS, SHAPES } from './shader.js'

/** The longest step one frame advances, in seconds, as the web's paint gate caps it. */
export const AURA_MAX_STEP = 0.05

/**
 * The settings a frame reads, as the element holds them. `width` and `height`
 * are the box the pointer and `terminus` are measured against.
 */
export interface AuraSettings {
  readonly bloom: number
  readonly drift: number
  readonly gain: number
  readonly height: number
  readonly interaction?: string | undefined
  readonly interactive: boolean
  readonly pattern?: string | undefined
  readonly reach: number
  readonly scale: number
  readonly speed: number
  readonly terminus?: number | undefined
  readonly tilt: number
  readonly variance: number
  readonly width: number
}

/** One frame's uniforms, by the names the shader declares. */
export interface AuraUniforms {
  readonly uBloom: number
  readonly uGain: number
  readonly uGlow: readonly number[]
  readonly uGround: readonly number[]
  readonly uHaze: readonly number[]
  readonly uInteraction: number
  readonly uPeak: readonly number[]
  readonly uPointer: readonly [number, number]
  readonly uReach: number
  readonly uScale: number
  readonly uShape: number
  readonly uTilt: number
  readonly uTime: number
  readonly uTrail: Float32Array
  readonly uVariance: number
}

/** The shader's index of a pattern, `braid` for one it does not draw. */
export const auraShape = (pattern: string | undefined): number =>
  Math.max(0, SHAPES.indexOf((pattern ?? 'braid') as (typeof SHAPES)[number]))

/** The shader's index of an interaction, `native` for one it does not know. */
export const auraInteraction = (interaction: string | undefined): number =>
  Math.max(0, INTERACTIONS.indexOf((interaction ?? 'native') as (typeof INTERACTIONS)[number]))

/**
 * The field's state between frames.
 *
 * **The time is the field's own**, advanced by each frame's step times the
 * drifted speed, so a pause holds the field where it stood. Without the
 * pointer a frame advances at most thirty times a second.
 *
 * **The pointer's wake is a ring of eight marks and a live head**, aged with
 * time and with the distance traveled, as the element's notes explain.
 */
export class AuraField {
  /** The field's own time, in seconds of drift. */
  elapsed = 0

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
  readonly target = { presence: 0, x: 0, y: 0 }
  readonly eased = { presence: 0, x: 0, y: 0 }

  /**
   * The shortest gap between two painted frames, in seconds, for a field nobody
   * points at.
   *
   * **A drifting field does not need the display's rate and a pointer does.**
   * The field advances on the gate's own step, so motion is wall-clock: at half
   * the frames it moves the same distance in the same time, sampled more
   * coarsely. That step is clamped at `AURA_MAX_STEP`, the paint gate's `MAX_FRAME_STEP`, which is a floor of 20
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
  private static readonly CAPPED = 1 / 30

  /**
   * What the skipped frames were worth, in seconds, spent on the next one drawn.
   *
   * Dropping it instead would make the field move at a fraction of wall-clock
   * speed, which is the thing the cap is written not to do: a capped frame is
   * the same motion sampled more coarsely and not less motion. Held rather than
   * measured from a stamp, because the gate owns the clock.
   */
  private held = 0

  /** Advances the field by `delta` seconds, and answers whether a frame is due. */
  advance(delta: number, settings: AuraSettings): boolean {
    this.held += delta
    /* Skipped rather than rescheduled on a timer: `requestAnimationFrame` is
       what pauses in a background tab and what matches the display, and a
       `setTimeout` loop would give up both to save the same work. */
    if (!settings.interactive && this.held < AuraField.CAPPED) {
      return false
    }
    /* Clamped again on the way out, because a collected step is several of the
       gate's and the ceiling is on what a single frame advances. */
    const step = Math.min(this.held, AURA_MAX_STEP)
    this.held = 0
    /* Accumulated rather than measured from a start stamp. A stamp reset on
       every pause means a reader who switched tabs and came back finds the
       field snapped to its opening frame, which is the one thing a background
       must never do. */
    this.elapsed += step * Math.max(0, this.drifted(settings.drift, settings.speed, 0.4, 0.043))

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
    const follow = 1 - Math.exp(-step / (0.028 / (1 + drift * 2.4)))
    if (!settings.interactive) {
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
    const fade = 1 - Math.exp(-step / (rising ? 0.05 : 0.22))
    this.eased.presence += (this.target.presence - this.eased.presence) * fade
    this.age(step)
    this.advanceWake(settings.interactive)
    return true
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
  bearing(settings: AuraSettings): number {
    if (settings.terminus === undefined) {
      return settings.tilt
    }
    return tiltFor(settings.terminus, settings.width / Math.max(settings.height, 1))
  }

  /*
   * One axis, wandering around its set value.
   *
   * Two sines at an irrational ratio rather than one, so a single axis has no
   * period of its own either. Bounded by construction: the weights sum to one,
   * so the value never leaves `base` plus or minus `span`.
   */
  drifted(drift: number, base: number, span: number, seed: number): number {
    if (!drift) {
      return base
    }
    const t = this.elapsed
    const wave = Math.sin(t * seed) * 0.6 + Math.sin(t * seed * 1.618 + 2.1) * 0.4
    return base + span * drift * wave
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
  private advanceWake(interactive: boolean): void {
    if (!interactive) {
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

  /**
   * The pointer at `x` and `y` in the box, `0` to `1` across and down, which
   * the field leans toward while it is interactive.
   */
  point(x: number, y: number, settings: AuraSettings): void {
    const aspect = settings.width / Math.max(settings.height, 1)
    this.target.x = (x - 0.5) * 2 * aspect
    this.target.y = -(y - 0.5) * 2
    this.target.presence = settings.interactive ? 1 : 0
  }

  /** The pointer left the field. */
  leave(): void {
    this.target.presence = 0
  }

  /** One frame's uniforms, in `palette`'s colors, for a drawing `resolution` pixels across and down. */
  uniforms(settings: AuraSettings, palette: AuraPalette): Omit<AuraUniforms, 'uResolution'> {
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
    const { drift } = settings
    return {
      uBloom: this.drifted(drift, settings.bloom, 0.22, 0.029),
      uGain: this.drifted(drift, settings.gain, 0.3, 0.053),
      uGlow: palette.glow,
      uGround: palette.ground,
      uHaze: palette.haze,
      uInteraction: auraInteraction(settings.interaction),
      uPeak: palette.peak,
      uPointer: [this.eased.x, this.eased.y],
      uReach: this.eased.presence * Math.max(0, settings.reach),
      uScale: this.drifted(drift, settings.scale, 0.32, 0.061),
      uShape: auraShape(settings.pattern),
      uTilt: this.drifted(drift, this.bearing(settings), 14, 0.037),
      uTime: this.elapsed,
      uTrail: this.ordered,
      uVariance: settings.variance,
    }
  }
}
