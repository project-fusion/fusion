/**
 * `@fusion.dev/locus`: what a `locus.config.ts` imports.
 *
 * The config is plain data and two optional functions, so this returns what it
 * is given. It exists for the types: `defineConfig` checks a config against
 * `types/index.d.ts` where it is written.
 */

/** The config, unchanged, typed. */
export const defineConfig = (config) => config
