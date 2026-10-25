import type { HostInstance } from 'react-native'

/*
 * The page `sections.ts` lays out, in a module of its own that imports
 * nothing the runtime draws with, so the scroll capability's mock can read
 * it while the runtime loads.
 */

/** The stand-in for the scroll view a setup's sections are drawn in. */
export const PAGE = { page: true } as unknown as HostInstance

/** Whether a setup with sections is drawn now, so `PAGE` stands for its scroll view. */
export const laid = { on: false }
