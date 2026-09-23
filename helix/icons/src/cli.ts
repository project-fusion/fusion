#!/usr/bin/env node
/**
 * `helix-icons build`, which turns SVG files into the module the element draws.
 *
 * ```sh
 * helix-icons build --source ./brand-icons --out src/icons.ts
 * helix-icons build --source node_modules/@phosphor-icons/core/assets/regular \
 *   --list mine.txt --out src/icons.ts
 * ```
 *
 * **A flag per source, in the order they are searched**, so a set that keeps
 * its weights in separate folders is two flags rather than a convention this
 * has to know. `--suffix` applies to the source before it, because that is what
 * it is about: Phosphor's bold folder names a file `caret-down-bold.svg` and its
 * regular folder names the same glyph `caret-down.svg`.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { build, type IconSource } from './build.js'

const USAGE = `helix-icons build --source <dir> [--suffix <text>] [--list <file>] [--out <file>]

  --source <dir>    Where SVG files are. Repeat for a fallback, searched in order.
  --suffix <text>   What a file name carries after the icon's name, for the source
                    before it: --source …/bold --suffix -bold reads caret-down-bold.svg.
  --list <file>     Names to build, one per line, # for a comment. Default: every
                    glyph the sources hold.
  --out <file>      Where to write the module. Default: icons.generated.ts
  --index           Also write the record \`<helix-icon name>\` reads. It names every
                    glyph, so nothing can drop any of it: for markup, not for imports.
  --type-import <s> Where the module imports \`HelixIcon\` from.
                    Default: @fusion.dev/helix-icons`

/** The argument after a flag, or nothing where the flag is last. */
const after = (argv: string[], at: number): string | undefined => {
  const value = argv[at + 1]
  return value === undefined || value.startsWith('--') ? undefined : value
}

export function main(argv: string[]): number {
  if (argv[0] !== 'build' || argv.includes('--help')) {
    console.log(USAGE)
    return argv[0] === 'build' ? 0 : 1
  }

  const sources: IconSource[] = []
  let list: string | undefined
  let out = 'icons.generated.ts'
  let index = false
  let typeImport: string | undefined

  for (const [at, flag] of argv.entries()) {
    switch (flag) {
      case '--source': {
        const directory = after(argv, at)
        if (directory === undefined) {
          console.error('helix-icons: --source needs a directory')
          return 1
        }
        sources.push({ directory: resolve(directory) })
        break
      }
      case '--suffix': {
        const suffix = after(argv, at)
        const last = sources.at(-1)
        if (suffix === undefined || last === undefined) {
          console.error(
            'helix-icons: --suffix names what a file carries, after the --source it is for',
          )
          return 1
        }
        last.suffix = suffix
        break
      }
      case '--list':
        list = after(argv, at)
        break
      case '--out':
        out = after(argv, at) ?? out
        break
      case '--index':
        index = true
        break
      case '--type-import':
        typeImport = after(argv, at)
        break
      default:
        break
    }
  }

  if (sources.length === 0) {
    console.error('helix-icons: needs at least one --source\n')
    console.error(USAGE)
    return 1
  }

  let names: string[] | undefined
  if (list !== undefined) {
    if (!existsSync(list)) {
      console.error(`helix-icons: no list at ${list}`)
      return 1
    }
    names = readFileSync(list, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#'))
      .sort()
  }

  try {
    const many = build({
      index,
      out: resolve(out),
      sources,
      ...(names ? { names } : {}),
      ...(typeImport ? { typeImport } : {}),
    })
    console.log(`helix-icons: ${many} written to ${out}`)
    return 0
  } catch (why) {
    console.error(why instanceof Error ? why.message : String(why))
    return 1
  }
}

/* Run only when this file is the program, so a test can call `main` without the
   process exiting under it. */
if (process.argv[1]?.includes('helix-icons') || process.argv[1]?.endsWith('cli.js')) {
  process.exit(main(process.argv.slice(2)))
}
