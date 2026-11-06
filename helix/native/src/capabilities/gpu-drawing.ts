import type { GpuDrawing } from '@fusion.dev/helix-core/capabilities/gpu-drawing'
import { TurboModuleRegistry } from 'react-native'
import type { SkiaModule } from '../render/skia-types'

/** The package, loaded the first time a family draws: `null` where the app does not install it. */
let loaded: SkiaModule | null | undefined

/**
 * Loads `@shopify/react-native-skia` once, or gives `null` where the app does
 * not install it or was built without its native module.
 *
 * **The native module is asked for first, through `TurboModuleRegistry.get`**,
 * which answers `null` without an error where the app was built without it.
 * The package asks for its module with `getEnforcing` as it loads and throws
 * there, and React Native reports an error a module throws as it loads as
 * fatal even inside a `try`, so the package is required only once its module
 * stands. **The `require` sits inside a `try`**, which Metro bundles as an
 * optional dependency, so an app without the package builds and draws each
 * family's still fallback. Skia is not an Expo module, so `expo`'s
 * `requireOptionalNativeModule`, which the media capability asks, does not
 * find it.
 */
export const loadSkia = (): SkiaModule | null => {
  if (loaded === undefined) {
    try {
      loaded =
        TurboModuleRegistry.get('RNSkiaModule') === null
          ? null
          : (require('@shopify/react-native-skia') as SkiaModule)
    } catch {
      loaded = null
    }
  }
  return loaded
}

/** Forgets what `loadSkia` found, for a spec that installs or removes a fake. */
export const forgetSkia = (): void => {
  loaded = undefined
}

/**
 * Draws on the GPU through react-native-skia, an optional peer, where the app
 * installs it and is built with its native module, as Expo Go is.
 */
export const nativeGpuDrawing: GpuDrawing = {
  available: () => loadSkia() !== null,
}
