/**
 * The states an orb can be in, in the order a task tends to pass through them.
 *
 * Exported so the component can validate an attribute against the same list the
 * generator reads, rather than keeping a second copy that drifts.
 */
export const ORB_STATES = ['thinking', 'fetching', 'working', 'done'] as const

/** What the agent is doing. */
export type OrbState = (typeof ORB_STATES)[number]

/**
 * The numbers one state is made of.
 *
 * **A state is a set of numbers rather than a function**, and that is the whole
 * design. The first version had a generator per state and interpolated the
 * points they produced, which is a scramble: two shapes with unrelated
 * parameterisations hand each dot a destination chosen by its index rather than
 * by where it is, so the middle of every transition read as a fault. Routing
 * through a sphere hid it at the midpoint and left the quarter marks broken.
 *
 * With one generator and a set of numbers per state, a transition interpolates
 * the numbers and the generator returns a whole, valid shape at every instant.
 * There is no in-between left to get wrong.
 */
export interface OrbParams {
  /** How far the bands spread from the equator, `0` a line and `1` a full sphere. */
  belt: number
  /** How far the outer bands fade, which is what makes a sash read as a sash. */
  edge: number
  /** How far toward an even sphere, `0` the banded grid and `1` fully relaxed. */
  jitter: number
  /** How fast this state's own clock runs. */
  rate: number
  /** Which way the axis leans, in radians. */
  rot: number
  /** Where the sweeping highlight is, `0` absent and `1` full strength. */
  scan: number
  /** How hard the bands slide past each other. */
  shear: number
  /** How flattened the ball is along its axis, `1` round. */
  squash: number
  /** The three-lobed ripple's amplitude. */
  waveA: number
  /** The five-lobed counter-ripple's amplitude. */
  waveB: number
}

/**
 * Each state, as numbers.
 *
 * They are deliberately close together. Two states that differ in every number
 * take a long, busy route between them; these differ in the two or three that
 * carry the meaning, so a transition reads as one thing becoming another rather
 * than as a shuffle.
 */
export const ORB_PARAMS: Record<OrbState, OrbParams> = {
  /* Settled: an even ball, breathing, with nothing traveling through it. */
  done: {
    belt: 1,
    edge: 0,
    jitter: 1,
    rate: 1.1,
    rot: 0,
    scan: 0,
    shear: 0,
    squash: 1,
    waveA: 0,
    waveB: 0,
  },
  /* The sash opened out into a globe, with a highlight sweeping pole to pole:
     the shape of looking through something. */
  fetching: {
    belt: 1,
    edge: 0,
    jitter: 0,
    rate: 2.4,
    rot: 0,
    scan: 1,
    shear: 0,
    squash: 1,
    waveA: 0,
    waveB: 0,
  },
  /* A narrow sash with a wave running through it, tipped so the band crosses
     the face rather than sitting level. */
  thinking: {
    belt: 0.47,
    edge: 1,
    jitter: 0,
    rate: 2.1,
    rot: 1.52,
    scan: 0,
    shear: 0,
    squash: 1,
    waveA: 0.16,
    waveB: 0.07,
  },
  /* Flattened and tilted, bands shearing past each other. **The squash is what
     makes this state legible at 20px**: `fetching` and `working` are both full
     spheres, and at that size a difference in motion alone is not a difference
     a reader can see. A silhouette is. */
  working: {
    belt: 1,
    edge: 0,
    jitter: 0,
    rate: 2.4,
    rot: 0.5,
    scan: 0,
    shear: 1.3,
    squash: 0.72,
    waveA: 0,
    waveB: 0,
  },
}

const KEYS = Object.keys(ORB_PARAMS.thinking) as (keyof OrbParams)[]

/** Halfway between two states, key by key. */
export const blendParams = (a: OrbParams, b: OrbParams, k: number): OrbParams => {
  const out = {} as OrbParams
  for (const key of KEYS) {
    out[key] = a[key] + (b[key] - a[key]) * k
  }
  return out
}

/** The state's numbers, or `thinking`'s where the name is not one we draw. */
export const paramsFor = (state: string | undefined): OrbParams =>
  ORB_PARAMS[state as OrbState] ?? ORB_PARAMS.thinking

const TAU = Math.PI * 2

/** Smootherstep: zero slope and zero acceleration at both ends. */
export const smoother = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10)

/** A point of the Fibonacci sphere, which is the evenest cheap one. */
export const fibonacci = (i: number, n: number): [number, number, number] => {
  const k = Math.PI * (3 - Math.sqrt(5))
  const y = 1 - (2 * (i + 0.5)) / n
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  return [r * Math.cos(i * k), y, r * Math.sin(i * k)]
}

const evenCache = new Map<string, [number, number, number][]>()

/**
 * The even sphere `done` settles into, ordered so the band grid can address it.
 *
 * **The azimuth is measured from the same origin and in the same direction as
 * the generator's longitude**, and that is not a detail. With `atan2`'s own
 * range the two orderings sit half a turn apart: every dot is handed a
 * destination across the ball, and the blend carries the whole cloud through its
 * own axis. It showed as a near-empty frame midway through every transition
 * into `done`, and nowhere else, because no single state reads this ordering.
 */
