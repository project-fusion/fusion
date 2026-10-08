/**
 * Where the reader's motion choice is kept, and what it may say.
 */
export const MOTION_KEY = 'fusion-motion'

/**
 * What the key is allowed to hold. `on` lets the light behind a page move,
 * unless the device asks for reduced motion, and `off` holds it still.
 */
export type Motion = 'on' | 'off'
