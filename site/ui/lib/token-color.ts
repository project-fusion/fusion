/**
 * Reads a design token as the sRGB triple a shader can take.
 *
 * **Two hops, and both are load-bearing.** A custom property's own value is the
 * unevaluated function text, so `getComputedStyle` on a probe is the only way
 * to see what it resolves to. And what it resolves to is not `rgb()`: the Helix
 * palette derives from an `oklch()` seed, and Chrome answers `lab(100 0 0)` for
 * white. Parsing that with a regular expression for numbers reads the three
 * channels as 100, 0 and 0, which divided by 255 is a dark red.
 *
 * That is not hypothetical. It shipped in the light pillar, where
 * `--helix-color-foreground` arrived as a dark red and painted a warm streak
 * down the shaft, and it survived a screenshot review because a warm cast on a
 * saturated gradient is also what a screenshot's chroma subsampling produces.
 *
 * So the conversion is the browser's: fill a pixel and read it back. That holds
 * for `lab()`, `oklch()`, `color-mix()` and whatever a token is written in
 * next, which is the property worth having in a package whose whole point is
 * that the palette is derived rather than listed.
 *
 * Client only. There is no computed style on a server, and every caller is a
 * canvas that does not exist there either.
 */
export interface TokenReader {
  /** Releases the probe and the swatch. Call from the effect's cleanup. */
  dispose: () => void

  /**
   * The token's current value as three channels in `0..1`, or the fallback if
   * it resolves to nothing or the canvas is unavailable.
   */
  read: (token: string, fallback: readonly [number, number, number]) => [number, number, number]
}

/**
 * Builds a reader. One per component, disposed with it.
 */
export const createTokenReader = (): TokenReader => {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  document.body.appendChild(probe)

  const swatch = document.createElement('canvas')
  swatch.width = 1
  swatch.height = 1
  const ctx = swatch.getContext('2d', { willReadFrequently: true })

  return {
    dispose: () => probe.remove(),
    read: (token, fallback) => {
      if (!ctx) {
        return [...fallback] as [number, number, number]
      }
      probe.style.color = `var(${token})`
      /* Reset first. An unparseable value leaves `fillStyle` where it was,
         which would silently hand back the previous token's color. */
      ctx.fillStyle = '#000000'
      ctx.fillStyle = getComputedStyle(probe).color
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      return [(r ?? 0) / 255, (g ?? 0) / 255, (b ?? 0) / 255]
    },
  }
}
