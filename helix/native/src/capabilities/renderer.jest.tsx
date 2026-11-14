import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { TurboModuleRegistry } from 'react-native'
import { forgetMapLibre, forgetXterm, loadMapLibre, loadXterm, nativeRenderer } from './renderer'

afterEach(() => {
  jest.restoreAllMocks()
  forgetMapLibre()
  forgetXterm()
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

  test('draws a terminal through @xterm/headless where the app installs it, and leaves no process title behind', () => {
    const before = 'title' in process
    expect(nativeRenderer.available('terminal')).toBe(true)
    expect(typeof loadXterm()?.Terminal).toBe('function')
    expect('title' in process).toBe(before)
  })

  test('draws no terminal where the package is not installed', () => {
    jest.doMock(
      '@xterm/headless',
      () => {
        throw new Error('Cannot find module')
      },
      { virtual: true },
    )
    expect(nativeRenderer.available('terminal')).toBe(false)
    jest.dontMock('@xterm/headless')
  })
})
