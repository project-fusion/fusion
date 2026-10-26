/**
 * The JSX runtime a `headless.tsx` source names through `jsxImportSource`,
 * as `#render/jsx-runtime`.
 *
 * **Nothing here draws anything.** `helix family` reads a render as syntax
 * and never runs it. This module exists so the editor types the JSX against
 * the nodes in `render.ts`, and so a test that imports a source can load it.
 * No lowercase tag is an element here, so the editor refuses `<div>` as the
 * compiler does.
 */

import type { Child, Drawn } from './render.js'

/** A node, as the runtime would build one. A render is never called, so it is never built. */
export const jsx = (_type: unknown, _attributes: unknown): Drawn => ({}) as Drawn

/** A node with several children. */
export const jsxs = jsx

/** `<>`: several nodes where one is written. */
export const Fragment = (_: { readonly children?: Child }): Drawn => ({}) as Drawn

/** What the editor checks a render's JSX against. */
export declare namespace JSX {
  /** What every JSX expression in a render is. */
  type Element = Drawn
  /** No lowercase tag names a node. */
  type IntrinsicElements = Record<never, never>
  /** The attribute a node's children are passed as. */
  interface ElementChildrenAttribute {
    // biome-ignore lint/complexity/noBannedTypes: TypeScript reads the key alone.
    children: {}
  }
}
