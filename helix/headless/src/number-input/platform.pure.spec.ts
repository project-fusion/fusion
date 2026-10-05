import { describe, expect, test } from 'bun:test'
import { appleTouch } from './platform.js'

describe('an Apple touch device', () => {
  test('is an iPhone, an iPad, or an iPad asking for the desktop site', () => {
    expect(
      appleTouch({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }),
    ).toBe(true)
    expect(appleTouch({ maxTouchPoints: 5, platform: 'MacIntel', userAgent: 'Macintosh' })).toBe(
      true,
    )
  })

  test('is not a Mac without touch, another platform, or a server', () => {
    expect(appleTouch({ maxTouchPoints: 0, platform: 'MacIntel', userAgent: 'Macintosh' })).toBe(
      false,
    )
    expect(appleTouch({ platform: 'Win32', userAgent: 'Windows NT 10.0' })).toBe(false)
    expect(appleTouch(undefined)).toBe(false)
  })
})
