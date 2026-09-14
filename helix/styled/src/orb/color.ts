/**
 * Reading a computed color the engine has resolved but not converted.
 */

/**
 * One pixel of scratch, and what it has already been asked.
 *
 * Built on first use rather than at module scope, because this file is imported
 * on a server where there is no document.
 */
let swatch: CanvasRenderingContext2D | null | undefined
const known = new Map<string, [number, number, number]>()

/**
 * A computed color as three sRGB bytes, whatever space it was written in.
 *
 * **Painting it is the only way to read it.** A color-typed property is
 * resolved before it is reported, but resolved is not the same as converted:
 * Chrome hands back `lab(100 0 0)` for a token built through `oklab`, and this
 * used to scrape the first three numbers out of that and call them red, green
 * and blue. White arrived as `rgb(100, 0, 0)`. In light mode the near dots were
 * `lab(0 0 0)`, which scrapes to black and looks right, so only dark mode showed
 * it: dark red mixed toward black, on a near-black ground.
 *
 * A 1x1 fill and `getImageData` is a readback, so the answer is cached against
 * the string it came from. There are two per orb and they change when the theme
 * does.
 */
export const readColor = (value: string): [number, number, number] => {
  const seen = known.get(value)
  if (seen) {
    return seen
  }
  if (swatch === undefined) {
    swatch = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  }
  if (!swatch) {
    return [128, 128, 128]
  }
  /* Cleared and given a known color first, so a value the engine will not parse
     leaves the opaque black behind rather than whatever was measured last. */
  swatch.clearRect(0, 0, 1, 1)
  swatch.fillStyle = '#808080'
  swatch.fillStyle = value
  swatch.fillRect(0, 0, 1, 1)
  const [red, green, blue] = swatch.getImageData(0, 0, 1, 1).data
  const rgb: [number, number, number] = [red ?? 128, green ?? 128, blue ?? 128]
  /* Two per orb and a handful of themes, so this stays small on its own. The
     cap is for a page deriving colors on a slider. */
  if (known.size > 64) {
    known.clear()
  }
  known.set(value, rgb)
  return rgb
}
