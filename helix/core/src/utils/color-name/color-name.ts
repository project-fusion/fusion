import type { Color } from '../css-color/css-color.js'

/**
 * The words a color's name is made of, keyed by their English, with the two
 * sentences that put them together.
 *
 * **The keys are React Aria's**, the strings `@react-stately/color` ships for
 * `Color.getColorName`, so a page that already translates those can hand the
 * same table over. `colorName` and `transparentColorName` are the sentences,
 * with `{lightness}`, `{chroma}`, `{hue}` and `{percentTransparent}` filled in;
 * every other key is one word or one pair of words. A pair is its own entry,
 * because a language may join two hues in a way that is not two words with a
 * space between them.
 */
export type ColorWords = Record<
  | 'black'
  | 'blue'
  | 'blue purple'
  | 'brown'
  | 'brown yellow'
  | 'colorName'
  | 'cyan'
  | 'cyan blue'
  | 'dark'
  | 'gray'
  | 'grayish'
  | 'green'
  | 'green cyan'
  | 'light'
  | 'magenta'
  | 'magenta pink'
  | 'orange'
  | 'orange yellow'
  | 'pale'
  | 'pink'
  | 'pink red'
  | 'purple'
  | 'purple magenta'
  | 'red'
  | 'red orange'
  | 'transparentColorName'
  | 'very dark'
  | 'very light'
  | 'vibrant'
  | 'white'
  | 'yellow'
  | 'yellow green',
  string
>

/** The English the names are spoken in where a page gives no words of its own. */
export const COLOR_WORDS: ColorWords = {
  black: 'black',
  blue: 'blue',
  'blue purple': 'blue purple',
  brown: 'brown',
  'brown yellow': 'brown yellow',
  colorName: '{lightness} {chroma} {hue}',
  cyan: 'cyan',
  'cyan blue': 'cyan blue',
  dark: 'dark',
  gray: 'gray',
  grayish: 'grayish',
  green: 'green',
  'green cyan': 'green cyan',
  light: 'light',
  magenta: 'magenta',
  'magenta pink': 'magenta pink',
  orange: 'orange',
  'orange yellow': 'orange yellow',
  pale: 'pale',
  pink: 'pink',
  'pink red': 'pink red',
  purple: 'purple',
  'purple magenta': 'purple magenta',
  red: 'red',
  'red orange': 'red orange',
  transparentColorName: '{lightness} {chroma} {hue}, {percentTransparent} transparent',
  'very dark': 'very dark',
  'very light': 'very light',
  vibrant: 'vibrant',
  white: 'white',
  yellow: 'yellow',
  'yellow green': 'yellow green',
}

/** Where each hue starts on the OKLCH wheel, in degrees, and what it is called. */
const HUES: [number, keyof ColorWords][] = [
  [0, 'pink'],
  [15, 'red'],
  [48, 'orange'],
  [94, 'yellow'],
  [135, 'green'],
  [175, 'cyan'],
  [264, 'blue'],
  [284, 'purple'],
  [320, 'magenta'],
  [349, 'pink'],
]

/** Below this lightness an orange is brown. */
const BROWN_BELOW = 0.68
/** Below this lightness a yellow leans green. */
const YELLOW_GREEN_BELOW = 0.85
/** The lightest a color can be and still be called dark. */
const DARK_BELOW = 0.55
/** Below this chroma a color is gray. */
const GRAY_BELOW = 0.001

/** One sRGB channel, 0 to 1, as linear light. */
const linear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

/**
 * A color in OKLCH: lightness 0 to 1, chroma, and hue in degrees.
 *
 * OKLCH because its lightness is the same for every hue, which HSB's
 * brightness is not: a blue and a yellow at full brightness are a dark color
 * and a light one, and the name has to say so.
 */
