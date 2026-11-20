/**
 * A part's animation and its transitions, read from its declarations.
 *
 * **Durations are milliseconds.** The native theme writes a duration token
 * as a number of milliseconds, and a family writes `0.8s` or `800ms`; both
 * read the same here.
 */

import type { Family, Keyframes, Value } from './form.js'
import type { Motion, Resolution, Style, Transition } from './resolved.js'

/** The properties an animation is declared through, which a part's style does not take. */
export const ANIMATED: ReadonlySet<string> = new Set([
  'animation',
  'animation-delay',
  'animation-direction',
  'animation-duration',
  'animation-fill-mode',
  'animation-iteration-count',
  'animation-name',
  'animation-play-state',
  'animation-timing-function',
])

/** `0.8s`, `800ms`, or a number of milliseconds, as milliseconds. Nothing where it is no time. */
export const time = (value: Resolution): number | undefined => {
  if (typeof value === 'number') {
    return value
  }
  const match = typeof value === 'string' ? /^(-?[\d.]+)(m?s)$/.exec(value.trim()) : null
  if (match === null) {
    return undefined
  }
  return match[2] === 's' ? Number(match[1]) * 1000 : Number(match[1])
}

/** A time as milliseconds, and 0 where it is none. */
export const milliseconds = (value: Resolution): number => time(value) ?? 0

