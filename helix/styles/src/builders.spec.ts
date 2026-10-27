/**
 * The CSS each builder returns.
 *
 * **The same table as `helix/theme/rust/tokens/builder/tests.rs`.** The
 * registry prints each typed value as CSS too, and `helix system
 * design-tokens` refuses a token whose two spellings differ, so the cases
 * here are the ones a token in `tokens.ts` does not reach yet: a nested sum,
 * a second-weighted mix, and a quoted family.
 */
import { describe, expect, test } from 'bun:test'
import {
  alpha,
  blur,
  chroma,
  clamp,
  cubicBezier,
  density,
  em,
  families,
  filters,
  hex,
  hue,
  lightDark,
  lightness,
  linear,
  minus,
  mix,
  ms,
  none,
  plus,
  primitive,
  px,
  quoted,
  ref,
  relative,
  rem,
  round,
  saturate,
  shadow,
  spring,
  times,
} from './builders.js'
import { TOKENS } from './tokens.js'

describe('the builders', () => {
  test('return the CSS the registry prints for the same calls', () => {
    const written = [
      lightDark(primitive('neutral-0'), primitive('neutral-1000')),
      alpha(hex('000000'), 40),
      mix(hex('000000'), hex('ffffff'), 30),
      mix(hex('000000'), 60, hex('ffffff')),
      relative(hex('ff0000'), lightness, times(chroma, 0.5), hue),
      relative(hex('ff0000'), clamp(0, times(minus(0.68, lightness), 1000), 1), 0, 0),
      times(rem(2.5), density),
      round(times(ref('size-control'), 0.8), px(1)),
      em(-0.01),
      ms(120),
      cubicBezier(0.3, 0, 1, 1),
      shadow([0, px(1), px(2)], hex('000000')),
      none,
      filters(blur(px(16)), saturate(1.5)),
      families('ui-sans-serif', quoted('Segoe UI')),
      spring({ damping: 14.2, mass: 1, stiffness: 100 }, linear(0, 1.04, 1)),
      primitive('brand-on', ref('color-ink')),
    ].map(String)
    expect(written).toEqual([
      'light-dark(var(--_helix-neutral-0), var(--_helix-neutral-1000))',
      'color-mix(in oklab, #000000 40%, transparent)',
      'color-mix(in oklab, #000000, #ffffff 30%)',
      'color-mix(in oklab, #000000 60%, #ffffff)',
      'oklch(from #ff0000 l calc(c * 0.5) h)',
      'oklch(from #ff0000 clamp(0, (0.68 - l) * 1000, 1) 0 0)',
      'calc(2.5rem * var(--_helix-seed-density))',
      'round(calc(var(--helix-size-control) * 0.8), 1px)',
      '-0.01em',
      '120ms',
      'cubic-bezier(0.3, 0, 1, 1)',
      '0 1px 2px #000000',
      'none',
      'blur(16px) saturate(1.5)',
      'ui-sans-serif, "Segoe UI"',
      'linear(0, 1.04, 1)',
      'var(--_helix-brand-on, var(--helix-color-ink))',
    ])
  })

  test('keep a nested sum in parentheses', () => {
    expect(String(times(plus(rem(1), px(2)), 2))).toBe('calc((1rem + 2px) * 2)')
    expect(String(minus(rem(1), minus(px(2), px(1))))).toBe('calc(1rem - (2px - 1px))')
    expect(String(plus(rem(1), times(px(2), 3)))).toBe('calc(1rem + 2px * 3)')
  })

  test('write every token in tokens.ts as a builder or a number', () => {
    for (const [name, value] of TOKENS) {
      const css = String(value)
      expect({ [name]: typeof value === 'number' || css === value.css }).toEqual({ [name]: true })
      expect({ [name]: css.includes('[object') }).toEqual({ [name]: false })
    }
  })
})
