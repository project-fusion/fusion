import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { Haptic } from '../types.generated.js'
import { webHaptics } from './web.js'

beforeAll(() => {
  registerDom()
})

/* happy-dom has no `vibrate`, so a spec gives the page one to count calls to,
   and takes it away after. */
afterEach(() => {
  delete (navigator as { vibrate?: unknown }).vibrate
})

const KINDS: readonly Haptic[] = ['cancel', 'drop', 'lift', 'notify', 'pass', 'select']

describe('webHaptics', () => {
  test('plays nothing for any kind, and does not vibrate the device', () => {
    const vibrated: unknown[] = []
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: unknown) => vibrated.push(pattern),
    })
    for (const kind of KINDS) {
      expect(webHaptics.play(kind)).toBeUndefined()
    }
    expect(vibrated).toEqual([])
  })
})
