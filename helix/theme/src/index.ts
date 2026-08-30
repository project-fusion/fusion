/**
 * The theme engine, reached from JavaScript.
 *
 * **One implementation, two distributions.** The derivation is Rust: it is a
 * search, and `fitToGamut` is a twenty-step bisection while
 * `lightnessForContrast` searches too, so iteration count, bisection order and
 * float arithmetic are implementation choices. Two implementations of that
 * disagree by construction rather than by accident, which is why this package
 * stopped being an engine and became a way to reach one.
 *
 * **It has to be awaited, and there is no way around that.** WebAssembly
 * instantiates asynchronously, so a module-level `deriveTheme` would either
 * block or throw for anybody who called it before the module landed. Handing the
 * engine back from `initTheme` makes the fact unavoidable rather than a runtime
 * error somebody meets in production: you cannot hold a `ThemeEngine` without
 * having waited for one.
 *
 * ```ts
 * const engine = await initTheme('/helix/theme.wasm')
 * const theme = engine.derive({ brand: '#3b82f6' }, [':root'])
 * document.head.append(Object.assign(document.createElement('style'), {
 *   textContent: theme.css[':root'],
 * }))
 * ```
 */
import initWasm, { derive, hexToOklch as readHex } from '../wasm/fusion_helix_theme.js'
import type { DerivedTheme, Oklch, ThemeIntent } from './types.js'

export type {
  Color,
  DerivedTheme,
  DerivedToken,
  Oklch,
  Pairing,
  PairingRequest,
  Relation,
  Seed,
  StatusSeed,
  ThemeIntent,
} from './types.js'

/** A loaded engine. */
export interface ThemeEngine {
  /**
   * Derives a theme, and renders it under each selector asked for.
   *
   * @throws when the engine refuses the intent, which it does for anything that
   * would produce a palette reporting itself clean without having been measured:
   * an unreadable brand, accent or pinned status, a non-finite number, or one
   * outside the range it is meaningful in.
   */
  derive(intent: ThemeIntent, selectors?: readonly string[]): DerivedTheme
  /**
   * Reads a hex color into its OKLCH components.
   *
   * @throws when the string is not a hex color. Returning a `NaN` triple
   * instead is worse: every comparison against it is false, so a color that
   * could not be read travels onward looking like one.
   */
  hexToOklch(hex: string): Oklch
}

/**
 * Where the module is fetched from.
 *
 * **Required, because every default was wrong for somebody.** The obvious one,
 * `new URL('fusion_helix_theme_bg.wasm', import.meta.url)`, is what the generated
 * loader does and it works for neither caller here: Turbopack reads it as a
 * module specifier and fails the build with "Can't resolve
 * 'fusion_helix_theme_bg.wasm'", and Node's `fetch` refuses a `file:` URL outright.
 * Reading the file here instead would put a `node:fs` import into a package
 * whose purpose is to run in a browser.
 *
 * So the one thing a WebAssembly consumer genuinely has to decide, how the
 * module gets delivered, is asked rather than guessed. A browser passes the URL
 * it serves it from; Node passes the bytes.
 */
export type Source = BufferSource | Response | URL | string

let loading: Promise<ThemeEngine> | undefined

/**
 * Loads the engine, once.
 *
 * **The promise is cached rather than the result**, so two callers racing at
 * startup get one instantiation and both wait on it. Caching the resolved value
 * instead would let the second call start a second download before the first
 * finished.
 */
export function initTheme(source: Source): Promise<ThemeEngine> {
  loading ??= initWasm({ module_or_path: source }).then(() => ({
    derive: (intent: ThemeIntent, selectors: readonly string[] = []): DerivedTheme =>
      JSON.parse(derive(JSON.stringify(intent), JSON.stringify(selectors))) as DerivedTheme,
    hexToOklch: (hex: string): Oklch => JSON.parse(readHex(hex)) as Oklch,
  }))
  return loading
}
