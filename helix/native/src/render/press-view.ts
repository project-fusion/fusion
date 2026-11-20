/**
 * The view a press draws: React Native's `Pressable`, or Reanimated's where
 * its style moves, so a press's look moves as a box's does.
 */
import { Pressable } from 'react-native'
import Reanimated from 'react-native-reanimated'
import type { Style, Transition } from '../style/resolved'
import { stepsOf, withoutTransform } from '../style/transforms'
import { transitionStyle, VIEW_MOVES } from './animation'

/** Reanimated's `Pressable`, typed as React Native's, made at the first press that moves. */
let moving: typeof Pressable | undefined

const animated = (): typeof Pressable => {
  moving ??= Reanimated.createAnimatedComponent(Pressable) as unknown as typeof Pressable
  return moving
}

/**
 * The view a press draws, and its style with the transitions its rules name.
 *
 * **A press whose style moves is Reanimated's `Pressable`**, which runs CSS
 * transitions on the UI thread, as a pressed button's fill moves to its
 * pressed color on the web. A transform that moves holds every step, so its
 * two ends have the same steps to move between. Any other press is React
 * Native's.
 */
export const pressView = (
  drawn: Style,
  transitions: Readonly<Record<string, Transition>> | undefined,
): { readonly style: Readonly<Record<string, unknown>>; readonly View: typeof Pressable } => {
  const css = transitionStyle(transitions ?? {}, VIEW_MOVES)
  if (Object.keys(css).length === 0) {
    const steps = stepsOf(drawn)
    const rest = withoutTransform(drawn)
    return { style: steps.length === 0 ? rest : { ...rest, transform: steps }, View: Pressable }
  }
  const whole = (css.transitionProperty as readonly string[] | undefined)?.includes('transform')
  const steps = stepsOf(drawn, whole)
  return {
    style: {
      ...withoutTransform(drawn),
      ...(steps.length === 0 ? {} : { transform: steps }),
      ...css,
    },
    View: animated(),
  }
}
