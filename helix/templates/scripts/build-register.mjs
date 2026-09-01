/**
 * Writes `templates.json` from the register in `src/index.ts`.
 *
 * **Because the second door is Rust and cannot read TypeScript.** `helix new`
 * is a compiled binary and `npm create helix-app` is JavaScript, and the whole
 * argument for a templates *package* is that the list lives in one place. A
 * register only one of them can read is the drift this package exists to
 * prevent, arriving through the back door.
 *
 * **Generated rather than hand-kept, and checked rather than trusted.** A JSON
 * copy somebody edits beside the TypeScript is two sources of truth wearing one
 * name. `--check` is what `verify` runs: it regenerates into memory and compares,
 * so a register changed without the artifact following is a red build rather
 * than a scaffolder quietly offering yesterday's list.
 *
 * The TypeScript stays the source because it is what the JavaScript door
 * imports, and because it is the copy that carries the reasoning.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { PROJECT_NAME, templates } from '../src/index.ts'

const OUTPUT = join(import.meta.dirname, '..', 'templates.json')

/* Ordered as the register is, not sorted: the order is a decision that file
   explains, and a chooser reads this one. */
const written = `${JSON.stringify({ placeholder: PROJECT_NAME, templates }, undefined, 2)}\n`

if (process.argv.includes('--check')) {
  let found
  try {
    found = readFileSync(OUTPUT, 'utf8')
  } catch {
    console.error('templates: templates.json is missing. Run `bun run register`.')
    process.exit(1)
  }
  if (found !== written) {
    console.error('templates: templates.json is behind src/index.ts. Run `bun run register`.')
    process.exit(1)
  }
  console.log(`templates: ${templates.length} templates, register current`)
} else {
  writeFileSync(OUTPUT, written)
  console.log(`templates: ${templates.length} templates written to templates.json`)
}
