/**
 * The four colors a themed map is drawn from, each a `#hex`, `rgb()` or
 * `rgba()`.
 *
 * **Four, and the rest is mixed from them.** Roads, buildings, borders and
 * labels are the land moved toward the ink by different amounts, so a light
 * theme draws dark lines on a light ground and a dark theme light lines on a
 * dark one, from the same four and with no second palette to keep in step.
 */
export interface MapColors {
  /** The ink, which roads, borders and labels are mixed toward: `foreground`. */
  foreground: string
  /** The water's hue, mixed quietly into the land: `info`. */
  info: string
  /** The parks' and woods' hue, mixed more quietly still: `success`. */
  success: string
  /** The land, which everything else is drawn on: `surface`. */
  surface: string
}

/** The Helix token each color is read from. */
const TOKENS: Record<keyof MapColors, string> = {
  foreground: '--helix-color-foreground',
  info: '--helix-color-info',
  success: '--helix-color-success',
  surface: '--helix-color-surface',
}

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
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
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
    const resolved = getComputedStyle(probe).color
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
  const colors = Object.fromEntries(
    Object.entries(TOKENS).map(([name, token]) => [name, read(token)]),
  ) as unknown as MapColors
  probe.remove()
  return colors
}
