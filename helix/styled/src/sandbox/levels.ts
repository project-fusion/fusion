import type { ConsoleDetail } from '@fusion.dev/helix-core'

/** A console level, from the quietest to the loudest. */
export type ConsoleLevel = ConsoleDetail['level']

/** The four levels in order, the quietest first. */
export const LEVELS: readonly ConsoleLevel[] = ['log', 'info', 'warn', 'error']

/**
 * Whether a line at `level` shows under a terminal's `level`, which is the
 * quietest it shows. No floor, or one that names no level, shows every line.
 */
export const shows = (level: ConsoleLevel, floor: string | undefined): boolean => {
  const from = LEVELS.indexOf(floor as ConsoleLevel)
  return from < 0 || LEVELS.indexOf(level) >= from
}
