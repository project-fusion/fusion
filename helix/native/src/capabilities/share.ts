import type { Share } from '@fusion.dev/helix-core/capabilities/share'
import type { DeviceFile, Shareable, Shared } from '@fusion.dev/helix-core/capabilities/types'
import { Platform, Share as SystemShare } from 'react-native'
import { localFile, sharing } from './files'

/** Shares a file through the share sheet `expo-sharing` opens. */
const shareFile = async (item: Shareable, file: DeviceFile): Promise<Shared> => {
  const sheet = sharing()
  if (sheet === null) {
    return 'unavailable'
  }
  try {
    if (!(await sheet.isAvailableAsync())) {
      return 'unavailable'
    }
    const local = await localFile(file.uri, file.name)
    await sheet.shareAsync(local, {
      ...(item.title === undefined ? {} : { dialogTitle: item.title }),
      ...(file.type === '' ? {} : { mimeType: file.type }),
    })
    return 'shared'
  } catch {
    return 'unavailable'
  }
}

/**
 * What React Native's `Share` takes for `item`, or nothing where there are no
 * words and no address. Android's sheet takes words alone, so the address
 * follows the words on a line of its own there.
 */
const contentOf = (item: Shareable): Parameters<typeof SystemShare.share>[0] | undefined => {
  const android = Platform.OS === 'android'
  const words = (android ? [item.text, item.url] : [item.text])
    .filter((each) => each !== undefined && each !== '')
    .join('\n')
  const url = android ? '' : (item.url ?? '')
  if (words === '' && url === '') {
    return undefined
  }
  return {
    ...(words === '' ? {} : { message: words }),
    ...(item.title === undefined ? {} : { title: item.title }),
    ...(url === '' ? {} : { url }),
  } as Parameters<typeof SystemShare.share>[0]
}

/**
 * Hands words, an address, or a file to the system share sheet.
 *
 * **Words and an address go through React Native's `Share`**, which says
 * whether the reader closed the sheet.
 *
 * **A file goes through `expo-sharing`, an optional peer**, and is
 * `unavailable` without it. A web address or a `data:` URL is written to the
 * app's cache first, through `expo-file-system`. The sheet `expo-sharing`
 * opens does not say whether the reader closed it, so a file shared is
 * `shared` once the sheet closes.
 */
export const nativeShare: Share = {
  share: async (item) => {
    if (item.file !== undefined) {
      return shareFile(item, item.file)
    }
    const content = contentOf(item)
    if (content === undefined) {
      return 'unavailable'
    }
    try {
      const result = await SystemShare.share(
        content,
        item.title === undefined ? {} : { dialogTitle: item.title, subject: item.title },
      )
      return result.action === SystemShare.dismissedAction ? 'dismissed' : 'shared'
    } catch {
      return 'unavailable'
    }
  },
}
