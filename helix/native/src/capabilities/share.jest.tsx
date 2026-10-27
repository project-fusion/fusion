import { afterEach, describe, expect, jest, test } from '@jest/globals'
import * as ExpoSharing from 'expo-sharing'
import { Platform, Share as SystemShare } from 'react-native'
import { nativeShare } from './share'

const sharedAction = { action: SystemShare.sharedAction, activityType: undefined }
const dismissed = { action: SystemShare.dismissedAction, activityType: undefined }

jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }))

/* The package's functions are getters, which a spy cannot replace. */
const sheet = jest.mocked(ExpoSharing)

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeShare', () => {
  test('hands words, an address, and a title to the system’s share sheet', async () => {
    const opened = jest.spyOn(SystemShare, 'share').mockResolvedValue(sharedAction)
    expect(
      await nativeShare.share({ text: 'Release notes', title: 'Helix', url: 'https://fusion.dev' }),
    ).toBe('shared')
    const [content, options] = opened.mock.calls[0] ?? []
    expect(options).toEqual({ dialogTitle: 'Helix', subject: 'Helix' })
    expect(content).toMatchObject({ title: 'Helix' })
    if (Platform.OS === 'ios') {
      expect(content).toMatchObject({ message: 'Release notes', url: 'https://fusion.dev' })
    } else {
      expect(content).toMatchObject({ message: 'Release notes\nhttps://fusion.dev' })
    }
  })

  test('gives dismissed where the reader closes the sheet, and unavailable where it fails', async () => {
    jest.spyOn(SystemShare, 'share').mockResolvedValue(dismissed)
    expect(await nativeShare.share({ url: 'https://fusion.dev' })).toBe('dismissed')
    jest.spyOn(SystemShare, 'share').mockRejectedValue(new Error('No activity'))
    expect(await nativeShare.share({ text: 'Words' })).toBe('unavailable')
  })

  test('is unavailable with nothing to share, and opens no sheet', async () => {
    const opened = jest.spyOn(SystemShare, 'share')
    expect(await nativeShare.share({ title: 'Only a title' })).toBe('unavailable')
    expect(opened).not.toHaveBeenCalled()
  })

  test('shares a file through expo-sharing, and is opened, since its sheet does not say more', async () => {
    sheet.isAvailableAsync.mockResolvedValue(true)
    sheet.shareAsync.mockResolvedValue(undefined)
    const file = { name: 'report.pdf', size: 4, type: 'application/pdf', uri: 'file:///report.pdf' }
    expect(await nativeShare.share({ file, title: 'Report' })).toBe('opened')
    expect(sheet.shareAsync.mock.calls).toEqual([
      ['file:///report.pdf', { dialogTitle: 'Report', mimeType: 'application/pdf' }],
    ])
  })

  test('a file is unavailable where the device cannot share one', async () => {
    sheet.isAvailableAsync.mockResolvedValue(false)
    const file = { name: 'a.txt', size: 1, type: 'text/plain', uri: 'file:///a.txt' }
    expect(await nativeShare.share({ file })).toBe('unavailable')
    expect(sheet.shareAsync).not.toHaveBeenCalled()
  })
})
