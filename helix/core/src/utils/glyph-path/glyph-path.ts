/**
 * The `d` of a glyph drawn as one path, for a template that writes the
 * `<path>` itself.
 *
 * **For a fixed glyph, which needs no directive.** `unsafeSVG(glyph.content)`
 * parses markup a template could have written, and the directive and its base
 * class come to about 1,000 bytes in a bundle that draws nothing else through
 * it. Measured October 8, 2026, bundled alone, brotli: Dialog and Tag were
 * each about 300 bytes larger for the cross alone, and Tabs about 350 for the
 * cross and its four carets.
 *
 * A glyph of more than one element keeps `unsafeSVG`, which is what Icon draws
 * every glyph with. `glyph-path.pure.spec.ts` holds each glyph drawn this way
 * to a single path, so a set that redraws one in two cannot lose half of it.
 */
export const glyphPath = (glyph: { readonly content: string }): string =>
  /\sd="([^"]*)"/.exec(glyph.content)?.[1] ?? ''
