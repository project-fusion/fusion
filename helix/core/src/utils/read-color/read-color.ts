/**
 * Reading a computed color the engine has resolved but not converted.
 *
 * Distinct from `css-color`, which reads the syntax a *consumer* writes and
 * runs on a server. This reads what the engine hands back, which can be in any
 * space the platform supports, and needs a canvas to do it.
 */

/** A color as three sRGB bytes, which is what a canvas reports and takes. */
export type ColorBytes = [number, number, number]

/**
 * One pixel of scratch, and what it has already been asked.
 *
 * Built on first use rather than at module scope, because this file is imported
 * on a server where there is no document.
 */
let swatch: CanvasRenderingContext2D | null | undefined
const known = new Map<string, ColorBytes | undefined>()

/** How many answers are held. Small: a palette is a handful of colors. */
const KEPT = 64

/** Paints `value` over `under` and reports what landed. */
const painted = (context: CanvasRenderingContext2D, value: string, under: string): ColorBytes => {
  context.fillStyle = under
  context.fillStyle = value
  context.fillRect(0, 0, 1, 1)
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
  return [red ?? 0, green ?? 0, blue ?? 0]
}

/**
 * A computed color as three sRGB bytes, or nothing where it cannot be read.
 *
 * **Painting it is the only way to read it.** A color-typed property is
 * resolved before it is reported, but resolved is not the same as converted:
 * Chrome hands back `lab(100 0 0)` for a token built through `oklab`, and
 * scraping the first three numbers out of that and calling them red, green and
 * blue made white arrive as `rgb(100, 0, 0)`. In light mode the near dots were
 * `lab(0 0 0)`, which scrapes to black and looks right, so only dark mode
 * showed it: dark red mixed toward black, on a near-black ground.
 *
 * **Painted twice, over two different grounds, which is what makes the refusal
 * honest.** Assigning a value the engine will not parse leaves `fillStyle`
 * exactly where it was, so a single paint cannot tell a color apart from the
 * ground it failed to replace. Over black and over white, a value that parsed
 * gives the same answer twice and one that did not gives two. A caller then
 * chooses its own fallback rather than being handed a color nobody picked,
 * which is the half both earlier copies of this had to guess at.
 *
 * A readback is not free, so the answer is held against the string it came
 * from, refusals included. The oldest goes when the store is full rather than
 * all of them, or a page deriving colors on a slider pays for every frame
 * twice.
 *
 * @param value A resolved color, as `getComputedStyle` reports one.
 */
export const readColor = (value: string): ColorBytes | undefined => {
  if (known.has(value)) {
    const seen = known.get(value)
    return seen ? [...seen] : undefined
  }
  /* There is no canvas on a server, and no answer either: a caller's fallback
     is the only thing that can be right there. */
  if (typeof document === 'undefined') {
    return undefined
  }
  if (swatch === undefined) {
    swatch = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  }
  if (!swatch) {
    return undefined
  }
  const over = painted(swatch, value, '#000000')
  const under = painted(swatch, value, '#ffffff')
  const read = over.every((one, at) => one === under[at]) ? over : undefined
  if (known.size >= KEPT) {
    const oldest = known.keys().next().value
    if (oldest !== undefined) {
      known.delete(oldest)
    }
  }
  known.set(value, read)
  return read ? [...read] : undefined
}
