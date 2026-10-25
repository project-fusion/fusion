import type { Motion } from '@fusion.dev/helix-core/capabilities/motion'
import type { Easing as Curve, Frame, Transition } from '@fusion.dev/helix-core/capabilities/types'
import { type RefCallback, useCallback, useState } from 'react'
import type { HostInstance } from 'react-native'
import {
  type AnimationCallback,
  cancelAnimation,
  Easing,
  type EasingFunction,
  type EasingFunctionFactory,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { reducedNow } from '../render/motion'

/** A value a motion moves, by the field of `Frame` it draws. */
type Field = keyof Frame

const FIELDS: readonly Field[] = ['height', 'opacity', 'width', 'x', 'y']

/**
 * The width, height, or opacity of a part no motion has set. The style leaves
 * the field out while it is unset, so the part keeps the size its layout
 * gives it and the opacity its own style gives it, as a mark that its style
 * hides until it is placed.
 */
const UNSET = -1

/**
 * The curve of each motion token, from `helix/styles/src/tokens.ts`, with
 * `standard` and `emphasized` resolved from the primitives they name. A
 * theme's own curves do not reach the device: React Native reads no custom
 * properties.
 */
export const CURVES: Readonly<
  Record<Exclude<Curve, 'spring'>, EasingFunction | EasingFunctionFactory>
> = {
  accelerate: Easing.bezier(0.3, 0, 1, 1),
  decelerate: Easing.bezier(0, 0, 0, 1),
  emphasized: Easing.bezier(0.3, 0, 0, 1.2),
  linear: Easing.linear,
  standard: Easing.bezier(0.2, 0, 0, 1),
}

/**
 * The damping ratio of a `spring`. The token's curve peaks at 1.043, and a
 * spring damped at 0.71 overshoots by 4.2%.
 */
const SPRING_DAMPING = 0.71

/** One part's values, and the glide it is in. */
interface Entry {
  /** The fields the current glide moves, which a place or the next glide ends. */
  moving: ReadonlySet<Field>
  /** The fields a motion has set. A width, height, or opacity it set stays in the style from then on. */
  readonly set: Set<Field>
  /**
   * Counts each place, glide, and stop, so an animation that arrives after
   * its glide ended calls nothing back.
   */
  turn: number
  readonly values: Readonly<Record<Field, SharedValue<number>>>
}

/** The parts drawn with `useMotion`, by host instance. */
const entries = new WeakMap<object, Entry>()

const NONE: ReadonlySet<Field> = new Set()

const NOTHING = (): void => undefined

const entryOf = (node: unknown): Entry | undefined =>
  typeof node === 'object' && node !== null ? entries.get(node) : undefined

/** The fields `to` names, in a fixed order. */
const named = (to: Frame): Field[] => FIELDS.filter((field) => to[field] !== undefined)

/** Ends the glide `entry` is in, without calling it back, and stops each field `keep` does not name. */
const end = (entry: Entry, keep: readonly Field[]): void => {
  entry.turn += 1
  for (const field of entry.moving) {
    if (!keep.includes(field)) {
      cancelAnimation(entry.values[field])
    }
  }
  entry.moving = NONE
}

const place = (entry: Entry, to: Frame): void => {
  const fields = named(to)
  end(entry, fields)
  for (const field of fields) {
    entry.values[field].value = to[field] as number
    entry.set.add(field)
  }
}

/**
 * Gives an unset width or height the size the part is drawn at, so a glide
 * starts from it, and an unset opacity 1. A node without
 * `getBoundingClientRect` starts its size at the target.
 */
const seed = (entry: Entry, node: object, field: Field, target: number): void => {
  if (entry.set.has(field) || field === 'x' || field === 'y') {
    return
  }
  if (field === 'opacity') {
    entry.values.opacity.value = 1
  } else {
    const rect = (
      node as Partial<Pick<HostInstance, 'getBoundingClientRect'>>
    ).getBoundingClientRect?.()
    entry.values[field].value = rect ? rect[field] : target
  }
  entry.set.add(field)
}

/**
 * The animation to `to`. Its own reduced-motion setting is `Never`: whether
 * motion is reduced is the environment capability's to say, so an app that
 * sets its own is followed.
 */
const animate = (to: number, transition: Transition, arrived: AnimationCallback): number => {
  if (transition.easing === 'spring') {
    /* Reanimated reads `duration` as the spring's perceived length, and the
       spring settles over 1.5 times it. */
    return withSpring(
      to,
      {
        dampingRatio: SPRING_DAMPING,
        duration: transition.duration,
        reduceMotion: ReduceMotion.Never,
      },
      arrived,
    )
  }
  return withTiming(
    to,
    {
      duration: transition.duration,
      easing: CURVES[transition.easing],
      reduceMotion: ReduceMotion.Never,
    },
    arrived,
  )
}

/**
 * Whether a glide arrives at once: reduced motion, which the app's paused
 * motion is too, a transition of no length, or nothing to move.
 */
const atOnce = (fields: readonly Field[], transition: Transition): boolean =>
  fields.length === 0 || !(transition.duration > 0) || reducedNow()

/**
 * Moves the parts drawn with `useMotion`, through the shared values bound into
 * their style. A glide runs on the UI thread with `withTiming`, or `withSpring`
 * for a `spring`, and calls `done` on the JavaScript thread once every field
 * arrives.
 *
 * **A node never drawn with `useMotion` does not move, and a glide of it calls
 * `done` at once**, so a machine waiting on the glide never hangs.
 *
 * **A glide stopped, or replaced by another or by a place, leaves the part
 * where it is drawn and never calls back.** Each field it was moving stops
 * where it stands, unless the glide or place that replaced it sets that
 * field, and a glide moves a field on from where it is drawn.
 */
export const nativeMotion: Motion<unknown> = {
  glide: (node, to, transition, done) => {
    const entry = entryOf(node)
    if (!entry) {
      done()
      return NOTHING
    }
    const fields = named(to)
    if (atOnce(fields, transition)) {
      place(entry, to)
      done()
      return NOTHING
    }
    end(entry, fields)
    const turn = entry.turn
    let left = fields.length
    const arrived = (): void => {
      left -= 1
      if (entry.turn === turn && left === 0) {
        entry.moving = NONE
        done()
      }
    }
    const finished: AnimationCallback = (complete) => {
      'worklet'
      if (complete) {
        scheduleOnRN(arrived)
      }
    }
    entry.moving = new Set(fields)
    for (const field of fields) {
      const target = to[field] as number
      seed(entry, node as object, field, target)
      entry.values[field].value = animate(target, transition, finished)
    }
    return () => {
      if (entry.turn === turn && entry.moving.size > 0) {
        end(entry, [])
      }
    }
  },
  place: (node, to) => {
    const entry = entryOf(node)
    if (entry) {
      place(entry, to)
    }
  },
}

/** The style the values draw: the part's offset, and its opacity and each size a motion set. */
const useMotionStyle = (values: Entry['values']) =>
  useAnimatedStyle(() => {
    const drawn: {
      height?: number
      opacity?: number
      transform: [{ translateX: number }, { translateY: number }]
      width?: number
    } = {
      transform: [{ translateX: values.x.value }, { translateY: values.y.value }],
    }
    if (values.opacity.value !== UNSET) {
      drawn.opacity = values.opacity.value
    }
    if (values.width.value !== UNSET) {
      drawn.width = values.width.value
    }
    if (values.height.value !== UNSET) {
      drawn.height = values.height.value
    }
    return drawn
  })

/** What `useMotion` gives a part to draw with. */
export interface Moving {
  /**
   * Registers the host instance under the part's values, so `nativeMotion`
   * finds it. Pass it as the `ref` of the `Animated.View` that takes `style`.
   */
  readonly ref: RefCallback<HostInstance>
  /**
   * The animated style the values draw. Spread it into the `Animated.View`'s
   * style after the part's own, since it sets `transform`, and `opacity` once
   * a motion sets it.
   */
  readonly style: ReturnType<typeof useMotionStyle>
}

/**
 * Makes a part's motion values and binds them into its style. A part that
 * `nativeMotion` moves calls it in render.
 *
 * **A part drawn with both `useMotion` and `useDrag` takes each style on its
 * own view**, one inside the other: each sets `transform`, and a later
 * `transform` in a style replaces an earlier one.
 */
export const useMotion = (): Moving => {
  const height = useSharedValue(UNSET)
  const opacity = useSharedValue(UNSET)
  const width = useSharedValue(UNSET)
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const [entry] = useState<Entry>(() => ({
    moving: NONE,
    set: new Set(),
    turn: 0,
    values: { height, opacity, width, x, y },
  }))
  const style = useMotionStyle(entry.values)
  const ref = useCallback(
    (node: HostInstance | null) => {
      if (!node) {
        return undefined
      }
      entries.set(node, entry)
      return () => {
        if (entries.get(node) === entry) {
          entries.delete(node)
        }
      }
    },
    [entry],
  )
  return { ref, style }
}
