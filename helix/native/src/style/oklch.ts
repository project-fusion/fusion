/**
 * An `oklch()` color as the `rgb()` React Native draws, which has no
 * `oklch()` of its own. The theme's tokens are written in sRGB when they are
 * generated, and a hook set from code shared with the web, such as
 * `--qr-code-color: oklch(0.35 0.13 265)`, reaches a phone as written.
 */

const OKLCH = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i

/** A number written as a share, `50%` or `0.5`. */
const share = (written: string): number =>
  written.endsWith('%') ? Number(written.slice(0, -1)) / 100 : Number(written)

/** One linear sRGB channel, encoded and clamped to 0 to 255. */
const channel = (linear: number): number => {
  const encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, encoded)) * 255)
}

/** `written` as `rgb()` or `rgba()` where it is an `oklch()` color, and as it is otherwise. */
export const fromOklch = (written: string): string => {
  const found = OKLCH.exec(written.trim())
  if (found === null) {
    return written
  }
  const [, lightness = '0', chroma = '0', hue = '0', alpha] = found
  const l = share(lightness)
  const angle = (Number(hue) * Math.PI) / 180
  const a = Number(chroma) * Math.cos(angle)
  const b = Number(chroma) * Math.sin(angle)
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const red = channel(4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1)
  const green = channel(-1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1)
  const blue = channel(-0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1)
  return alpha === undefined
    ? `rgb(${red}, ${green}, ${blue})`
    : `rgba(${red}, ${green}, ${blue}, ${share(alpha)})`
}
