import { clipboard } from '../clipboard/index.js'
import { installWebClipboard } from '../clipboard/web.js'
import type { Shareable, Shared } from '../types.generated.js'
import type { Share } from './contract.generated.js'
import { setShare, share } from './index.js'
import { serverShare } from './server.js'

/** The browser's share, where it has one. */
type Sharing = Navigator & {
  readonly canShare?: (data: ShareData) => boolean
  readonly share?: (data: ShareData) => Promise<void>
}

/**
 * What the browser's share takes for `item`. **A file is read from its
 * address** into a `File` the sheet can hand on, and is left out where it
 * cannot be read.
 */
const dataOf = async (item: Shareable): Promise<ShareData> => {
  const data: ShareData = {}
  if (item.title !== undefined) {
    data.title = item.title
  }
  if (item.text !== undefined) {
    data.text = item.text
  }
  if (item.url !== undefined) {
    data.url = item.url
  }
  if (item.file !== undefined) {
    try {
      const blob = await (await fetch(item.file.uri)).blob()
      data.files = [new File([blob], item.file.name, { type: item.file.type || blob.type })]
    } catch {
      /* Shared without it. The words or the address still go. */
    }
  }
  return data
}

/** Whether a share was refused because the reader closed the sheet. */
const closed = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'

/**
 * Copies the address, or the words where there is none, as a page without a
 * share sheet offers a link to copy.
 */
const copied = async (item: Shareable): Promise<Shared> => {
  const words = item.url ?? item.text ?? ''
  if (words === '') {
    return 'unavailable'
  }
  installWebClipboard()
  return (await clipboard().write(words)) ? 'copied' : 'unavailable'
}

/**
 * Shares through the browser's share sheet, `navigator.share`, where the
 * browser has one and takes what is handed to it.
 *
 * **The clipboard where it does not.** A desktop browser without a share
 * sheet, a page on an insecure origin, and a sheet that refuses the item copy
 * the address, or the words where there is none, through the clipboard
 * capability, and give `copied`. A reader who closes the sheet gets
 * `dismissed`, and nothing is copied.
 *
 * **Call it from a press.** A browser opens the sheet, and writes to the
 * clipboard, only during a reader's own gesture.
 */
export const webShare: Share = {
  share: async (item) => {
    const sharing = navigator as Sharing
    if (typeof sharing.share === 'function') {
      const data = await dataOf(item)
      if (sharing.canShare?.(data) ?? true) {
        try {
          await sharing.share(data)
          return 'shared'
        } catch (error) {
          if (closed(error)) {
            return 'dismissed'
          }
        }
      }
    }
    return copied(item)
  },
}

/**
 * Sets the browser's share as the capability where nothing has set one yet,
 * and leaves a fake or an app's own in place. Off a page, the server's stays.
 */
export const installWebShare = (): void => {
  if (share() === serverShare && typeof document !== 'undefined') {
    setShare(webShare)
  }
}
