/**
 * Where the reader's color choice is kept, and what it may say.
 */
export const COLOR_MODE_KEY = 'fusion-color-mode'

/** What the key is allowed to hold. `system` means "follow the device". */
export type ColorMode = 'system' | 'light' | 'dark'
