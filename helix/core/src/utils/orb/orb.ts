/**
 * Orb's drawing, as numbers: the shape of each state, the clock a change of
 * state runs on, and the dots of one frame, sorted back to front with the
 * shade each is mixed by. The web element paints them to a 2D canvas, and a
 * phone paints the same dots through its GPU drawing, so both draw one orb.
 */
import {
  blendStaged,
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
  stateDistance,
  TRAIL,
} from './shapes.js'

export * from './shapes.js'

/** The shortest change of state, in ms, and what the longest adds to it. */
const MORPH_NEAR = 380
const MORPH_REACH = 580

/** How far above the equator the traveling light sits. */
const LIGHT_Y = 0.36

/** The frame the still orb is drawn at: far enough in to have a shape. */
export const STILL_PHASE = 1.4

/** A dot, ready to draw: where it stands in pixels, its depth, size, opacity and shade. */
export interface OrbDot {
  readonly alpha: number
  readonly radius: number
  /** How far its color is mixed from the ink toward the ground, `0` to `1`. */
  readonly shade: number
  readonly x: number
  readonly y: number
  readonly z: number
}

/** A color as bytes and an alpha, as `readColorAlpha` reads one. */
export type OrbColor = readonly [number, number, number, number]

/** The state drawn: `state`, or `thinking` for one the orb does not draw. */
export const orbShown = (state: unknown): OrbState =>
  (ORB_STATES as readonly unknown[]).includes(state) ? (state as OrbState) : 'thinking'

/**
 * The clock an orb runs on: where the cloud is, where it is heading, and how
 * far through the change it is.
 *
 * **`from` holds numbers rather than the name of a state**, which is what
 * makes an interruption free: changing state mid-transition snapshots the
 * blend that is on the screen at that instant and departs from it. Holding a
 * name forces a choice between the shape being left and the shape being
 * approached, and either one is a jump the reader sees.
 *
 * **The phase is accumulated rather than derived.** `elapsed * rate` looks
 * equivalent and is not: `rate` is one of the numbers a transition
 * interpolates, and multiplying a running clock by a changing rate throws the
 * phase forward by the elapsed time times the change. A minute in, a rate
 * moving from 2.1 to 2.4 skips the wave thirty seconds ahead, and the orb
 * lurches on every state change. Integrating the rate has no such term.
 */
export class OrbClock {
  /** The state heading to. */
  state: OrbState
  /** The state's clock. */
  phase = STILL_PHASE
  private from: OrbParams
  private morphAt = 0
  /** How far the current change travels, `0` to `1`. */
  private reach = 0

  constructor(state: unknown = 'thinking') {
    this.state = orbShown(state)
    this.from = paramsFor(this.state)
  }

  /** Begins a change to `state` from whatever is drawn at `now`, in ms. */
  turn(state: unknown, now: number): void {
    this.from = this.params(now)
    this.state = orbShown(state)
    this.reach = stateDistance(this.from, paramsFor(this.state))
    this.morphAt = now
  }

  /** Stands still at the frame a still orb is drawn at, with no change running. */
  still(): void {
    this.phase = STILL_PHASE
    this.morphAt = 0
  }

  /**
   * How long the current change is given.
   *
   * **Near states cross quickly and far ones are not hurried.** One length for
   * every pair read as rushed going from `waiting` to `done`, which differ in
   * two small numbers, and slack going from `thinking` to `working`, which is a
   * sash becoming a ring.
   */
  private get span(): number {
    return MORPH_NEAR + MORPH_REACH * this.reach
  }

  /** How far through the change at `now`, `1` when there is none. */
  progress(now: number): number {
    return this.morphAt === 0 ? 1 : Math.min(1, (now - this.morphAt) / this.span)
  }

  /** The numbers drawn at `now`: the state's own once the change is over. */
  params(now: number): OrbParams {
    const to = paramsFor(this.state)
    const k = this.progress(now)
    if (k >= 1) {
      return to
    }
    return blendStaged(this.from, to, smoother(k), smoother(Math.max(0, k - TRAIL) / (1 - TRAIL)))
  }

  /**
   * One frame at `now`, `dt` seconds after the one before, at `speed` times
   * each state's own tempo: the dots of an orb `size` pixels across. Under
   * `still`, the state's own shape at the still frame.
   */
  frame(size: number, now: number, dt: number, speed: number, still: boolean): OrbDot[] {
    const params = still ? paramsFor(this.state) : this.params(now)
    this.phase += dt * params.rate * (Number.isFinite(speed) && speed >= 0 ? speed : 1)
    /* One breath through the change, sized by how far it goes and peaked a
       little past the middle, so it reads as an exhale into the new state
       rather than a symmetric bump. */
    const k = this.progress(now)
    const swell =
      still || k >= 1 ? 1 : 1 + (0.035 + 0.1 * this.reach) * Math.sin(Math.PI * k ** 0.82)
    return orbDots(size, this.phase, params, swell)
  }
}

/**
 * The dots of an orb `size` pixels across at `phase`, swollen by `swell`,
 * sorted back to front.
 *
 * Painter's algorithm: a near dot has to cover a far one for the cloud to
 * read as a solid rather than as a smear.
 */
export const orbDots = (size: number, phase: number, params: OrbParams, swell = 1): OrbDot[] => {
  const mesh = meshFor(size)
  const even = evenSphere(mesh.lanes, mesh.segs)
  /* **A light traveling around the ball**, rather than a band crossing it.
     A ring of evenly spaced dots is unchanged by rotation, so a state that
     turns has nothing a reader can see turning until something fixed in space
     passes over it. */
  const spin = phase * 0.9
  const lx = Math.cos(spin) * 0.9
  const lz = Math.sin(spin) * 0.9
  const llen = Math.hypot(lx, LIGHT_Y, lz) || 1
  const shell = swell * (1 + params.breathe * Math.sin(phase * 0.62))
  const dots: OrbDot[] = []

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
      const [x, y, z] = orbPoint(u, s / mesh.segs, phase, params, index, even)
      const [px, py, pz] = project(size, x * shell, y * shell, z * shell)
      const depth = (pz + 1) / 2
      const facing = (x * lx + y * LIGHT_Y + z * lz) / llen
      const boost =
        params.orbit * (facing > 0 ? facing ** 11 : 0) +
        params.jitter * (0.1 + 0.1 * Math.sin(phase * 0.6))
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
  return dots
}

/** The smallest radius a dot is drawn at, so a far dot stays a mark. */
export const ORB_MIN_RADIUS = 0.3

/**
 * The color a dot is filled with, as bytes and an alpha, or `undefined` for
 * one too faint to draw.
 *
 * **Mixed with each end weighted by its alpha**, so a see-through ink stays
 * its own color and a clear ground fades a dot out rather than to black.
 */
export const orbDotColor = (dot: OrbDot, ink: OrbColor, ground: OrbColor): OrbColor | undefined => {
  if (dot.alpha < 0.02) {
    return undefined
  }
  const t = Math.min(1, Math.max(0, dot.shade))
  const alpha = ink[3] + (ground[3] - ink[3]) * t
  if (alpha <= 0) {
    return undefined
  }
  const channel = (at: 0 | 1 | 2): number =>
    Math.round((ink[at] * ink[3] + (ground[at] * ground[3] - ink[at] * ink[3]) * t) / alpha)
  return [channel(0), channel(1), channel(2), dot.alpha * alpha]
}
