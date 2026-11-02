import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { afterEach, describe, expect, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { nativeTimers } from '../capabilities/timers'
import { HelixRoot } from './root'

/** What the timers slot held before the spec ran, which is the server's. */
const before = timers()

afterEach(() => {
  setTimers(before)
})

describe('HelixRoot', () => {
  test('installs the native capabilities as it first draws, and draws what it holds', async () => {
    const screen = await render(
      <HelixRoot mode="light">
        <Text>Inside</Text>
      </HelixRoot>,
    )
    expect(timers()).toBe(nativeTimers)
    expect(screen.getByText('Inside')).toBeTruthy()
  })

  test('installs them once, so a capability an app set after stays set', async () => {
    const own = { ...nativeTimers }
    setTimers(own)
    await render(
      <HelixRoot mode="light">
        <Text>Again</Text>
      </HelixRoot>,
    )
    expect(timers()).toBe(own)
  })
})
