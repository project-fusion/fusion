import type { DeviceFile, FilePick, Picked } from '../types.generated.js'
import type { Files } from './contract.generated.js'
import { files, setFiles } from './index.js'
import { serverFiles } from './server.js'

/** A file the browser handed over, as the capability gives it: its address an object URL. */
export const deviceFileOf = (file: File): DeviceFile => ({
  name: file.name,
  size: file.size,
  type: file.type,
  uri: URL.createObjectURL(file),
})

/** What a chooser gives once the reader is done with it. */
const pickedOf = (chosen: readonly File[]): Picked =>
  chosen.length === 0
    ? { files: [], outcome: 'dismissed' }
    : { files: chosen.map(deviceFileOf), outcome: 'chosen' }

/** What a file input asks the browser for. */
export interface Asking {
  readonly accept: readonly string[]
  /** The camera to open, where the input asks for a photo taken now. */
  readonly capture?: 'environment' | 'user'
  readonly multiple: boolean
}

/**
 * Opens the browser's file chooser through a file input made for the moment,
 * and gives the files chosen.
 *
 * **The input leaves the page once the reader is done**: on `change` with
 * the files, and on `cancel`, which a browser sends when the chooser closes
 * with nothing chosen. A browser that sends no `cancel` leaves the promise
 * waiting until the reader chooses.
 *
 * **`capture` asks a phone's browser for its camera**, and a browser
 * without one opens its file chooser.
 */
export const pickWithInput = ({ accept, capture, multiple }: Asking): Promise<Picked> =>
  new Promise((done) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = multiple
    if (accept.length > 0) {
      input.accept = accept.join(',')
    }
    if (capture !== undefined) {
      input.setAttribute('capture', capture)
    }
    input.setAttribute('aria-hidden', 'true')
    input.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
    const finish = (picked: Picked): void => {
      input.remove()
      done(picked)
    }
    input.addEventListener('change', () => finish(pickedOf(Array.from(input.files ?? []))), {
      once: true,
    })
    input.addEventListener('cancel', () => finish(pickedOf([])), { once: true })
    document.body.append(input)
    input.click()
  })

/** The browser's file system picker, where it has one. */
type Picking = typeof globalThis & {
  readonly showOpenFilePicker?: (options: {
    readonly multiple: boolean
    readonly types?: readonly {
      readonly accept: Readonly<Record<string, readonly string[]>>
      readonly description?: string
    }[]
  }) => Promise<readonly { readonly getFile: () => Promise<File> }[]>
}

/**
 * What the file system picker accepts for `accept`: each media type with no
 * extensions of its own, and the extensions under the type of any file.
 */
const typesOf = (accept: readonly string[]) => {
  const types: Record<string, string[]> = {}
  for (const each of accept) {
    if (each.startsWith('.')) {
      types['application/octet-stream'] = [...(types['application/octet-stream'] ?? []), each]
    } else {
      types[each] = types[each] ?? []
    }
  }
  return Object.keys(types).length === 0 ? undefined : [{ accept: types }]
}

/** Whether a picker was closed by the reader. */
const closed = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'

/**
 * Opens the file system picker, `showOpenFilePicker`, where the browser has
 * one, and the file input where it does not or where the picker refuses the
 * types asked for.
 */
const pick = async (options: FilePick): Promise<Picked> => {
  const picker = (globalThis as Picking).showOpenFilePicker
  if (typeof picker !== 'function') {
    return pickWithInput(options)
  }
  const types = typesOf(options.accept)
  try {
    const handles = await picker({ multiple: options.multiple, ...(types ? { types } : {}) })
    return pickedOf(await Promise.all(handles.map((handle) => handle.getFile())))
  } catch (error) {
    return closed(error) ? pickedOf([]) : pickWithInput(options)
  }
}

/**
 * Picks files through the browser's file chooser, and saves a file as a
 * download.
 *
 * **A file chosen is read from an object URL**, which stays readable until
 * the page calls `URL.revokeObjectURL` with it or closes.
 *
 * **A save is a download** through a link made for the moment, named by the
 * file's name. A `data:` URL, an object URL, and an address on the page's own
 * origin download under that name. A browser follows an address on another
 * origin as a link.
 *
 * **Call it from a press.** A browser opens its chooser only during a
 * reader's own gesture.
 */
export const webFiles: Files = {
  pick,
  save: (file) => {
    const link = document.createElement('a')
    link.href = file.uri
    link.download = file.name
    link.style.display = 'none'
    document.body.append(link)
    link.click()
    link.remove()
    return Promise.resolve(true)
  },
}

/**
 * Sets the browser's files as the capability where nothing has set one yet,
 * and leaves a fake or an app's own in place. Off a page, the server's stays.
 */
export const installWebFiles = (): void => {
  if (files() === serverFiles && typeof document !== 'undefined') {
    setFiles(webFiles)
  }
}