const oklch = (color: Color): [number, number, number] => {
  const hue = (((color.hue % 360) + 360) % 360) / 60
  const value = color.brightness / 100
  const chroma = value * (color.saturation / 100)
  const middle = chroma * (1 - Math.abs((hue % 2) - 1))
  const base = value - chroma
  const sextants: [number, number, number][] = [
    [chroma, middle, 0],
    [middle, chroma, 0],
    [0, chroma, middle],
    [0, middle, chroma],
    [middle, 0, chroma],
    [chroma, 0, middle],
  ]
  const [red, green, blue] = (sextants[Math.floor(hue) % 6] ?? [0, 0, 0]).map((one) =>
    linear(one + base),
  ) as [number, number, number]
  /* Linear sRGB straight to the cone responses OKLab is defined on, which is
     the XYZ step and its matrix folded into one. */
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue)
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const angle = (Math.atan2(b, a) * 180) / Math.PI
  return [lightness, Math.hypot(a, b), angle >= 0 ? angle : angle + 360]
}

/**
 * The name of a hue, and the lightness the rest of the name reads from.
 *
 * An orange darker than `BROWN_BELOW` is brown, and a light orange is read as
 * that much less light, so the light end of the oranges is not every one of
 * them. A hue past the middle of its span takes the next one's name as well.
 */
const hueOf = (
  lightness: number,
  chroma: number,
  hue: number,
  words: ColorWords,
): [string, number] => {
  if (chroma < GRAY_BELOW) {
    return [words.gray, lightness]
  }
  for (let at = 0; at < HUES.length; at += 1) {
    const [from, named] = HUES[at] as [number, keyof ColorWords]
    const [to, after] = HUES[at + 1] ?? [360, 'pink' as const]
    if (hue < from || hue >= to) {
      continue
    }
    let name: keyof ColorWords = named
    let light = lightness
    if (name === 'orange') {
      if (lightness < BROWN_BELOW) {
        name = 'brown'
      } else {
        light = lightness - BROWN_BELOW + DARK_BELOW
      }
    }
    if (hue > from + (to - from) / 2 && name !== after) {
      name = `${name} ${after}` as keyof ColorWords
    } else if (name === 'yellow' && lightness < YELLOW_GREEN_BELOW) {
      name = 'yellow green'
    }
    return [words[name] ?? COLOR_WORDS[name] ?? name, light]
  }
  return [words.gray, lightness]
}

/**
 * A color's name, such as "vibrant red" or "dark grayish blue", in the words
 * given.
 *
 * The same reading React Aria's `Color.getColorName` gives, from the same
 * thresholds: a hue from where the color sits on the OKLCH wheel, a lightness
 * from very dark to very light, and a chroma from grayish to vibrant. A color
 * with any transparency says how much, in a percentage written for `locale`.
 */
export const colorName = (color: Color, given: Partial<ColorWords> = {}, locale = ''): string => {
  const words = { ...COLOR_WORDS, ...given }
  const [lightness, chroma, angle] = oklch(color)
  if (lightness > 0.999) {
    return words.white
  }
  if (lightness < 0.001) {
    return words.black
  }
  const [hue, light] = hueOf(lightness, chroma, angle, words)
  let tone = ''
  if (chroma <= 0.1 && chroma >= GRAY_BELOW) {
    tone = light >= 0.7 ? words.pale : words.grayish
  } else if (chroma >= 0.15) {
    tone = words.vibrant
  }
  let shade = ''
  if (light < 0.3) {
    shade = words['very dark']
  } else if (light < DARK_BELOW) {
    shade = words.dark
  } else if (light >= 0.85) {
    shade = words['very light']
  } else if (light >= 0.7) {
    shade = words.light
  }
  const alpha = Math.min(100, Math.max(0, color.alpha)) / 100
  const sentence = alpha < 1 ? words.transparentColorName : words.colorName
  const percent = new Intl.NumberFormat(locale || undefined, { style: 'percent' }).format(1 - alpha)
  return sentence
    .replaceAll('{lightness}', () => shade)
    .replaceAll('{chroma}', () => tone)
    .replaceAll('{hue}', () => hue.toLocaleLowerCase(locale || undefined))
    .replaceAll('{percentTransparent}', () => percent)
    .replace(/\s+/g, ' ')
    .trim()
}

/** The name of a color's hue alone, such as "red orange", in the words given. */
export const hueName = (color: Color, given: Partial<ColorWords> = {}, locale = ''): string => {
  const [lightness, chroma, angle] = oklch(color)
  return hueOf(lightness, chroma, angle, { ...COLOR_WORDS, ...given })[0].toLocaleLowerCase(
    locale || undefined,
  )
}
