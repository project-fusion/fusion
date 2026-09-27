/**
 * The colors a themed map is drawn from, each a `#hex`, `rgb()` or `rgba()`.
 *
 * **A handful, and the rest is mixed from them.** Buildings, borders, labels
 * and the smaller roads are the land moved toward the ink by different
 * amounts, so a light theme draws dark lines on a light ground and a dark
 * theme light lines on a dark one, with no second palette to keep in step.
 * The roads a reader navigates by take the brand, which is where a map shows
 * whose it is.
 */
export interface MapColors {
  /** The ink, which roads, borders and labels are mixed toward: `foreground`. */
  foreground: string
  /** The water's hue, mixed quietly into the land: `info`. */
  info: string
  /** The brand, which the motorways and the major roads are drawn toward: `primary`. */
  primary: string
  /** The parks' and woods' hue, mixed more quietly still: `success`. */
  success: string
  /** The land, which everything else is drawn on: `surface`. */
  surface: string
}

/** The Helix token each color is read from. */
const TOKENS: Record<keyof MapColors, string> = {
  foreground: '--helix-color-foreground',
  info: '--helix-color-info',
  primary: '--helix-color-primary',
  success: '--helix-color-success',
  surface: '--helix-color-surface',
}

/** The one pixel every color is settled on, made once rather than per color. */
let pixel: CanvasRenderingContext2D | null | undefined

/**
 * A color the browser has settled, as sRGB a renderer can parse: painted onto
 * one pixel and read back, since what the browser settles to may be
 * `oklch()`. As it was where there is no canvas to paint on.
 */
const toSrgb = (resolved: string): string => {
  if (pixel === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    pixel = canvas.getContext('2d', { willReadFrequently: true })
  }
  const context = pixel
  if (!context) {
    return resolved
  }
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = resolved
  context.fillRect(0, 0, 1, 1)
  const [red = 0, green = 0, blue = 0, alpha = 255] = context.getImageData(0, 0, 1, 1).data
  return alpha === 255
    ? `rgb(${red}, ${green}, ${blue})`
    : `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
}

/**
 * An element's own `color`, settled the same way: what a route or an area
 * is drawn in, which its tone decides in the page's stylesheet and which the
 * renderer can only take as sRGB.
 */
export const settledColor = (
  element: Element,
  property: 'border-top-color' | 'color' | 'outline-color' = 'color',
): string => toSrgb(getComputedStyle(element).getPropertyValue(property))

/**
 * The page's own colors, read where the map is, as a map style can take them.
 *
 * **Resolved by the browser and then by a canvas**, because a token is not a
 * color yet: it is `light-dark()` over a ramp, or a `color-mix()`, which only
 * the browser can settle for the element's color scheme, and what it settles
 * to may be `oklch()`, which a map style cannot parse. Painting it onto one
 * pixel and reading the pixel back gives the sRGB a style can. Read inside
 * `element`, so a frame in a dark region of a light page is themed as dark.
 */
export const mapColorsFrom = (element: Element): MapColors => {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  element.append(probe)
  const read = (token: string): string => {
    /* A token that is not there resolves to the inherited color, which drew
       a black map with nothing to say why. */
    if (getComputedStyle(probe).getPropertyValue(token).trim() === '') {
      probe.remove()
      throw new Error(
        `mapColorsFrom: \`${token}\` is not defined where the map is. Load @fusion.dev/helix-styles, whose token layer defines it.`,
      )
    }
    probe.style.color = `var(${token})`
    return toSrgb(getComputedStyle(probe).color)
  }
  const colors = Object.fromEntries(
    Object.entries(TOKENS).map(([name, token]) => [name, read(token)]),
  ) as unknown as MapColors
  probe.remove()
  return colors
}

/**
 * The page's colors where they can be read, or `null` while they cannot.
 *
 * **Not yet rather than never.** A stylesheet being swapped, which
 * development does on every edit and a page can do on its own, takes the
 * tokens away for a moment, and a restyle that landed in that moment threw
 * out of an animation frame with nobody to catch it. Ask again a frame later,
 * or call `mapColorsFrom`, whose error says what is missing.
 */
export const colorsNow = (element: Element): MapColors | null => {
  try {
    return mapColorsFrom(element)
  } catch {
    return null
  }
}

/**
 * The theme's typeface where the map is, as the one family name a map's
 * labels are drawn in: the first of `--helix-font-sans`, unquoted.
 */
export const mapFontFrom = (element: Element): string => {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  probe.style.fontFamily = 'var(--helix-font-sans)'
  element.append(probe)
  const stack = getComputedStyle(probe).fontFamily
  probe.remove()
  return (
    stack
      .split(',')[0]
      ?.trim()
      .replace(/^["']|["']$/g, '') || 'sans-serif'
  )
}

/**
 * Resolves once the typeface's weights a map draws are loaded: regular,
 * medium, bold and italic. MapLibre draws each letter once and keeps it, so
 * one drawn before the face arrived stays in the fallback face.
 */
export const fontReady = async (font: string): Promise<void> => {
  if (typeof document === 'undefined' || !document.fonts) {
    return
  }
  await Promise.all(
    ['400', '500', '700', 'italic 400'].map((face) =>
      document.fonts.load(`${face} 24px "${font}"`).catch(() => []),
    ),
  )
}

/** How many frames to wait for the tokens before saying they are missing: a few seconds. */
export const PATIENCE = 180

/**
 * The page's colors once they can be read: at once where they already can,
 * after a frame or two where the page is still settling, and the reason they
 * cannot be where a few seconds pass without them.
 */
export const colorsReady = async (element: Element): Promise<MapColors> => {
  for (let waited = 0; waited < PATIENCE; waited++) {
    const colors = colorsNow(element)
    if (colors) {
      return colors
    }
    await new Promise((next) => requestAnimationFrame(next))
  }
  return mapColorsFrom(element)
}
