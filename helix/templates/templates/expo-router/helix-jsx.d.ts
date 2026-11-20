/**
 * Types for the Helix tags written directly in JSX, from the same manifest the
 * API pages read, so a wrong attribute is a compile error.
 *
 * **A side-effect import in a `.d.ts`.** The typings are the subpath export
 * `@fusion.dev/helix/jsx`, and entries in the `types` compiler array resolve as
 * ambient type packages, outside a package's exports map.
 */
import '@fusion.dev/helix/jsx'
