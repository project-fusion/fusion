/*
 * What the file-input events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Why a file field did not take a file. */
export type Refusal = 'count' | 'invalid' | 'size' | 'type'

/** One file a file field did not take, and why. */
export interface RefusedFile {
  /** The file. */
  readonly file: File
  /** What the field's `validate` said about it, where it was the one refusing. */
  readonly message?: string
  /** Why it was not taken. */
  readonly reason: Refusal
}

/** The files a file field refused. */
export interface RejectDetail {
  /** Each refused file with its reason, in the order they arrived. */
  files: RefusedFile[]
}
