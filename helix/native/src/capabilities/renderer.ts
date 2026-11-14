import type { Renderer } from '@fusion.dev/helix-core/capabilities/renderer'
import type { RendererKind } from '@fusion.dev/helix-core/capabilities/types'
import { TurboModuleRegistry } from 'react-native'
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

/** Each kind's renderer, loaded the first time it is asked for. */
const LOADERS: Readonly<Record<RendererKind, () => unknown>> = {
  map: loadMapLibre,
  /* No terminal renderer yet: Terminal draws its still screen. */
  terminal: () => null,
}

/**
 * Hands a family's drawing to a renderer outside Helix, an optional peer,
 * where the app installs it and is built with its native modules: MapLibre
 * Native for a map. Expo Go carries none of them.
 */
export const nativeRenderer: Renderer = {
  available: (kind) => LOADERS[kind]() !== null,
}
