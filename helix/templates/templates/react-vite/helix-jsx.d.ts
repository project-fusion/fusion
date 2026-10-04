/**
 * Types for the Helix custom elements written directly in JSX.
 *
 * Emitted by `@wc-toolkit/jsx-types` from the same manifest the API pages read,
 * so a wrong attribute or a wrong event detail is a compile error.
 *
 * **A side-effect import in a `.d.ts`.** The typings are the subpath export
 * `@fusion.dev/helix/jsx`, and entries in the `types` compiler array resolve as
 * ambient type packages, outside a package's exports map, so naming the subpath
 * there resolves to nothing and every Helix tag comes out untyped.
 */
import '@fusion.dev/helix/jsx'
