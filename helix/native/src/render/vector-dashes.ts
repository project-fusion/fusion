/**
 * A shape's dashes as `react-native-svg` and Reanimated take them: in the
 * shape's own units where the style writes them in `pathLength`'s, and as a
 * list of numbers.
 */

import type { Style } from '../style/resolved'

/**
 * Paint with its dashes in the shape's own units, where they are written in
 * `pathLength`'s. **`react-native-svg` draws no `pathLength`**, so a ring
 * whose dashes say 70 of 100 is measured by its circumference here.
 */
export const dashed = (paint: Style, by: number): Style => {
  if (by === 1) {
    return paint
  }
  const out: Record<string, number | string> = { ...paint }
  if (typeof paint.strokeDasharray === 'string') {
    out.strokeDasharray = paint.strokeDasharray
      .split(/[\s,]+/)
      .map((dash) => Math.round(Number(dash) * by * 1000) / 1000)
      .join(' ')
  }
  if (typeof paint.strokeDashoffset === 'number') {
    out.strokeDashoffset = Math.round(paint.strokeDashoffset * by * 1000) / 1000
  }
  return out
}

/**
 * A style with its dashes as a list of numbers, `[70, 100]` for `70 100`.
 * **Reanimated takes a shape's dashes only as a list**, and threw on the
 * words `react-native-svg` takes, so a ring whose dashes move or ease did
 * not draw at all: Progress's ring example on a simulator and an emulator,
 * run 38957410938.
 */
export const listedDashes = <T extends Readonly<Record<string, unknown>>>(style: T): T => {
  const dashes = style.strokeDasharray
  return typeof dashes === 'string' && dashes !== 'none'
    ? {
        ...style,
        strokeDasharray: dashes
          .split(/[\s,]+/)
          .filter(Boolean)
          .map(Number),
      }
    : style
}

/** Each frame of an animation style with its dashes as a list, as `listedDashes` writes them. */
export const listedFrames = (
  css: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  const frames = css.animationName
  return typeof frames === 'object' && frames !== null
    ? {
        ...css,
        animationName: Object.fromEntries(
          Object.entries(frames).map(([at, frame]) => [
            at,
            listedDashes(frame as Readonly<Record<string, unknown>>),
          ]),
        ),
      }
    : css
}
