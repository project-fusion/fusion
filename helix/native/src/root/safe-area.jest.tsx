import { afterEach, describe, expect, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import type * as SafeAreaContext from 'react-native-safe-area-context'
import { hearInsets, nativeEnvironment } from '../capabilities/environment'
import { resetSafeArea, SafeArea } from './safe-area'

/** A stand-in for the package, whose provider measures `insets` and draws what it holds. */
const measuring = (insets: { bottom: number; left: number; right: number; top: number }) =>
  ({
    initialWindowMetrics: null,
    SafeAreaProvider: ({ children }: { children?: ReactNode }) => children,
    useSafeAreaInsets: () => insets,
  }) as unknown as typeof SafeAreaContext

afterEach(() => {
  resetSafeArea()
  hearInsets({ bottom: 0, left: 0, right: 0, top: 0 })
})

describe('SafeArea', () => {
  test('tells the environment the insets its provider measures', async () => {
    resetSafeArea(measuring({ bottom: 34, left: 0, right: 0, top: 59 }))
    const screen = await render(
      <SafeArea>
        <Text>Inside</Text>
      </SafeArea>,
    )
    expect(screen.getByText('Inside')).toBeTruthy()
    expect(nativeEnvironment.read().insets).toEqual({ bottom: 34, left: 0, right: 0, top: 59 })
  })

  test('draws what it holds and reads no safe area where the app does not install the package', async () => {
    resetSafeArea(null)
    const screen = await render(
      <SafeArea>
        <Text>Inside</Text>
      </SafeArea>,
    )
    expect(screen.getByText('Inside')).toBeTruthy()
    expect(nativeEnvironment.read().insets).toEqual({ bottom: 0, left: 0, right: 0, top: 0 })
  })
})
