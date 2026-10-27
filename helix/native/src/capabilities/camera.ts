import type { Camera } from '@fusion.dev/helix-core/capabilities/camera'
import type { DeviceFile, Picked } from '@fusion.dev/helix-core/capabilities/types'
import type * as ExpoImagePicker from 'expo-image-picker'
import { nameOf, none } from './files'

/** The package, loaded at the first request: `null` where the app does not install `expo-image-picker`. */
let loaded: typeof ExpoImagePicker | null | undefined

/**
 * Loads `expo-image-picker` once.
 *
 * **A `require` inside a `try`**, which Metro bundles as an optional
 * dependency (`allowOptionalDependencies` is on by default), so an app
 * without the package builds and each request is `unavailable`.
 */
const load = (): typeof ExpoImagePicker | null => {
  if (loaded === undefined) {
    try {
      loaded = require('expo-image-picker') as typeof ExpoImagePicker
    } catch {
      loaded = null
    }
  }
  return loaded
}

/** What a picker's result gives. */
const pickedOf = (result: ExpoImagePicker.ImagePickerResult): Picked =>
  result.canceled
    ? none('dismissed')
    : {
        files: result.assets.map(
          (asset): DeviceFile => ({
            name: asset.fileName ?? nameOf(asset.uri),
            size: asset.fileSize ?? 0,
            type: asset.mimeType ?? '',
            uri: asset.uri,
          }),
        ),
        outcome: 'chosen',
      }

/**
 * Takes a photo, or chooses photos from the library, through
 * `expo-image-picker`.
 *
 * **A capture asks for the camera permission first**, and is `refused`
 * without it. A device without a camera, as the iOS simulator is, makes the
 * picker throw, and the capture is `unavailable`. **Choosing asks for no
 * permission**: the system's photo picker hands over only the photos the
 * reader chooses.
 *
 * **The package is an optional peer.** Where it is missing, or its native
 * module is, as in an app built without it, every request is `unavailable`.
 * An app that is built needs the camera and photo library usage strings the
 * package's config plugin writes.
 */
export const nativeCamera: Camera = {
  capture: async () => {
    const picker = load()
    if (picker === null) {
      return none('unavailable')
    }
    try {
      const permission = await picker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        return none('refused')
      }
      return pickedOf(await picker.launchCameraAsync({ mediaTypes: ['images'] }))
    } catch {
      return none('unavailable')
    }
  },
  choose: async (multiple) => {
    const picker = load()
    if (picker === null) {
      return none('unavailable')
    }
    try {
      return pickedOf(
        await picker.launchImageLibraryAsync({
          allowsMultipleSelection: multiple,
          mediaTypes: ['images'],
        }),
      )
    } catch {
      return none('unavailable')
    }
  },
}
