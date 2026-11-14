/*
 * The generated Device Screen, which is the web's alone: it pictures another
 * device in a frame on a web page, and a phone has no other device to frame,
 * so on a phone it draws nothing, whatever it is given. `test:native` writes
 * the component beside this file, as the styled package's build writes the
 * one it ships.
 */
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { HelixDeviceScreen } from './device-screen/index.native'

describe('the generated Device Screen', () => {
  test('draws nothing, its buttons and what is passed in included', async () => {
    const view = await render(
      <HelixTheme mode="light">
        <HelixDeviceScreen controls="home screenshot" label="iPhone 17 Pro">
          <Text>A stream</Text>
        </HelixDeviceScreen>
      </HelixTheme>,
    )
    expect(view.toJSON()).toBeNull()
    expect(screen.queryByText('A stream', { includeHiddenElements: true })).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  test('is named for its web element', () => {
    expect((HelixDeviceScreen as { displayName?: string }).displayName).toBe('helix-device-screen')
  })
})
