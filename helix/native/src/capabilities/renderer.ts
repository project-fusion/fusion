import type { Renderer } from '@fusion.dev/helix-core/capabilities/renderer'
import type { RendererKind } from '@fusion.dev/helix-core/capabilities/types'
import { TurboModuleRegistry } from 'react-native'
import type { XtermModule } from '../machines/terminal-engine'
import type { MapLibreModule } from '../render/maplibre-types'

/** The package, loaded the first time a map draws: `null` where the app does not install it. */
let loaded: MapLibreModule | null | undefined

/**
 * Loads `@maplibre/maplibre-react-native` once, or gives `null` where the app
 * does not install it or was built without its native modules, as Expo Go
 * is.
 *
 * **One of its native modules is asked for first, through
 * `TurboModuleRegistry.get`**, which answers `null` without an error where
 * the app was built without it. The package asks for its modules with
 * `getEnforcing` as it loads and throws there, and React Native reports an
 * error a module throws as it loads as fatal even inside a `try`, so the
 * package is required only once its module stands. **The `require` sits
 * inside a `try`**, which Metro bundles as an optional dependency, so an app
 * without the package builds and draws the frame's still picture. MapLibre
 * Native is not an Expo module, so `expo`'s `requireOptionalNativeModule`
 * does not find it.
 */
export const loadMapLibre = (): MapLibreModule | null => {
  if (loaded === undefined) {
    try {
      loaded =
        TurboModuleRegistry.get('MLRNLogModule') === null
          ? null
          : (require('@maplibre/maplibre-react-native') as MapLibreModule)
    } catch {
      loaded = null
    }
  }
  return loaded
}

/** Forgets what `loadMapLibre` found, for a spec that installs or removes a fake. */
export const forgetMapLibre = (): void => {
  loaded = undefined
}

/** The emulator, loaded the first time a terminal draws: `null` where the app does not install it. */
let emulator: XtermModule | null | undefined

/**
 * Loads `@xterm/headless` once, or gives `null` where the app does not install
 * it. **It is plain JavaScript**, xterm's parser and buffer with no page, so
 * no native module is asked for first; the `require` sits inside a `try`,
 * which Metro bundles as an optional dependency, so an app without the
 * package builds and draws what was written as read-only lines.
 *
 * **It is loaded as it is in Node**, where it tells a browser from Node by
 * `process.title` and reads `navigator.userAgent` in a browser. React
 * Native's `process` has no title and its `navigator` no user agent, so the
 * package threw as it loaded. `process.title` stands for that one reading,
 * and is taken away after.
 */
export const loadXterm = (): XtermModule | null => {
  if (emulator === undefined) {
    const held = (globalThis as unknown as { process?: Record<string, unknown> }).process
    const titled = held === undefined || 'title' in held
    if (!titled) {
      ;(held as Record<string, unknown>).title = 'react-native'
    }
    try {
      const loaded = require('@xterm/headless') as Partial<XtermModule> | undefined
      emulator = typeof loaded?.Terminal === 'function' ? (loaded as XtermModule) : null
    } catch {
      emulator = null
    } finally {
      if (!titled) {
        delete (held as Record<string, unknown>).title
      }
    }
  }
  return emulator
}

/** Forgets what `loadXterm` found, for a spec that installs or removes a fake. */
export const forgetXterm = (): void => {
  emulator = undefined
}

/** Each kind's renderer, loaded the first time it is asked for. */
const LOADERS: Readonly<Record<RendererKind, () => unknown>> = {
  map: loadMapLibre,
  terminal: loadXterm,
}

/**
 * Hands a family's drawing to a renderer outside Helix, an optional peer,
 * where the app installs it and is built with its native modules: MapLibre
 * Native for a map, which Expo Go does not carry, and `@xterm/headless` for a
 * terminal, which is plain JavaScript and runs wherever the app installs it.
 */
export const nativeRenderer: Renderer = {
  available: (kind) => LOADERS[kind]() !== null,
}