export const evenSphere = (lanes: number, segs: number): [number, number, number][] => {
  const key = `${lanes}x${segs}`
  const hit = evenCache.get(key)
  if (hit) {
    return hit
  }
  const total = lanes * segs
  const points: [number, number, number][] = []
  for (let i = 0; i < total; i++) {
    points.push(fibonacci(i, total))
  }
  points.sort((a, b) => a[1] - b[1])
  const azimuth = (q: [number, number, number]): number => (Math.atan2(q[2], q[0]) + TAU) % TAU
  const out: [number, number, number][] = new Array(total)
  for (let b = 0; b < lanes; b++) {
    const band = points.slice(b * segs, (b + 1) * segs)
    band.sort((a, c) => azimuth(a) - azimuth(c))
    for (let s = 0; s < segs; s++) {
      out[b * segs + s] = band[s] as [number, number, number]
    }
  }
  evenCache.set(key, out)
  return out
}

/** How far the bands reach when `belt` is 1, in units of the sphere's radius. */
const SPAN = 1.86

/**
 * One dot, from its place in the grid and the state's numbers.
 *
 * `u` runs across the bands and `v` around them, both `0` to `1`, and `phase`
 * is the state's own accumulated clock.
 */
export const orbPoint = (
  u: number,
  v: number,
  phase: number,
  p: OrbParams,
  index: number,
  even: [number, number, number][],
): [number, number, number] => {
  const th = v * TAU + p.shear * phase * 0.55 * (u - 0.5) * 2
  const wave =
    p.waveA * Math.sin(th * 3 - phase * 1.7 + u * 3.1) + p.waveB * Math.sin(th * 5 + phase * 1.1)
  const y = Math.max(-0.995, Math.min(0.995, (u - 0.5) * SPAN * p.belt + wave))
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  let point: [number, number, number] = [r * Math.cos(th), y * p.squash, r * Math.sin(th)]
  if (p.rot) {
    const c = Math.cos(p.rot)
    const s = Math.sin(p.rot)
    point = [point[0], point[1] * c - point[2] * s, point[1] * s + point[2] * c]
  }
  if (p.jitter > 0.001) {
    const e = even[index] as [number, number, number]
    point = [
      point[0] + (e[0] - point[0]) * p.jitter,
      point[1] + (e[1] - point[1]) * p.jitter,
      point[2] + (e[2] - point[2]) * p.jitter,
    ]
    const len = Math.hypot(point[0], point[1], point[2]) || 1
    point = [point[0] / len, point[1] / len, point[2] / len]
  }
  return point
}

/** The mesh and ink of an orb at one size. */
export interface OrbMesh {
  aMin: number
  ghostAlpha: number
  ghostAlphaSpan: number
  ghostCount: number
  ghostRadius: number
  ghostShade: number
  lanes: number
  radiusBase: number
  radiusDepth: number
  radiusScale: number
  segs: number
  shadeFar: number
  shadeSpan: number
}

/**
 * The mesh for a given diameter.
 *
 * **The dot budget falls as `size^1.37`** and the two axes of the grid each take
 * its square root, which is the relationship the reference libraries land on
 * across their own three tunings. Dots are drawn sub-pixel and their radius
 * scales as `size^0.6`; small orbs get relatively fatter dots, or the mesh
 * disappears into the pixel grid.
 *
 * **The tonal range is compressed as the orb shrinks.** Depth drawn as a
 * 0.6-wide gray ramp is legible at 64px and invisible at 20, where the far side
 * of the sphere is three pixels across: below 64 the ramp narrows and the alpha
 * floor lifts, trading depth for a mark that is actually on the screen.
 */
export const meshFor = (size: number): OrbMesh => {
  const budget = (size / 64) ** 1.366
  const axis = Math.sqrt(budget)
  const small = Math.min(1, Math.max(0, (64 - size) / 44))
  return {
    aMin: 0.4 + 0.2 * small,
    ghostAlpha: 0.14,
    ghostAlphaSpan: 0.3,
    ghostCount: Math.max(30, Math.round(80 * budget)),
    ghostRadius: 0.8,
    ghostShade: 0.66,
    lanes: Math.max(4, Math.round(14 * axis)),
    radiusBase: 0.8,
    radiusDepth: 1.35,
    radiusScale: (size / 300) ** 0.6 * 0.85 * (64 / size) ** 0.26,
    segs: Math.max(10, Math.round(78 * axis)),
    shadeFar: 0.6 - 0.16 * small,
    shadeSpan: 0.56 - 0.14 * small,
  }
}

/**
 * How the cloud is turned before it is flattened onto the canvas.
 *
 * Fixed: the orb never spins. Everything that moves is moving inside the shape,
 * which is what makes it read as thought rather than as a thing being rotated.
 */
const TILT = 0.55
const ROLL = 0.3

/** Projects a point on the unit sphere to canvas pixels, with its depth. */
export const project = (
  size: number,
  x: number,
  y: number,
  z: number,
): [number, number, number] => {
  const c = size / 2
  const radius = (size / 2) * 0.78
  const st = Math.sin(TILT)
  const ct = Math.cos(TILT)
  const sr = Math.sin(ROLL)
  const cr = Math.cos(ROLL)
  const dx = x * cr + z * sr
  const dz = -x * sr + z * cr
  return [c + dx * radius, c - (y * ct - dz * st) * radius, y * st + dz * ct]
}
