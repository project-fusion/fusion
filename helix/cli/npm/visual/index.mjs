/**
 * `@fusion.dev/helix-cli/visual`: what a `visual.config.ts` imports.
 *
 * The config is plain data and two optional functions, so this returns what it
 * is given. It exists for the types: `defineConfig` checks a config against
 * `index.d.ts` beside it where it is written.
 */

/** The config, unchanged, typed. */
export const defineConfig = (config) => config
