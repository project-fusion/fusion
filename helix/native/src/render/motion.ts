import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import { useSyncExternalStore } from 'react'

/** Whether the app has paused the motion that starts by itself. */
let paused = false

/** Each listener to the app's choice, which hears it change. */
const listeners = new Set<(paused: boolean) => void>()

/**
 * Whether the app has paused the motion that starts by itself, as a Motion
 * Toggle does: **one choice for the whole app**, which every Motion Toggle
 * reads and writes, as a web page keeps one on its document element.
 */
export const motionPaused = (): boolean => paused

/**
 * Pauses the motion that starts by itself across the app, or with `false`
 * lets it run again. **While it is paused, every Helix component draws as it
 * does where the reader asks for reduced motion**, since an app cannot set
 * the reader's own setting: a keyframe stops or slows as its reduced-motion
 * rule says, and a transition takes no time.
 */
export const pauseMotion = (pause = true): void => {
  if (pause === paused) {
    return
  }
  paused = pause
  for (const listener of [...listeners]) {
    listener(paused)
  }
}

/** Calls `listener` with the app's choice each time it changes. Returns what stops listening. */
export const onMotionChange = (listener: (paused: boolean) => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Whether the app's motion is paused, drawn again as it changes. */
export const useMotionPaused = (): boolean =>
  useSyncExternalStore(onMotionChange, motionPaused, motionPaused)

/** Whether a component draws with reduced motion: the reader asks for it, or the app paused its motion. */
export const reducedNow = (): boolean => environment().read().reducedMotion || paused

/** Hears each change the environment capability reports, and each pause. */
const subscribe = (changed: () => void): (() => void) => {
  const stopEnvironment = environment().observe(() => changed())
  const stopPause = onMotionChange(() => changed())
  return () => {
    stopEnvironment()
    stopPause()
  }
}

/**
 * Whether a component draws with reduced motion: where the reader asks for
 * it, as the environment capability reads it, or where the app has paused
 * its motion. A style's reduced-motion rules hold to it, as the rule that
 * slows a spinner's turn does.
 */
export const useReducedMotion = (): boolean => useSyncExternalStore(subscribe, reducedNow)
