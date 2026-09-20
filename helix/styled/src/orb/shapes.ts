/**
 * What the agent is doing.
 *
 * **Written out rather than derived from the array below**, which is the other
 * way round from where this started. The manifest records a property's type as
 * the text somebody wrote, so `(typeof ORB_STATES)[number]` reached it as a name
 * with no values in it and the reference page listed none: a reader was told the
 * attribute takes an `OrbState` and left to find out what one is. A union on one
 * line is what every reader of this repository's sources can resolve, the `axes`
 * rule included, and no type system is needed to do it.
 */
export type OrbState =
  | 'waiting'
  | 'connecting'
  | 'thinking'
  | 'fetching'
  | 'listening'
  | 'working'
  | 'done'

/**
 * Each state and where it sits in the order a task tends to pass through them.
 *
 * **A record rather than an array, because a record is exhaustive in both
 * directions.** `Record<OrbState, number>` refuses to compile while a state has
 * no entry, and `satisfies` refuses an entry that is not a state, so the union
 * above and the list below cannot drift apart in either direction. An array
 * typed `readonly OrbState[]` catches only the second: a state added to the
 * union and forgotten here would leave the component refusing an attribute its
 * own type accepts, silently, which is the half that matters.
 */
const ORDER = {
  connecting: 1,
  done: 6,
  fetching: 3,
  listening: 4,
  thinking: 2,
  waiting: 0,
  working: 5,
} as const satisfies Record<OrbState, number>

/**
 * The same states as a list, in that order.
 *
 * Exported so the component can validate an attribute against one list rather
 * than a second copy that drifts. String keys come back in insertion order,
 * which the object above is written in.
 */
