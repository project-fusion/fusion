import { describe, expect, test } from 'bun:test'
import { movedLightness } from './color.js'
import { COMPARED } from './resolve.js'

describe('what a phone resolves that CSS writes as a function', () => {
  test('round() goes to the nearest step, a tie going up', () => {
    expect(COMPARED.round?.(25.6, 1)).toBe(26)
    expect(COMPARED.round?.(25.5, 1)).toBe(26)
    expect(COMPARED.round?.(25.4, 1)).toBe(25)
  })

  test('a relative oklch color moves lightness alone, as Chromium draws it', () => {
    /* Each read from Chromium's canvas for `oklch(from <color> calc(l - 0.05) c h)`. */
    expect(movedLightness('#3366cc', -0.05)).toBe('rgba(37, 87, 187, 1)')
    expect(movedLightness('#ffffff', -0.05)).toBe('rgba(238, 238, 238, 1)')
    expect(movedLightness('#b42318', -0.05)).toBe('rgba(163, 6, 1, 1)')
    expect(movedLightness('#067647', -0.05)).toBe('rgba(0, 103, 57, 1)')
  })

  test('what is no color has no step', () => {
    expect(movedLightness('currentColor', -0.05)).toBeUndefined()
  })
})
