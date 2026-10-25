/**
 * A part's keyframes and transitions as Reanimated's CSS animation and
 * transition style, which a view Reanimated made runs on the UI thread.
 *
 * **Reanimated reads the same CSS a family writes**, so a frame selector such
 * as `0%, 100%`, a translate in percentages of the part's own size, any
 * number of runs, and a timing function each mean what they mean on the web.
 * The motion tokens' curves, the spring's `linear()` among them, are the
 * same curves there.
 *
 * **Reduced motion is the style's to say.** A family's reduced-motion rules
 * stop or slow an animation, as on the web, and every transition takes no
 * time while the reader asks for reduced motion, which `style()` resolves.
 */

import {
  type CSSAnimationKeyframes,
  type CSSAnimationTimingFunction as CSSTimingFunction,
  css,
  cubicBezier,
  linear,
  steps,
} from 'react-native-reanimated'
import type { Motion, Style, Transition } from '../style/resolved'
import { FLAT, stepsOf, withoutTransform } from '../style/transforms'

/** The timing functions Reanimated names, which pass as they are written. */
const NAMED = new Set([
  'ease',
  'ease-in',
  'ease-in-out',
  'ease-out',
  'linear',
  'step-end',
  'step-start',
])

/** A `linear()` stop, `0.5` or `0.5 20%`, as Reanimated takes one. */
const stopOf = (written: string): number | [number, `${number}%`] => {
  const [value = '0', at] = written.trim().split(/\s+/)
  return at === undefined ? Number(value) : [Number(value), at as `${number}%`]
}

/**
 * A CSS timing function as Reanimated takes one: a keyword, `cubic-bezier()`,
 * `linear()` with its stops, or `steps()`. `ease` where it reads none.
 */
export const easingOf = (written: string | undefined): CSSTimingFunction => {
  const text = (written ?? 'ease').trim()
  if (NAMED.has(text)) {
    return text as CSSTimingFunction
  }
  const call = /^([a-z-]+)\((.*)\)$/.exec(text)
  const args = (call?.[2] ?? '').split(',').map((arg) => arg.trim())
  switch (call?.[1]) {
    case 'cubic-bezier': {
      const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = args.map(Number)
      return cubicBezier(x1, y1, x2, y2)
    }
    case 'linear':
      return linear(...args.map(stopOf))
    case 'steps': {
      const [count = '1', modifier] = args
      return modifier === undefined
        ? steps(Number(count))
        : steps(Number(count), modifier as Parameters<typeof steps>[1])
    }
    default:
      return 'ease'
  }
}

/** What a property is where the part's own style sets none, which a missing end frame takes. */
const OWN: Readonly<Record<string, number | string>> = {
  fillOpacity: 1,
  opacity: 1,
  strokeOpacity: 1,
}

/** A frame's style with its transform as the array a view takes. */
const frameOf = (frame: Style, still: Style, moves: boolean): Readonly<Record<string, unknown>> => {
  if (!moves) {
    return withoutTransform(frame)
  }
  /* **A frame moves the part from where its own style puts it**, as CSS
     composes `translate` and `scale` with an animated `transform`. Every
     frame writes every step, so each two frames have the same steps to
     move between. */
  return { ...withoutTransform(frame), transform: stepsOf({ ...still, ...frame }, true) }
}

/** The keyframes made for each run a machine started, by the run and the frames. */
const RUNS = new Map<string, ReturnType<typeof css.keyframes>>()

/** How many runs' keyframes are kept before the oldest are let go. */
const KEPT = 64

/**
 * The keyframes of a run a machine started: one rule for each run, which
 * Reanimated runs from its start as it meets a new one, where keyframes
 * written out run on as long as they read the same.
 */
