import {
  conditionsMoved,
  type Environment,
  NO_INSETS,
} from '@fusion.dev/helix-core/capabilities/environment'
import type { Conditions, Insets, Stop } from '@fusion.dev/helix-core/capabilities/types'
import {
  AccessibilityInfo,
  Appearance,
  Dimensions,
  I18nManager,
  PixelRatio,
  Platform,
} from 'react-native'

/** What the system has said that React Native asks for asynchronously, or tells through a provider. */
const heard = {
  insets: NO_INSETS as Insets,
  /* `false` until the first answer. */
  reducedMotion: false,
  screenReader: false,
}

/** The check of each observer, run when something heard changes. */
const checks = new Set<() => void>()

/** What the system says now. */
const read = (): Conditions => {
  const { height, width } = Dimensions.get('window')
  return {
    colorScheme: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
    direction: I18nManager.isRTL ? 'rtl' : 'ltr',
    fontScale: PixelRatio.getFontScale(),
    insets: { ...heard.insets },
    /* The contract names two native platforms, so an out-of-tree one, such as
       macOS, reads as `ios`. */
    platform: Platform.OS === 'android' ? 'android' : 'ios',
    reducedMotion: heard.reducedMotion,
    screenReader: heard.screenReader,
    window: { height, width },
  }
}

/** Keeps what was heard of `condition`, and runs each observer's check. */
const hear = <Name extends keyof typeof heard>(condition: Name, value: (typeof heard)[Name]) => {
  heard[condition] = value
  for (const check of [...checks]) {
    check()
  }
}

/**
 * Keeps the safe area `insets`, as `HelixRoot` hears it from
 * `react-native-safe-area-context`, and tells each observer.
 */
export const hearInsets = (insets: Insets): void => {
  hear('insets', { ...insets })
}

/**
 * Asks the system once what `question` answers, and keeps the answer
 * current from `event` until stopped.
 *
 * **A change heard before the answer arrives wins.** The question is
 * asynchronous, so an answer can arrive after a change the reader made, and
 * it would put back what the change replaced.
 */
const ask = (
  condition: 'reducedMotion' | 'screenReader',
  event: 'reduceMotionChanged' | 'screenReaderChanged',
  question: () => Promise<boolean>,
): Stop => {
  let changedFirst = false
  const subscription = AccessibilityInfo.addEventListener(event, (on: boolean) => {
    changedFirst = true
    hear(condition, on)
  })
  question().then(
    (on) => {
      if (!changedFirst) {
        hear(condition, on)
      }
    },
    () => undefined,
  )
  return () => {
    subscription.remove()
  }
}

/**
 * Asks the system once whether it reduces motion, and keeps the answer
 * current from `reduceMotionChanged` until stopped. `installNativeCapabilities`
 * calls it.
 */
export const askReducedMotion = (): Stop =>
  ask('reducedMotion', 'reduceMotionChanged', () => AccessibilityInfo.isReduceMotionEnabled())

/**
 * Asks the system once whether a screen reader is on, VoiceOver or
 * TalkBack, and keeps the answer current from `screenReaderChanged` until
 * stopped. `installNativeCapabilities` calls it.
 */
export const askScreenReader = (): Stop =>
  ask('screenReader', 'screenReaderChanged', () => AccessibilityInfo.isScreenReaderEnabled())

/**
 * Reads the system through React Native: reduced motion and the screen
 * reader from `AccessibilityInfo`, the color scheme from `Appearance`, the
 * direction from `I18nManager`, the text size from
 * `PixelRatio.getFontScale()`, the window from `Dimensions`, and the
 * platform from `Platform.OS`.
 *
 * **`read` is synchronous and React Native's questions are not**, so reduced
 * motion and the screen reader are what `askReducedMotion` and
 * `askScreenReader` last heard. **The safe area is what `HelixRoot` last
 * heard** from `react-native-safe-area-context`, and none where the app does
 * not install it.
 *
 * `observe` hears `Appearance`'s change, `Dimensions`' change, which carries
 * a new window size and a new text size on iOS and Android, and each change
 * heard of the rest. It calls `changed` only where what it reads has moved.
 * The direction has no event: it changes only when the app reloads.
 */
export const nativeEnvironment: Environment = {
  observe: (changed) => {
    let last = read()
    const check = (): void => {
      const now = read()
      if (conditionsMoved(now, last)) {
        last = now
        changed({ ...now })
      }
    }
    checks.add(check)
    const appearance = Appearance.addChangeListener(check)
    const dimensions = Dimensions.addEventListener('change', check)
    return () => {
      checks.delete(check)
      appearance.remove()
      dimensions.remove()
    }
  },
  read,
}