/** Whether a word names a timing function. */
const easing = (word: string): boolean =>
  /^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/.test(word) ||
  /^(cubic-bezier|linear|steps)\(/.test(word)

const DIRECTIONS = new Set(['alternate', 'alternate-reverse', 'normal', 'reverse'])
const FILLS = new Set(['backwards', 'both', 'forwards', 'none'])

/** An `animation` shorthand's parts, as its longhands name them. */
interface Shorthand {
  delay?: number
  direction?: string
  duration?: number
  easing?: string
  fill?: string
  iterations?: number
  name?: string
  paused?: boolean
}

/** Writes a time or a bare number as the duration, and as `then` once there is one. */
const timed = (out: Shorthand, at: number, then: 'delay' | 'iterations'): void => {
  if (out.duration === undefined) {
    out.duration = at
  } else {
    out[then] = at
  }
}

/** Each keyword of the shorthand, by the first test it passes, and what it sets. */
const KEYWORDS: readonly (readonly [
  test: (word: string) => boolean,
  set: (out: Shorthand, word: string) => void,
])[] = [
  [
    (word) => word === 'infinite',
    (out) => Object.assign(out, { iterations: Number.POSITIVE_INFINITY }),
  ],
  [easing, (out, word) => Object.assign(out, { easing: word })],
  [(word) => DIRECTIONS.has(word), (out, word) => Object.assign(out, { direction: word })],
  [(word) => FILLS.has(word), (out, word) => Object.assign(out, { fill: word })],
  [
    (word) => word === 'paused' || word === 'running',
    (out, word) => Object.assign(out, { paused: word === 'paused' }),
  ],
  [
    (word) => /^\d*\.?\d+$/.test(word),
    (out, word) => Object.assign(out, { iterations: Number(word) }),
  ],
]

/** Reads one word of the shorthand: a keyframes name, a time, or a keyword. */
const read = (out: Shorthand, word: string, names: ReadonlySet<string>): void => {
  const at = time(word)
  if (names.has(word)) {
    out.name = word
  } else if (at !== undefined) {
    timed(out, at, 'delay')
  } else {
    KEYWORDS.find(([test]) => test(word))?.[1](out, word)
  }
}

/**
 * The parts of one animation in an `animation` shorthand.
 *
 * **A bare number is the duration until one is read, and the run count
 * after it**, since a family writes the duration first and the theme writes
 * a duration token as a number of milliseconds. A time with a unit is the
 * duration and then the delay, as CSS reads it.
 */
const shorthand = (value: Resolution, names: ReadonlySet<string>): Shorthand => {
  const first = Array.isArray(value) && Array.isArray(value[0]) ? value[0] : value
  const words = Array.isArray(first) ? first : [first]
  const out: Shorthand = {}
  for (const word of words) {
    if (typeof word === 'number') {
      timed(out, word, 'iterations')
    } else if (typeof word === 'string') {
      read(out, word, names)
    }
  }
  return out
}

/** A run count as `animation-iteration-count` writes it. */
const runs = (value: Resolution): number | undefined =>
  value === 'infinite'
    ? Number.POSITIVE_INFINITY
    : typeof value === 'number' || typeof value === 'string'
      ? Number(value)
      : undefined

/** A word a longhand or the shorthand gives, or `otherwise`. */
const word = (value: Resolution, otherwise: string): string =>
  typeof value === 'string' ? value : otherwise

/** An animation's settings: each longhand, or the shorthand's part where it sets none. */
const settings = (animation: ReadonlyMap<string, Resolution>, short: Shorthand) => {
  const long = (property: string) => animation.get(`animation-${property}`)
  const iterations = runs(long('iteration-count')) ?? short.iterations ?? 1
  return {
    delay: time(long('delay')) ?? short.delay ?? 0,
    direction: word(long('direction') ?? short.direction, 'normal'),
    duration: time(long('duration')) ?? short.duration ?? 0,
    easing: word(long('timing-function') ?? short.easing, 'ease'),
    fill: word(long('fill-mode') ?? short.fill, 'none'),
    iterations: Number.isNaN(iterations) ? 1 : iterations,
    paused: word(long('play-state'), short.paused ? 'paused' : 'running') === 'paused',
  }
}

/**
 * A part's animation: the keyframes its `animation` names, each frame as the
 * style a view takes, with how long a run takes, how many runs, and the rest
 * of the shorthand. **Each longhand overrides the shorthand**, the way the
 * reduced-motion rule slows a spinner with `animation-duration`. Nothing
 * where the part has no animation, or `animation: none`.
 *
 * `draw` writes a frame's declarations as a style, as the part's own are.
 */
export const motionOf = (
  family: Family,
  animation: ReadonlyMap<string, Resolution>,
  resolve: (value: Value) => Resolution,
  draw: (declarations: ReadonlyMap<string, Resolution>) => Style,
): Motion | undefined => {
  const named = new Set(
    family.rules.flatMap((item) => (item.kind === 'keyframes' ? [item.name] : [])),
  )
  const short = shorthand(animation.get('animation'), named)
  const name = animation.get('animation-name') ?? short.name
  const keyframes = family.rules.find(
    (item): item is Keyframes => item.kind === 'keyframes' && item.name === name,
  )
  if (keyframes === undefined) {
    return undefined
  }
  const frames = keyframes.frames.map(
    ([at, declarations]) =>
      [
        at,
        Object.fromEntries(declarations.map(([property, value]) => [property, resolve(value)])),
      ] as const,
  )
  return {
    ...settings(animation, short),
    frames,
    keyframes: Object.fromEntries(
      frames.map(([at, declared]) => [at, draw(new Map(Object.entries(declared)))]),
    ),
    name: keyframes.name,
  }
}

/**
 * The React Native properties each transitioned CSS property moves. A
 * transform's parts each move by their own name, which a view draws as one
 * transform.
 */
const MOVES: Readonly<Record<string, readonly string[]>> = {
  'background-color': ['backgroundColor'],
  'block-size': ['height'],
  'border-color': ['borderColor'],
  'box-shadow': ['boxShadow'],
  /* A clip moves the insets of the view that clips the part. */
  'clip-path': ['clipPath'],
  color: ['color'],
  fill: ['fill'],
  /* A row that fits its content moves its measured height. */
  'grid-template-rows': ['fit'],
  'inline-size': ['width'],
  opacity: ['opacity'],
  rotate: ['rotate'],
  scale: ['scaleX', 'scaleY'],
  stroke: ['stroke'],
  'stroke-dasharray': ['strokeDasharray'],
  'stroke-dashoffset': ['strokeDashoffset'],
  transform: ['transform'],
  translate: ['translateX', 'translateY'],
  /* A part that hides stays seen until its `visibility` transition ends. */
  visibility: ['visibility'],
}

/** One property's move: its duration, then its timing function and its delay in either order. */
const moveOf = (duration: Resolution, rest: readonly Resolution[]): Transition => {
  const easing = rest.find((each) => typeof each === 'string' && time(each) === undefined)
  const delay = rest.map(time).find((each) => each !== undefined)
  return {
    ...(delay === undefined || delay === 0 ? {} : { delay }),
    duration: milliseconds(duration),
    easing: typeof easing === 'string' ? easing : 'ease',
  }
}

/**
 * A `transition`, resolved, as the move of each property: its duration, its
 * timing function, and its delay where it has one. One property's
 * transition or a list of them.
 */
export const moves = (value: Resolution): Record<string, Transition> => {
  const list = Array.isArray(value) && value.some(Array.isArray) ? value : [value]
  const out: Record<string, Transition> = {}
  for (const entry of list) {
    const [property, duration, ...rest] = Array.isArray(entry) ? entry : [entry]
    for (const native of typeof property === 'string' ? (MOVES[property] ?? []) : []) {
      out[native] = moveOf(duration, rest)
    }
  }
  return out
}
