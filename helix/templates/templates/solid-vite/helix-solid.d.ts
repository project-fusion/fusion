/**
 * Types for the Helix custom elements written directly in Solid's JSX.
 *
 * Generated from the same manifest the API pages read, so a wrong attribute or
 * a wrong event detail is a compile error. The Solid flavor of the typings adds
 * `prop:`, `attr:`, and `on:` to every tag, beside the plain props, and types
 * `style` as Solid types it on a `<div>`.
 *
 * **A side-effect import in a `.d.ts`.** The typings augment
 * `solid-js/jsx-runtime`, which is the JSX `jsxImportSource: "solid-js"` reads.
 * An entry in the `types` compiler array resolves as an ambient type package,
 * outside a package's exports map, so naming the subpath there resolves to
 * nothing and every Helix tag comes out untyped.
 */
import '@fusion.dev/helix/jsx'
