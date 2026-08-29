/**
 * Where the reader's color choice is kept, and what it may say.
 *
 * **A plain module, and that is the whole point of it.** Never move this into a
 * `'use client'` file such as `preferences.tsx`. A server component that imports
 * a value from a client module does not get the value: the bundler replaces the
 * module with a client reference, so a named export that is not a component
 * arrives as `undefined` on the server. The root layout interpolates this key
 * into a pre-paint script, which then ships `localStorage.getItem(undefined)` to
 * every reader, silently, with the script otherwise intact and running.
 *
 * Nothing here is a component and nothing here is client-only, so both sides can
 * import it and both sides get a string.
 */
export const COLOR_MODE_KEY = 'fusion-color-mode'

/** What the key is allowed to hold. `system` means "follow the device". */
export type ColorMode = 'system' | 'light' | 'dark'
