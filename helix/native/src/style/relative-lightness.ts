/**
 * A relative color a phone works out, as React Native does not draw one.
 */

import { movedLightness } from './color.js'
import type { Value } from './form.js'
import type { Resolution } from './resolved.js'

/** The number in a sum of `l` and a number. Undefined for any other sum. */
const lightnessSum = (
  [lightness, step]: readonly Value[],
  resolve: (value: Value) => Resolution,
): number | undefined => {
  const amount = step === undefined ? undefined : resolve(step)
  return lightness !== undefined &&
    'text' in lightness &&
    lightness.text === 'l' &&
    typeof amount === 'number'
    ? amount
    : undefined
}

/**
 * How far `written` moves a color's lightness, `calc(l - 0.05)` as words or a
 * sum of `l` and a number. Undefined for anything else.
 */
const lightnessStep = (
  written: Value,
  resolve: (value: Value) => Resolution,
): number | undefined => {
  if ('text' in written) {
    const found = /^calc\(l ([-+]) ([\d.]+)\)$/.exec(written.text)
    return found === null ? undefined : Number(found[2]) * (found[1] === '-' ? -1 : 1)
  }
  return 'calc' in written && written.calc.op === '+'
    ? lightnessSum(written.calc.operands, resolve)
    : undefined
}

/**
 * **A relative color that moves only lightness**, `oklch(from <color> <l> c h)`,
 * which React Native does not draw, as the color it comes to, so a solid
 * control's press steps past its hover fill as it does on the web. Undefined for
 * any other `oklch()`, and where its color has no value.
 */
export const relativeLightness = (
  written: readonly Value[],
  resolve: (value: Value) => Resolution,
): string | undefined => {
  const whole = written[0]
  if (whole === undefined || !('space' in whole) || whole.space.length !== 5) {
    return undefined
  }
  const [from, color, lightness, chroma, hue] = whole.space as readonly [
    Value,
    Value,
    Value,
    Value,
    Value,
  ]
  const kept = (one: Value, word: string): boolean => 'text' in one && one.text === word
  if (!kept(from, 'from') || !kept(chroma, 'c') || !kept(hue, 'h')) {
    return undefined
  }
  const base = resolve(color)
  const step = lightnessStep(lightness, resolve)
  return typeof base === 'string' && step !== undefined ? movedLightness(base, step) : undefined
}
