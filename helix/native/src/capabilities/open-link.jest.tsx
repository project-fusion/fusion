import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { Linking } from 'react-native'
import { nativeOpenLink } from './open-link'

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeOpenLink', () => {
  test('opens a URL through Linking', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined)
    nativeOpenLink.open('https://fusion.dev/helix')
    expect(open).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledWith('https://fusion.dev/helix')
  })

  test('catches the rejection of a destination nothing opens', async () => {
    const refused = Promise.reject(new Error('No app opens /settings.'))
    const caught = jest.spyOn(refused, 'catch')
    jest.spyOn(Linking, 'openURL').mockReturnValueOnce(refused)
    nativeOpenLink.open('/settings')
    expect(caught).toHaveBeenCalledTimes(1)
    await expect(refused).rejects.toThrow('/settings')
  })
})
