/**
 * Where the theme engine's WebAssembly module is served from.
 *
 * **One constant, because two pages load it and a bundler cannot find it for
 * them.** `initTheme` takes its source as a required argument: the generated
 * loader's own default resolves the file through `import.meta.url`, which
 * Turbopack reads as a module specifier and fails the build on. `bun run gen:wasm`
 * copies the module into `public/helix/`, the same shape `frame.js` already
 * uses, so the path is a fact about this site rather than something a bundler
 * decides.
 */
export const THEME_ENGINE = '/helix/theme.wasm'
