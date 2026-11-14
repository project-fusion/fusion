import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { TurboModuleRegistry } from 'react-native'
import { forgetMapLibre, loadMapLibre, nativeRenderer } from './renderer'

afterEach(() => {
  jest.restoreAllMocks()
  forgetMapLibre()
})

describe('nativeRenderer', () => {
  test('draws no map where the app was built without MapLibre Native, as Expo Go is, and never requires it', () => {
    const asked = jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue(null)
    expect(nativeRenderer.available('map')).toBe(false)
    expect(loadMapLibre()).toBeNull()
    /* Asked once, and kept. */
    expect(asked).toHaveBeenCalledTimes(1)
  })

  test('draws no map where the native module stands but the package is not installed', () => {
    jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue({} as never)
    jest.doMock(
      '@maplibre/maplibre-react-native',
      () => {
        throw new Error('Cannot find module')
      },
      { virtual: true },
    )
    expect(nativeRenderer.available('map')).toBe(false)
    jest.dontMock('@maplibre/maplibre-react-native')
  })

  test('has no terminal renderer yet', () => {
    expect(nativeRenderer.available('terminal')).toBe(false)
  })
})
