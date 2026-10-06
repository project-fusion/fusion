/**
 * How one file's upload is going, as a page reports it to File Input. The
 * field does not upload anything: the page does, and says how it is going.
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
 * The bar's value, held between 0 and 1, or nothing for a bar without a
 * measure, and no bar at all for a status that is neither measured nor under
 * way.
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
