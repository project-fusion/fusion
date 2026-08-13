/**
 * Helix icon set.
 *
 * Phosphor, carried over from the previous repo so the two stay recognisably
 * the same product. Drawn on a 256 box at stroke-width 16, which is Phosphor's
 * own geometry: rescaling it to a 24 box would change the optical weight of
 * every glyph and stop matching anything upstream.
 *
 * The set is generated from `raw/*.svg` by `bun run icons`, so adding one is
 * dropping in a file rather than hand-transcribing a path.
 */
export * from './generated.js'
export type { HelixIcon } from './types.js'
