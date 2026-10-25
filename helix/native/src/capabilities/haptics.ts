import type { Haptics } from '@fusion.dev/helix-core/capabilities/haptics'
import type { Haptic } from '@fusion.dev/helix-core/capabilities/types'
import type * as ExpoHaptics from 'expo-haptics'

/** The call that plays each kind of touch. */
type Plays = Readonly<Record<Haptic, () => Promise<void>>>

const playsWith = (haptics: typeof ExpoHaptics): Plays => ({
  /* The warning pattern, so a drag that is called off and puts the row back
     feels unlike a drop's single impact. */
  cancel: () => haptics.notificationAsync(haptics.NotificationFeedbackType.Warning),
  /* A light impact as the row settles: lighter than the lift, so putting down
     reads as the end of the motion the lift began. */
  drop: () => haptics.impactAsync(haptics.ImpactFeedbackStyle.Light),
  /* A medium impact, a clear tap as the row comes away from its place. */
  lift: () => haptics.impactAsync(haptics.ImpactFeedbackStyle.Medium),
  /* The success pattern, the one notification pattern that marks no problem:
     `notify` says something arrived, and warning and error would say something
     went wrong. */
  notify: () => haptics.notificationAsync(haptics.NotificationFeedbackType.Success),
  /* The selection tick, which marks a value changing as something moves
     across it, as a picker's rows do. A dragged row passes the others the same
     way. */
  pass: () => haptics.selectionAsync(),
  /* The selection tick, made for a choice changing. */
  select: () => haptics.selectionAsync(),
})

/** The calls, loaded at the first touch: `null` where the app does not install `expo-haptics`. */
let plays: Plays | null | undefined

/**
 * Loads `expo-haptics` once.
 *
 * **A `require` inside a `try`**, which Metro bundles as an optional
 * dependency (`allowOptionalDependencies` is on by default), so an app
 * without the package builds and its touches play nothing.
 */
const load = (): Plays | null => {
  if (plays === undefined) {
    try {
      plays = playsWith(require('expo-haptics') as typeof ExpoHaptics)
    } catch {
      plays = null
    }
  }
  return plays
}

/**
 * Plays each touch through `expo-haptics`: an impact for a lift and a drop, the
 * selection tick for a pass and a selection, and a notification pattern for a
 * cancel and a notice.
 *
 * **The package is an optional peer.** Where it is missing, `play` does
 * nothing. Its calls reject where its native module is missing, as in an app
 * built without it, and the rejection is caught, since a touch is never worth
 * an error.
 */
export const nativeHaptics: Haptics = {
  play: (kind) => {
    load()
      ?.[kind]()
      .catch(() => undefined)
  },
}