export const ORB_STATES = Object.keys(ORDER) as readonly OrbState[]

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
  /** How far the whole cloud swells and settles, `0` still. */
  breathe: number
  /** Strength of a highlight traveling around the ball, `0` absent. */
  orbit: number
  /** A ripple over the surface, applied after the sphere is closed. */
  pulse: number
  /** How fast this state's own clock runs. */
  rate: number
  /** How far the ball has opened into a ring, `0` a sphere and `1` a torus. */
  ring: number
  /** Which way the axis leans, in radians. */
  rot: number
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
  /* The same sash as `thinking` on the same lean, thinner and calmer: the route
     between them is a narrowing rather than a change of shape. */
  connecting: {
    belt: 0.32,
    breathe: 0.07,
    edge: 1,
    jitter: 0,
    orbit: 0,
    pulse: 0,
    rate: 1.05,
    ring: 0,
    rot: 1.52,
    shear: 0,
    squash: 1,
    waveA: 0.035,
    waveB: 0,
  },
  /* Settled: an even ball, breathing, with nothing traveling through it. */
  done: {
    belt: 1,
    breathe: 0.035,
    edge: 0,
    jitter: 1,
    orbit: 0,
    pulse: 0,
    rate: 1.1,
    ring: 0,
    rot: 0,
    shear: 0,
    squash: 1,
    waveA: 0,
    waveB: 0,
  },
  /* A globe with a light going round it, which is the shape of looking through
     something. */
  fetching: {
    belt: 1,
    breathe: 0,
    edge: 0,
    jitter: 0.62,
    orbit: 1,
    pulse: 0,
    rate: 2,
    ring: 0,
    rot: 0,
    shear: 0,
    squash: 1,
    waveA: 0,
    waveB: 0,
  },
  /* Receptive: a closed sphere with a ripple crossing it, slower than
     `connecting` and symmetric where that one is a band. */
  listening: {
    belt: 1,
    breathe: 0.03,
    edge: 0,
    jitter: 1,
    orbit: 0,
    pulse: 0.055,
    rate: 1.15,
    ring: 0,
    rot: 0,
    shear: 0,
    squash: 1,
    waveA: 0,
    waveB: 0,
  },
  /* A narrow sash with a wave running through it, tipped so the band crosses
     the face rather than sitting level. */
  thinking: {
    belt: 0.47,
    breathe: 0,
    edge: 1,
    jitter: 0,
    orbit: 0,
    pulse: 0,
    rate: 2.1,
    ring: 0,
    rot: 1.52,
    shear: 0,
    squash: 1,
    waveA: 0.16,
    waveB: 0.07,
  },
  /* The same settled ball as `done` at a slower tempo, which is the difference
     between not having started and having finished. */
  waiting: {
    belt: 1,
    breathe: 0.075,
    edge: 0,
    jitter: 1,
    orbit: 0,
    pulse: 0,
    rate: 0.55,
    ring: 0,
    rot: 0,
    shear: 0,
    squash: 1,
    waveA: 0,
    waveB: 0,
  },
  /* **A ring, which is a different object rather than an adjusted ball.** This
     was a squashed sphere with its bands shearing, and a sphere adjusted is
     still a sphere: at 20px it read as the same mark as every other state. A
     torus has a hole. The bands run around the tube, so the shear twists it
     like rope instead of sliding flat layers past each other, and the light is
     what makes that turning visible at all. */
  working: {
    belt: 1,
    breathe: 0.035,
    edge: 0,
    jitter: 0,
    orbit: 0.7,
    pulse: 0,
    rate: 1.9,
    ring: 1,
    rot: 0.3,
    shear: 0.62,
    squash: 1,
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

/** Each key's own range, so a distance can be measured across all of them. */
const SPANS: Record<keyof OrbParams, number> = {
  belt: 1,
  breathe: 0.08,
  edge: 1,
  jitter: 1,
  orbit: 1,
  pulse: 0.09,
  rate: 2.5,
  ring: 1,
  rot: 1.6,
  shear: 1.3,
  squash: 1,
  waveA: 0.2,
  waveB: 0.1,
}

/** What the shape is. */
const STRUCTURE = [
  'belt',
  'edge',
  'jitter',
  'ring',
  'rot',
  'shear',
  'squash',
  'waveA',
  'waveB',
] as const

/** What it is doing. */
const CHARACTER = ['breathe', 'orbit', 'pulse', 'rate'] as const

/**
 * How far apart two states are, `0` to `1`, each key against its own range.
 *
 * Two states differing in one small number should not be given the time
 * `thinking` to `done` needs. One length for every pair reads as rushed at one
 * end of the set and slack at the other.
 */
export const stateDistance = (a: OrbParams, b: OrbParams): number => {
  let sum = 0
  for (const key of KEYS) {
    sum += Math.abs(b[key] - a[key]) / SPANS[key]
  }
  return Math.min(1, sum / 3.2)
}

/**
 * Two states blended on two clocks: the silhouette, and then what it is doing.
 *
 * **The other order shows a light orbiting a sash.** Every number moving on one
 * curve makes a change of state read as a cross-fade between two pictures; the
 * shape arriving first makes it read as one thing becoming another.
 */
export const blendStaged = (
  a: OrbParams,
  b: OrbParams,
  shape: number,
  character: number,
): OrbParams => {
  const out = {} as OrbParams
  for (const key of STRUCTURE) {
    out[key] = a[key] + (b[key] - a[key]) * shape
  }
  for (const key of CHARACTER) {
    out[key] = a[key] + (b[key] - a[key]) * character
  }
  return out
}

/** How far the character trails the silhouette, as a share of the run. */
export const TRAIL = 0.2

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

/** The ring's hole and tube, which together come to the sphere's own radius. */
const RING_HOLE = 0.64
const RING_TUBE = 0.36

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
  /* **A ring, opened out before the lean is applied**, so it tips rather than
     lying flat. Tube plus hole comes to the radius the sphere had, so the
     silhouette changes and the footprint does not. */
  if (p.ring > 0.001) {
    const ph = u * TAU
    const rr = RING_HOLE + RING_TUBE * Math.cos(ph)
    const torus: [number, number, number] = [
      rr * Math.cos(th),
      RING_TUBE * Math.sin(ph),
      rr * Math.sin(th),
    ]
    point = [
      point[0] + (torus[0] - point[0]) * p.ring,
      point[1] + (torus[1] - point[1]) * p.ring,
      point[2] + (torus[2] - point[2]) * p.ring,
    ]
  }
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
    /* **Held off the unit sphere in proportion to the ring.** Normalizing a
       half-formed torus rounds it back into the ball it is leaving, so the
       morph collapses in the middle and reappears at the end. */
    const len = Math.hypot(point[0], point[1], point[2]) || 1
    const k = 1 + (1 / len - 1) * (1 - p.ring)
    point = [point[0] * k, point[1] * k, point[2] * k]
  }
  /* **The ripple rides on the closed sphere.** `waveA` and `waveB` are applied
     to the latitude before `jitter` blends them away, so a fully relaxed state
     had nothing left that could move; this survives it. */
  if (p.pulse > 0.001) {
    const ripple = 1 + p.pulse * Math.sin(phase * 1.5 - point[1] * 3.2)
    point = [point[0] * ripple, point[1] * ripple, point[2] * ripple]
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
