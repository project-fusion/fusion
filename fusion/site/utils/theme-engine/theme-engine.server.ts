/**
 * The theme engine, on the server.
 *
 * **This exists so the theme builder's first paint carries a real palette.** The
 * derivation is WebAssembly and instantiates asynchronously, so without a server
 * path arranged for it the derived values miss the first paint. Measured without
 * this file: the slider ramps, which are drawn in OKLCH off the *derived*
 * primary so the track cannot promise a color the engine will not produce,
 * appeared 287ms after navigation. 26ms of that was the module transfer and the
 * rest was hydration.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { initTheme, type ThemeEngine } from '@fusion.dev/helix-theme'

/**
 * Loaded once per server process.
 *
 * `initTheme` caches its own promise, so this is belt and braces rather than the
 * mechanism: what it adds is holding the *file read* to once as well, which the
 * engine cannot do because it never sees the path.
 */
let loading: Promise<ThemeEngine> | undefined

export function serverTheme(): Promise<ThemeEngine> {
  loading ??= readFile(join(process.cwd(), 'public/helix/theme.wasm')).then((bytes) =>
    initTheme(bytes),
  )
  return loading
}
