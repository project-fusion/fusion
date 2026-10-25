/**
 * Whether keyboard focus shows its ring, as the web's `:focus-visible`
 * decides: after a key from a hardware keyboard, and not after a touch.
 */
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { useSyncExternalStore } from 'react'

/** Whether the last input was a key. A touch, or no input yet, is not. */
let keyboard = false

/** Moves each time what a ring reads may have changed, so a part reads it again. */
let version = 0

const listeners = new Set<() => void>()

const changed = (): void => {
  version += 1
  for (const listener of [...listeners]) {
    listener()
  }
}

/**
 * A key heard from a hardware keyboard, which the keys module calls once the
 * listeners have heard it, so a ring is drawn where the key left focus.
 */
export const heardKey = (): void => {
  keyboard = true
  changed()
}

/** A touch anywhere in the app, which `HelixRoot` and a press hear: no ring until the next key. */
export const heardTouch = (): void => {
  if (keyboard) {
    keyboard = false
    changed()
  }
}

/** Focus moved by a component, as the focus capability moves it, so a ring follows it. */
export const focusMoved = (): void => {
  if (keyboard) {
    changed()
  }
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const read = (): number => version

/**
 * Whether the view `node` gives shows a focus ring: it has keyboard focus,
 * as the focus capability reads it, and the last input was a key. **A phone
 * with no hardware keyboard never shows one**, as a touch on the web leaves
 * `:focus-visible` off.
 */
export const useFocusVisible = (node: () => unknown): boolean => {
  useSyncExternalStore(subscribe, read, read)
  const at = node()
  return keyboard && at !== null && at !== undefined && focus().focused() === at
}
