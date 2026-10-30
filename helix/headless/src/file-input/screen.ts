/**
 * Which of the files arriving at a file field it takes, and why it refuses the
 * rest: the rules `accept`, `max-file-size`, `max-files` and `validate` set.
 * Zag's file upload screens a drop the same way and reports each refused file
 * with its reason. The rules are core's, which a phone's File Input screens
 * its picks by as well.
 */

export { accepts, type ScreenRules, screenFiles } from '@fusion.dev/helix-core/file-input'
/* A refused file is the events folder's `RefusedFile`, which `helix-reject` carries. */
export type { Refusal, RefusedFile } from './events/index.js'
