import { afterEach, describe, expect, jest, test } from '@jest/globals'
import * as ExpoDocumentPicker from 'expo-document-picker'
import * as ExpoSharing from 'expo-sharing'
import { nativeFiles } from './files'

jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }))

/* The package's functions are getters, which a spy cannot replace. */
const sheet = jest.mocked(ExpoSharing)

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

const asset = (name: string, mimeType: string) => ({
  lastModified: 0,
  mimeType,
  name,
  size: 2048,
  uri: `file:///cache/${name}`,
})

describe('nativeFiles', () => {
  test('picks through expo-document-picker with the media types asked for', async () => {
    const opened = jest.spyOn(ExpoDocumentPicker, 'getDocumentAsync').mockResolvedValue({
      assets: [asset('photo.png', 'image/png')],
      canceled: false,
    } as ExpoDocumentPicker.DocumentPickerResult)
    expect(await nativeFiles.pick({ accept: ['image/*'], multiple: true })).toEqual({
      files: [{ name: 'photo.png', size: 2048, type: 'image/png', uri: 'file:///cache/photo.png' }],
      outcome: 'chosen',
    })
    expect(opened.mock.calls).toEqual([
      [{ copyToCacheDirectory: true, multiple: true, type: ['image/*'] }],
    ])
  })

  test('offers any file for an extension, and keeps the files chosen to it', async () => {
    const opened = jest.spyOn(ExpoDocumentPicker, 'getDocumentAsync').mockResolvedValue({
      assets: [asset('report.pdf', 'application/pdf'), asset('notes.txt', 'text/plain')],
      canceled: false,
    } as ExpoDocumentPicker.DocumentPickerResult)
    const picked = await nativeFiles.pick({ accept: ['.pdf'], multiple: true })
    expect(picked.files.map((file) => file.name)).toEqual(['report.pdf'])
    expect(opened.mock.calls[0]?.[0]).toMatchObject({ type: '*/*' })
  })

  test('gives dismissed when the picker closes, and unavailable when it fails', async () => {
    jest
      .spyOn(ExpoDocumentPicker, 'getDocumentAsync')
      .mockResolvedValue({ assets: null, canceled: true })
    expect(await nativeFiles.pick({ accept: [], multiple: false })).toEqual({
      files: [],
      outcome: 'dismissed',
    })
    jest
      .spyOn(ExpoDocumentPicker, 'getDocumentAsync')
      .mockRejectedValue(new Error('The native module ExpoDocumentPicker is missing.'))
    expect((await nativeFiles.pick({ accept: [], multiple: false })).outcome).toBe('unavailable')
  })

  test('saves a file on the device through the share sheet', async () => {
    sheet.isAvailableAsync.mockResolvedValue(true)
    sheet.shareAsync.mockResolvedValue(undefined)
    expect(
      await nativeFiles.save({ name: 'notes.txt', type: 'text/plain', uri: 'file:///notes.txt' }),
    ).toBe(true)
    expect(sheet.shareAsync.mock.calls).toEqual([
      ['file:///notes.txt', { dialogTitle: 'notes.txt', mimeType: 'text/plain' }],
    ])
  })

  test('a save gives false where the device cannot share a file', async () => {
    sheet.isAvailableAsync.mockResolvedValue(false)
    expect(
      await nativeFiles.save({ name: 'notes.txt', type: 'text/plain', uri: 'file:///notes.txt' }),
    ).toBe(false)
  })

  test('a pick is unavailable where the app does not install expo-document-picker', async () => {
    const missing = jest.fn(() => {
      throw new Error("Cannot find module 'expo-document-picker'")
    })
    jest.doMock('expo-document-picker', missing)
    try {
      let isolated: typeof import('./files') | undefined
      jest.isolateModules(() => {
        isolated = require('./files') as typeof import('./files')
      })
      expect(await isolated?.nativeFiles.pick({ accept: [], multiple: false })).toEqual({
        files: [],
        outcome: 'unavailable',
      })
    } finally {
      jest.dontMock('expo-document-picker')
    }
  })
})
