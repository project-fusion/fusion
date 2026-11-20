import { afterEach, describe, expect, jest, test } from '@jest/globals'
import * as ExpoClipboard from 'expo-clipboard'
import { nativeClipboard } from './clipboard'

afterEach(() => {
  jest.restoreAllMocks()
})

describe('nativeClipboard', () => {
  test('writes through expo-clipboard and gives what it answers', async () => {
    const write = jest.spyOn(ExpoClipboard, 'setStringAsync').mockResolvedValue(true)
    expect(await nativeClipboard.write('#3b82f6')).toBe(true)
    expect(write.mock.calls).toEqual([['#3b82f6']])
  })

  test('gives false where the write is refused or the native module is missing', async () => {
    jest.spyOn(ExpoClipboard, 'setStringAsync').mockResolvedValue(false)
    expect(await nativeClipboard.write('refused')).toBe(false)
    jest
      .spyOn(ExpoClipboard, 'setStringAsync')
      .mockRejectedValue(new Error('The native module ExpoClipboard is missing.'))
    expect(await nativeClipboard.write('missing')).toBe(false)
  })

  test('gives false where the app does not install expo-clipboard', async () => {
    const missing = jest.fn(() => {
      throw new Error("Cannot find module 'expo-clipboard'")
    })
    jest.doMock('expo-clipboard', missing)
    try {
      let isolated: typeof import('./clipboard') | undefined
      jest.isolateModules(() => {
        isolated = require('./clipboard') as typeof import('./clipboard')
      })
      expect(await isolated?.nativeClipboard.write('anything')).toBe(false)
      expect(missing).toHaveBeenCalledTimes(1)
    } finally {
      jest.dontMock('expo-clipboard')
    }
  })
})
