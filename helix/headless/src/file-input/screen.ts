import { commaList } from '@fusion.dev/helix-core'

/**
 * Which of the files arriving at a file field it takes, and why it refuses the
 * rest: the rules `accept`, `max-file-size`, `max-files` and `validate` set.
 * Zag's file upload screens a drop the same way and reports each refused file
 * with its reason.
 */

/** Why a file was not taken. */
export type Refusal = 'count' | 'invalid' | 'size' | 'type'

/** One file that was not taken, and why. */
export interface RefusedFile {
  /** The file. */
  readonly file: File
  /** What your `validate` said about it, where it was the one refusing. */
  readonly message?: string
  /** Why it was not taken. */
  readonly reason: Refusal
}

/** The rules a field screens arriving files by. */
export interface ScreenRules {
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
export const accepts = (file: File, accept: string): boolean => {
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

/** Why a file is refused on its own, before counting, or nothing. */
const refusal = (file: File, rules: ScreenRules): RefusedFile | undefined => {
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
 * arrivals it took, or for a single-file field the last arrival it took.
 */
export const screenFiles = (
  arriving: File[],
  keeping: File[],
  rules: ScreenRules,
): { kept: File[]; refused: RefusedFile[] } => {
  const refused: RefusedFile[] = []
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