const keyframesOf = (
  frames: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  run: number | undefined,
): CSSAnimationKeyframes | ReturnType<typeof css.keyframes> => {
  if (run === undefined) {
    return frames as CSSAnimationKeyframes
  }
  const key = `${run} ${JSON.stringify(frames)}`
  let made = RUNS.get(key)
  if (made === undefined) {
    made = css.keyframes(frames as CSSAnimationKeyframes)
    RUNS.set(key, made)
    for (const old of RUNS.keys()) {
      if (RUNS.size <= KEPT) {
        break
      }
      RUNS.delete(old)
    }
  }
  return made
}

/**
 * A part's keyframes as Reanimated's CSS animation style, with each frame
 * drawn over `still`, the part's own style. Nothing without an animation.
 * A motion its machine started again runs from its start.
 */
export const animationStyle = (
  motion: Motion | undefined,
  still: Style,
): Readonly<Record<string, unknown>> => {
  if (motion === undefined || motion.duration <= 0) {
    return {}
  }
  const frames = Object.values(motion.keyframes)
  const moves = frames.some((frame) =>
    [...FLAT, 'transform'].some((name) => frame[name] !== undefined),
  )
  const keyframes: Record<string, Readonly<Record<string, unknown>>> = {}
  for (const [at, frame] of Object.entries(motion.keyframes)) {
    keyframes[at] = frameOf(frame, still, moves)
  }
  /* **A run starts and ends at the part's own style where no frame says
     otherwise**, as CSS fills a missing `0%` or `100%` from the element. */
  const offsets = new Set(
    Object.keys(motion.keyframes).flatMap((at) =>
      at.split(',').map((one) => ({ from: '0%', to: '100%' })[one.trim()] ?? one.trim()),
    ),
  )
  const animated = new Set(frames.flatMap((frame) => Object.keys(frame)))
  const own: Record<string, number | string> = {}
  for (const name of animated) {
    const value = still[name] ?? OWN[name]
    if (value !== undefined) {
      own[name] = value
    }
  }
  for (const end of ['0%', '100%']) {
    if (!offsets.has(end)) {
      keyframes[end] = frameOf(own, still, moves)
    }
  }
  return {
    animationDelay: motion.delay,
    animationDirection: motion.direction,
    animationDuration: motion.duration,
    animationFillMode: motion.fill,
    animationIterationCount: Number.isFinite(motion.iterations) ? motion.iterations : 'infinite',
    animationName: keyframesOf(keyframes, motion.run),
    animationPlayState: motion.paused ? 'paused' : 'running',
    animationTimingFunction: easingOf(motion.easing),
  }
}

/** The properties a view's transform is drawn from, which move as its one `transform`. */
const TRANSFORMS = new Set<string>([...FLAT, 'transform'])

/**
 * The transitions of the properties in `drawn` as Reanimated's CSS
 * transition style. **A transform moves as one**, with the timing of the
 * first of its parts that names one, since a view takes one transform.
 * Nothing where no property in `drawn` moves.
 */
export const transitionStyle = (
  transitions: Readonly<Record<string, Transition>>,
  drawn: ReadonlySet<string>,
): Readonly<Record<string, unknown>> => {
  const moved = new Map<string, Transition>()
  for (const [name, move] of Object.entries(transitions)) {
    const property = TRANSFORMS.has(name) ? 'transform' : name
    if (drawn.has(property) && !moved.has(property)) {
      moved.set(property, move)
    }
  }
  if (moved.size === 0) {
    return {}
  }
  const moves = [...moved.values()]
  return {
    transitionDelay: moves.map((move) => move.delay ?? 0),
    transitionDuration: moves.map((move) => move.duration),
    transitionProperty: [...moved.keys()],
    transitionTimingFunction: moves.map((move) => easingOf(move.easing)),
  }
}

/** The view properties a box's transitions move. */
export const VIEW_MOVES: ReadonlySet<string> = new Set([
  'backgroundColor',
  'borderColor',
  'boxShadow',
  'height',
  'opacity',
  'transform',
  'width',
])
