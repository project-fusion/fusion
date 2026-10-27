import type { Files } from '@fusion.dev/helix-core/capabilities/files'
import type { DeviceFile, Picked } from '@fusion.dev/helix-core/capabilities/types'
import type * as ExpoDocumentPicker from 'expo-document-picker'
import type * as ExpoFileSystem from 'expo-file-system'
import type * as ExpoSharing from 'expo-sharing'

/**
 * Loads one optional package once, `null` where the app does not install it.
 *
 * **Each `require` names its package written out, inside a `try`**, which
 * Metro bundles as an optional dependency (`allowOptionalDependencies` is on
 * by default), so an app without the package builds.
 */
const once = <T>(load: () => T): (() => T | null) => {
  let loaded: T | null | undefined
  return () => {
    if (loaded === undefined) {
      try {
        loaded = load()
      } catch {
        loaded = null
      }
    }
    return loaded
  }
}

export const documentPicker = once(
  () => require('expo-document-picker') as typeof ExpoDocumentPicker,
)
export const fileSystem = once(() => require('expo-file-system') as typeof ExpoFileSystem)
export const sharing = once(() => require('expo-sharing') as typeof ExpoSharing)

/** A request that gives nothing, and why. */
export const none = (outcome: Exclude<Picked['outcome'], 'chosen'>): Picked => ({
  files: [],
  outcome,
})

/** The last part of an address, as a file's name where the platform gives none. */
export const nameOf = (uri: string): string => {
  const last = uri.split(/[/?#]/).filter((part) => part !== '')
  return decodeURIComponent(last[last.length - 1] ?? 'file')
}

/**
 * What a document picker's `type` takes for `accept`: the media types asked
 * for, or any file where an extension is asked for, since the picker reads
 * media types alone. The files chosen are then kept to the extensions.
 */
const typesOf = (accept: readonly string[]): string | string[] => {
  const media = accept.filter((each) => !each.startsWith('.'))
  return media.length === 0 || media.length < accept.length ? '*/*' : media
}

/** Whether `file` is one of the types `accept` names, where it names extensions. */
const accepted = (accept: readonly string[], file: DeviceFile): boolean => {
  const extensions = accept.filter((each) => each.startsWith('.'))
  if (extensions.length === 0 || extensions.length < accept.length) {
    return true
  }
  const name = file.name.toLowerCase()
  return extensions.some((extension) => name.endsWith(extension.toLowerCase()))
}

/**
 * A file on the device with the content `uri` addresses, written to the
 * cache under `name` where it is not one already: a `data:` URL is decoded,
 * and a web address is downloaded.
 */
export const localFile = async (uri: string, name: string): Promise<string> => {
  if (uri.startsWith('file:')) {
    return uri
  }
  const system = fileSystem()
  if (system === null) {
    throw new Error('expo-file-system is not installed.')
  }
  const target = new system.File(system.Paths.cache, name)
  if (target.exists) {
    target.delete()
  }
  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',')
    const head = uri.slice(5, comma)
    const body = uri.slice(comma + 1)
    if (head.endsWith(';base64')) {
      target.write(body, { encoding: 'base64' })
    } else {
      target.write(decodeURIComponent(body))
    }
    return target.uri
  }
  return (await system.File.downloadFileAsync(uri, target)).uri
}

/**
 * Picks files through `expo-document-picker`, and saves a file through
 * `expo-file-system` and the share sheet `expo-sharing` opens, where Save to
 * Files is one of the choices.
 *
 * **Each package is an optional peer.** Without the picker, a pick is
 * `unavailable`, and without the file system or sharing, a save gives
 * `false`. A file chosen is a copy in the app's cache, read from its file URI.
 */
export const nativeFiles: Files = {
  pick: async ({ accept, multiple }) => {
    const picker = documentPicker()
    if (picker === null) {
      return none('unavailable')
    }
    try {
      const result = await picker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple,
        type: typesOf(accept),
      })
      if (result.canceled) {
        return none('dismissed')
      }
      const chosen = result.assets
        .map(
          (asset): DeviceFile => ({
            name: asset.name,
            size: asset.size ?? 0,
            type: asset.mimeType ?? '',
            uri: asset.uri,
          }),
        )
        .filter((file) => accepted(accept, file))
      return chosen.length === 0 ? none('dismissed') : { files: chosen, outcome: 'chosen' }
    } catch {
      return none('unavailable')
    }
  },
  save: async (file) => {
    const sheet = sharing()
    if (sheet === null) {
      return false
    }
    try {
      if (!(await sheet.isAvailableAsync())) {
        return false
      }
      const local = await localFile(file.uri, file.name)
      await sheet.shareAsync(local, {
        dialogTitle: file.name,
        ...(file.type === '' ? {} : { mimeType: file.type }),
      })
      return true
    } catch {
      return false
    }
  },
}
