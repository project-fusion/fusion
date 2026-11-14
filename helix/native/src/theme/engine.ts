import type { ThemeIntent } from '@fusion.dev/helix-theme'
import type * as Expo from 'expo'
import type { Tokens } from './drawn'

/**
 * The seeds of a theme's colors, as `@fusion.dev/helix-theme` takes them: a
 * brand color, and whatever else you have an opinion about, such as an
 * accent, the page's background, or the contrast target.
 */
export type ThemeSeeds = Pick<
  ThemeIntent,
  'accent' | 'background' | 'brand' | 'chroma' | 'contrastTarget' | 'neutral' | 'status' | 'tokens'
>

/** One mode as the native module returns it, the shape of the crate's `DerivedMode`. */
export interface DerivedMode {
  /** Each color the engine derived, by its token name after `--helix-`, in the order it emits them. */
  readonly colors: readonly { readonly hex: string; readonly name: string }[]
  /** Each pair that missed its contrast target, as a sentence. */
  readonly violations: readonly string[]
}

/** An intent's derivation in each mode, the shape of the crate's `DerivedModes`. */
export interface DerivedModes {
  readonly dark: DerivedMode
  readonly light: DerivedMode
}

/**
 * The native module `HelixTheme`, as `helix/native/ios/theme` and
 * `helix/native/android` define it. `deriveModes` takes the intent as JSON
 * and throws the engine's refusal, which names the field it is about.
 *
 * **A build without the engine has the module and not `deriveModes`.**
 */
export interface ThemeModule {
  readonly deriveModes?: (intent: string) => DerivedModes
}

let found: ThemeModule | null | undefined

/**
 * The native module `HelixTheme`, loaded once through `expo`, or `null` where
 * the app has none.
 *
 * **A `require` inside a `try`**, which Metro bundles as an optional
 * dependency, so an app without `expo` builds and draws the colors derived at
 * build time. Expo Go and Jest have `expo` and not the module, and
 * `requireOptionalNativeModule` answers `null` there without an error.
 */
export const themeModule = (): ThemeModule | null => {
  if (found === undefined) {
    try {
      const expo = require('expo') as typeof Expo
      found = expo.requireOptionalNativeModule<ThemeModule>('HelixTheme')
    } catch {
      found = null
    }
  }
  return found
}

/** The colors derived for each intent so far, by its JSON. */
const derived = new Map<string, Readonly<Record<'dark' | 'light', Tokens>>>()

/** Each color of `mode` by its name, as the theme's modes hold them. */
const byName = (mode: DerivedMode): Tokens =>
  Object.fromEntries(mode.colors.map(({ hex, name }) => [name, hex]))

/**
 * Each mode's colors for `seeds`, derived on the device by the engine the web
 * runs as WebAssembly, by token name after `--helix-`. `null` where the app
 * has no engine, as in Expo Go, in Jest, and on the web, which then draw the
 * colors derived at build time.
 *
 * **One derivation for each intent**, kept for as long as the app runs, so a
 * theme drawn again with the same seeds asks nothing of the engine.
 *
 * @throws the engine's refusal of `seeds`, such as a brand that is not a
 * color, naming the field it is about.
 */
export const deriveOnDevice = (
  seeds: ThemeSeeds,
): Readonly<Record<'dark' | 'light', Tokens>> | null => {
  const engine = themeModule()?.deriveModes
  if (engine === undefined) {
    return null
  }
  /* `JSON.stringify` writes `NaN` and `Infinity` as `null`, which the engine
     reads as a field left unset, so a `NaN` contrast target would derive at
     the default and look like a theme. */
  const intent = JSON.stringify(seeds, (key, value: unknown) => {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error(`${key} must be a finite number, received ${value}`)
    }
    return value
  })
  let modes = derived.get(intent)
  if (modes === undefined) {
    const { dark, light } = engine(intent)
    modes = { dark: byName(dark), light: byName(light) }
    derived.set(intent, modes)
  }
  return modes
}
