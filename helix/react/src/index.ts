/**
 * React wrappers around `@helix-io/web`.
 *
 * These are GENERATED from the custom elements manifest, not hand-written. The
 * Lit package never ships React types or a React peer dependency; that
 * separation is what this package exists to preserve, and it is what lets a
 * future Vue or Svelte target be a generator run rather than a rewrite.
 *
 * Generation is not wired yet. Until it is, this package exports only the
 * shared types the wrappers will use, so consumers can depend on it already.
 */

/** Props every generated wrapper accepts in addition to its element's own. */
export interface HelixWrapperProps {
  children?: unknown
  className?: string
  id?: string
}

export type { OpenChangeDetail } from '@helix-io/core'
