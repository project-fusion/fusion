import { describe, expect, test } from 'bun:test'
import { appleTouch, onAndroid, onApple } from './platform.js'

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

describe('an Apple keyboard', () => {
  test('is a Mac, an iPhone or an iPad, by the user agent', () => {
    expect(onApple({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)' })).toBe(true)
    expect(onApple({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)' })).toBe(true)
  })

  test('is not another platform, nor a server with no keyboard to ask', () => {
    expect(onApple({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })).toBe(false)
    expect(onApple({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' })).toBe(false)
    expect(onApple(undefined)).toBe(false)
  })
})

describe('Android', () => {
  test('is a phone or a tablet whose user agent says so', () => {
    expect(
      onAndroid({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36' }),
    ).toBe(true)
  })

  test('is not another platform, nor a server', () => {
    expect(onAndroid({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe(
      false,
    )
    expect(onAndroid({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' })).toBe(false)
    expect(onAndroid(undefined)).toBe(false)
  })
})
