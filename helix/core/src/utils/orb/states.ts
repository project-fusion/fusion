/**
 * What the agent is doing.
 *
 * **Written out rather than derived from the array below**, which is the other
 * way round from where this started. The manifest records a property's type as
 * the text somebody wrote, so `(typeof ORB_STATES)[number]` reached it as a name
 * with no values in it and the reference page listed none: a reader was told the
 * attribute takes an `OrbState` and left to find out what one is. A union on one
 * line is what every reader of the source can resolve, a lint rule included,
 * and no type system is needed to do it.
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
