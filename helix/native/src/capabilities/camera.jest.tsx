import { afterEach, describe, expect, jest, test } from '@jest/globals'
import * as ExpoImagePicker from 'expo-image-picker'
import { nativeCamera } from './camera'

afterEach(() => {
  jest.restoreAllMocks()
})

const granted = { granted: true } as ExpoImagePicker.CameraPermissionResponse
const refused = { granted: false } as ExpoImagePicker.CameraPermissionResponse

const photo = {
  assets: [
    {
      fileName: 'IMG_0001.jpg',
      fileSize: 81_920,
      height: 3024,
      mimeType: 'image/jpeg',
      uri: 'file:///cache/IMG_0001.jpg',
      width: 4032,
    },
  ],
  canceled: false,
} as ExpoImagePicker.ImagePickerResult

describe('nativeCamera', () => {
  test('a capture asks for the camera permission, then gives the photo taken', async () => {
    jest.spyOn(ExpoImagePicker, 'requestCameraPermissionsAsync').mockResolvedValue(granted)
    const opened = jest.spyOn(ExpoImagePicker, 'launchCameraAsync').mockResolvedValue(photo)
    expect(await nativeCamera.capture()).toEqual({
      files: [
        {
          name: 'IMG_0001.jpg',
          size: 81_920,
          type: 'image/jpeg',
          uri: 'file:///cache/IMG_0001.jpg',
        },
      ],
      outcome: 'chosen',
    })
    expect(opened.mock.calls).toEqual([[{ mediaTypes: ['images'] }]])
  })

  test('a capture is refused without the permission, and opens no camera', async () => {
    jest.spyOn(ExpoImagePicker, 'requestCameraPermissionsAsync').mockResolvedValue(refused)
    const opened = jest.spyOn(ExpoImagePicker, 'launchCameraAsync')
    expect(await nativeCamera.capture()).toEqual({ files: [], outcome: 'refused' })
    expect(opened).not.toHaveBeenCalled()
  })

  test('a capture is unavailable on a device without a camera, as the simulator is', async () => {
    jest.spyOn(ExpoImagePicker, 'requestCameraPermissionsAsync').mockResolvedValue(granted)
    jest
      .spyOn(ExpoImagePicker, 'launchCameraAsync')
      .mockRejectedValue(new Error('Camera not available on simulator'))
    expect(await nativeCamera.capture()).toEqual({ files: [], outcome: 'unavailable' })
  })

  test('choosing opens the library for as many photos as asked for, and names a photo by its address where it has no name', async () => {
    const opened = jest.spyOn(ExpoImagePicker, 'launchImageLibraryAsync').mockResolvedValue({
      assets: [{ height: 1, uri: 'file:///cache/ABC%20123.heic', width: 1 }],
      canceled: false,
    } as ExpoImagePicker.ImagePickerResult)
    expect(await nativeCamera.choose(true)).toEqual({
      files: [{ name: 'ABC 123.heic', size: 0, type: '', uri: 'file:///cache/ABC%20123.heic' }],
      outcome: 'chosen',
    })
    expect(opened.mock.calls).toEqual([[{ allowsMultipleSelection: true, mediaTypes: ['images'] }]])
  })

  test('choosing gives dismissed when the reader closes the library', async () => {
    jest
      .spyOn(ExpoImagePicker, 'launchImageLibraryAsync')
      .mockResolvedValue({ assets: null, canceled: true })
    expect(await nativeCamera.choose(false)).toEqual({ files: [], outcome: 'dismissed' })
  })
})
