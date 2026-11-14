import { useSyncExternalStore } from 'react'
import { motionPaused, onMotionChange, pauseMotion } from '../render/motion'

/**
 * A toggle's state that the runtime holds where no prop holds it: how it is
 * read, heard, and written, and the state every part reads it under.
 */
interface Held {
  readonly read: () => boolean
  readonly set: (checked: boolean) => void
  /** The custom state the element shows it as, as the web's `:state()` does. */
  readonly state: string
  readonly subscribe: (changed: () => void) => () => void
}

/**
 * What the runtime holds a toggle's state in, by the name a form's `held`
 * gives it. **`page-motion` is whether the app's motion is paused**, which
 * every Motion Toggle in the app shares, shown as `paused`.
 */
const HELD: Readonly<Record<string, Held>> = {
  'page-motion': {
    read: motionPaused,
    set: pauseMotion,
    state: 'paused',
    subscribe: (changed) => onMotionChange(() => changed()),
  },
}

/** What a toggle a prop holds reads: nothing, and it hears nothing. */
const NONE = {
  read: (): undefined => undefined,
  subscribe: () => () => undefined,
}

/**
 * The state the runtime holds under `name`, drawn again as it changes, with
 * what writes it and the state it is shown as. `undefined` where `name` names
 * nothing the runtime holds, as for a toggle a prop holds.
 */
export const useHeld = (
  name: string | undefined,
):
  | { readonly checked: boolean; readonly set: (checked: boolean) => void; readonly state: string }
  | undefined => {
  const held = name === undefined ? undefined : HELD[name]
  const store = held ?? NONE
  const checked = useSyncExternalStore(store.subscribe, store.read, store.read)
  return held === undefined || checked === undefined
    ? undefined
    : { checked, set: held.set, state: held.state }
}
