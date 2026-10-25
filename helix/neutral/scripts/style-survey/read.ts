/**
 * Finds and reads the component stylesheets the survey reads.
 */

import { join } from 'node:path'
import { Glob } from 'bun'
import { compare } from './verdict.js'

/** A stylesheet's path under the surveyed directory, and its source. */
export interface Source {
  /**
   * The path, with `/` separators.
   */
  readonly path: string
  /**
   * The CSS.
   */
  readonly text: string
}

/**
 * True for a component stylesheet: CSS, outside an `.examples` folder, and
 * not written by `helix family stylesheets` from a style table.
 */
export const isComponentSheet = (path: string): boolean =>
  path.endsWith('.css') &&
  !path.endsWith('.generated.css') &&
  !path.split('/').includes('.examples')

/** Every component stylesheet under a directory, in code-unit order. */
export const listSheets = (directory: string): string[] =>
  [...new Glob('**/*.css').scanSync({ cwd: directory, dot: true })]
    .map((path) => path.split('\\').join('/'))
    .filter(isComponentSheet)
    .sort(compare)

/** Reads every component stylesheet under a directory. */
export const readSheets = async (directory: string): Promise<Source[]> =>
  Promise.all(
    listSheets(directory).map(async (path) => ({
      path,
      text: await Bun.file(join(directory, path)).text(),
    })),
  )
