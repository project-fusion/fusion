/**
 * A file field's rules, shared by the web's File Input and a phone's: which
 * arriving files it takes, and how a chosen file is written in its row.
 *
 * **A file is anything with a name, a size, and a type.** The web screens a
 * `File`, and a phone screens the record the files capability gives, whose
 * file is read from its URI. The rules read the three fields both have, so
 * each platform keeps its own kind of file.
 */

import { commaList } from '../written-list/written-list.js'

/** What the rules read of a file: its name, its size in bytes, and its media type. */
export interface FileFacts {
  readonly name: string
  readonly size: number
  readonly type: string
}

/** Why a file field did not take a file. */
export type FileRefusal = 'count' | 'invalid' | 'size' | 'type'

/** One file a file field did not take, and why. */
export interface RefusedOne<File extends FileFacts> {
  /** The file. */
  readonly file: File
  /** What the field's `validate` said about it, where it was the one refusing. */
  readonly message?: string
  /** Why it was not taken. */
  readonly reason: FileRefusal
}

/** The rules a field screens arriving files by. */
export interface ScreenRules<File extends FileFacts> {
  /** A native `accept` list. Empty takes every type. */
  readonly accept: string
  /** The most bytes one file may have. */
  readonly maxFileSize?: number | undefined
  /** The most files the field holds, counting the ones it has. */
  readonly maxFiles?: number | undefined
  /** Whether the field holds more than one file. */
  readonly multiple: boolean
  /** Your own check, which returns why a file is refused, or nothing. */
  readonly validate?: ((file: File) => string | null | undefined) | undefined
}

/**
 * Whether a file is one `accept` lists: an extension, a type, or a family
 * such as `image/*`, as the platform reads it.
 */
export const accepts = (file: FileFacts, accept: string): boolean => {
  const tokens = commaList(accept).map((token) => token.toLowerCase())
  if (tokens.length === 0) {
    return true
  }
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return tokens.some((token) =>
    token.startsWith('.')
      ? name.endsWith(token)
      : token.endsWith('/*')
        ? type.startsWith(token.slice(0, -1))
        : type === token,
  )
}

/** The tokens of an `accept` list, as a picker takes them: `['image/*', '.pdf']`. */
export const acceptList = (accept: string): string[] => commaList(accept)

/** Why a file is refused on its own, before counting, or nothing. */
const refusal = <File extends FileFacts>(
  file: File,
  rules: ScreenRules<File>,
): RefusedOne<File> | undefined => {
  if (!accepts(file, rules.accept)) {
    return { file, reason: 'type' }
  }
  if (rules.maxFileSize !== undefined && file.size > rules.maxFileSize) {
    return { file, reason: 'size' }
  }
  const message = rules.validate?.(file)
  return message ? { file, message, reason: 'invalid' } : undefined
}

/**
 * Screens arriving files against the rules, given the files the field keeps.
 * `kept` is what the field holds afterward: the files it keeps and the
 * arrivals it took, or for a single-file field the last arrival it took, and
 * the file it keeps when it took none.
 */
export const screenFiles = <File extends FileFacts>(
  arriving: readonly File[],
  keeping: readonly File[],
  rules: ScreenRules<File>,
): { kept: File[]; refused: RefusedOne<File>[] } => {
  const refused: RefusedOne<File>[] = []
  const taken: File[] = []
  for (const file of arriving) {
    const refusedFor = refusal(file, rules)
    if (refusedFor) {
      refused.push(refusedFor)
    } else {
      taken.push(file)
    }
  }
  if (!rules.multiple) {
    const last = taken.at(-1)
    for (const file of taken.slice(0, -1)) {
      refused.push({ file, reason: 'count' })
    }
    return { kept: last ? [last] : keeping.slice(0, 1), refused }
  }
  const room =
    rules.maxFiles === undefined ? taken.length : Math.max(0, rules.maxFiles - keeping.length)
  for (const file of taken.slice(room)) {
    refused.push({ file, reason: 'count' })
  }
  return { kept: [...keeping, ...taken.slice(0, room)], refused }
}

/**
 * A file's size, at the largest unit that leaves a number worth reading.
 *
 * Binary steps, because that is what a file system reports and what the number
 * beside it in a finder will say. One decimal place from kilobytes up and none
 * for bytes: `1.2 MB` is the reading, and `1.23 MB` is noise.
 *
 * `Intl.NumberFormat` writes the number, so a decimal comma lands where a
 * decimal comma belongs. The unit is not localized with it: `MB` is written
 * the same way in the places this ships, and `Intl`'s own byte units carry no
 * scale to pick from. A size under a kilobyte is a count of bytes, which
 * `inBytes` writes in words.
 */
export const fileSize = (
  bytes: number,
  locale: string,
  inBytes: (count: number) => string,
): string => {
  const units = ['', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let step = 0
  while (value >= 1024 && step < units.length - 1) {
    value /= 1024
    step += 1
  }
  if (step === 0) {
    return inBytes(value)
  }
  const written = new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: 1 }).format(
    value,
  )
  return `${written} ${units[step]}`
}

/**
 * What kind of file it is, in the shortest honest form.
 *
 * The extension first, because it is the word a reader has for the file: a
 * Word document's subtype is a 59-character vendor string and a text file's
 * is `plain`. The subtype of the media type only where the name has no
 * extension, and only a short one, so `image/png` reads `PNG`. `File` where
 * neither says.
 */
export const fileKind = (file: Pick<FileFacts, 'name' | 'type'>): string => {
  const extension = /\.([a-z0-9]{1,6})$/i.exec(file.name)?.[1]
  if (extension) {
    return extension.toUpperCase()
  }
  const subtype = file.type.split('/')[1]?.replace(/^x-/, '').split('+')[0] ?? ''
  return /^[a-z0-9]{1,6}$/i.test(subtype) ? subtype.toUpperCase() : 'File'
}

/**
 * How one file's upload is going, as a page reports it to File Input. The
 * field uploads nothing: the page does, and says how it is going.
 */
export interface FileStatus {
  /** How much is done, from 0 to 1. Left out, the bar moves without a measure while `state` is `uploading`. */
  readonly progress?: number | undefined
  /** Where the upload is: under way, finished, or failed. */
  readonly state?: 'done' | 'error' | 'uploading' | undefined
  /** Words beside the bar, such as "Uploaded" or the reason it failed. */
  readonly text?: string | undefined
}

/**
 * The bar's value, held between 0 and 1, `unmeasured` for a bar without a
 * measure, and no bar for a status that is neither measured nor under way.
 */
export const barOf = (status: FileStatus): number | 'unmeasured' | undefined => {
  const { progress, state } = status
  if (typeof progress === 'number' && Number.isFinite(progress)) {
    return Math.min(1, Math.max(0, progress))
  }
  return state === 'uploading' ? 'unmeasured' : undefined
}

/**
 * Whether a new status is worth saying: a finish or a failure with words, the
 * first time the file reaches it. Progress is shown and not said, since a
 * reader hearing every percent hears nothing else.
 */
export const saysStatus = (next: FileStatus, was: FileStatus | undefined): boolean =>
  Boolean(next.text) &&
  (next.state === 'done' || next.state === 'error') &&
  next.state !== was?.state
