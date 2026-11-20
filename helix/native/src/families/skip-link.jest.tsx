/*
 * The generated Skip Link, which is the web's alone: on a phone it draws
 * nothing, whatever it is given, so a universal app's shared screens can
 * write it for the web. `test:native` writes the component beside this file,
 * as the styled package's build writes the one it ships.
 */
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { HelixSkipLink } from './skip-link/index.native'

describe('the generated Skip Link', () => {
  test('draws nothing, its words and what is passed in included', async () => {
    const view = await render(
      <HelixTheme mode="light">
        <HelixSkipLink href="#results" label="Skip to results" />
        <HelixSkipLink>
          <Text>Skip to content</Text>
        </HelixSkipLink>
      </HelixTheme>,
    )
    expect(view.toJSON()).toBeNull()
    expect(screen.queryByText(/Skip to/, { includeHiddenElements: true })).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  test('is named for its web element', () => {
    expect((HelixSkipLink as { displayName?: string }).displayName).toBe('helix-skip-link')
  })
})
