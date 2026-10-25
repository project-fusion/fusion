import {
  type Environment,
  environment,
  setEnvironment,
} from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { Pressable } from 'react-native'
import { HelixButton } from '../families/button/index.native'
import { styleOf } from '../families/drawn'
import { HelixTheme } from '../theme/helix-theme'
import { pressView } from './press-view'

const original: Environment = environment()

beforeEach(() => {
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
})

afterEach(() => {
  setEnvironment(original)
})

const button = async () => {
  await render(
    <HelixTheme mode="light">
      <HelixButton>Save</HelixButton>
    </HelixTheme>,
  )
  return styleOf(screen.getByRole('button'))
}

describe('a press', () => {
  test('moves its fill and its border as its rules name, as a button’s do on the web', async () => {
    const style = await button()
    expect(style.transitionProperty).toEqual(['backgroundColor', 'borderColor'])
    expect(style.transitionDuration).toEqual([expect.any(Number), expect.any(Number)])
  })

  test('takes no time while the reader asks for reduced motion', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    expect((await button()).transitionDuration).toEqual([0, 0])
  })

  test('is React Native’s own where nothing in its style moves', () => {
    const { style, View } = pressView({ rotate: '0deg', width: 10 }, {})
    expect(View).toBe(Pressable)
    expect(style).toEqual({ transform: [{ rotate: '0deg' }], width: 10 })
  })
})
