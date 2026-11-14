import type { Clipboard } from '@fusion.dev/helix-core/capabilities/clipboard'
import type * as ExpoClipboard from 'expo-clipboard'

/** The package, loaded at the first write: `null` where the app does not install `expo-clipboard`. */
let loaded: typeof ExpoClipboard | null | undefined

/**
 * Loads `expo-clipboard` once.
 *
 * **A `require` inside a `try`**, which Metro bundles as an optional
 * dependency (`allowOptionalDependencies` is on by default), so an app
 * without the package builds and each write gives `false`.
 */
const load = (): typeof ExpoClipboard | null => {
  if (loaded === undefined) {
    try {
      loaded = require('expo-clipboard') as typeof ExpoClipboard
    } catch {
      loaded = null
    }
  }
  return loaded
}

/**
 * Puts text on the system clipboard through `expo-clipboard`, as the web
 * writes through the browser's clipboard.
 *
 * **The package is an optional peer.** Where it is missing, or its native
 * module is, as in an app built without it, a write gives `false`, as a
 * browser that refuses the write does, and a copy says it failed.
 */
export const nativeClipboard: Clipboard = {
  write: async (text) => {
    const expo = load()
    if (expo === null) {
      return false
    }
    try {
      return await expo.setStringAsync(text)
    } catch {
      return false
    }
  },
}
